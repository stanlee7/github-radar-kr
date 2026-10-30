// 깃허브 레이더 한국어 요약 만들기 (이 PC, 무료 로컬 모델)
// 사용: node 업무도구/github-radar/scripts/summarize.mjs [--deploy] [--max 300]
// 1) 배포된 사이트의 API에서 지금 보이는 레포를 모두 모은다(트렌딩 3개, 새로 뜬 레포, 카테고리 13개 x 2)
// 2) summaries.json에 없는 레포만 README 앞부분을 읽어 Ollama로 「한 줄 요약」과 「직장인 업무 활용 한 줄」을 만든다
// 3) 30일 동안 다시 안 보인 레포는 지운다. --deploy면 Vercel에 다시 올린다
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'summaries.json');
const SITE = 'https://github-radar-kr.vercel.app';
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const MODEL = process.env.RADAR_MODEL || 'gemma4:12b';
const args = process.argv.slice(2);
const MAX = Number(args[args.indexOf('--max') + 1]) || 300;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'github-radar-summarize' } }).catch(() => null);
    if (r?.ok) return r.json();
    await sleep(3000 * (i + 1));
  }
  return null;
}

async function collect() {
  const urls = ['daily', 'weekly', 'monthly'].map(s => `${SITE}/api/trending?since=${s}`);
  urls.push(`${SITE}/api/rising?days=7`);
  const cats = (await getJson(`${SITE}/api/category?list=1`))?.categories || [];
  for (const c of cats) for (const m of ['new', 'hot']) urls.push(`${SITE}/api/category?c=${c.id}&mode=${m}`);
  const repos = new Map();
  for (const u of urls) {
    const d = await getJson(u);
    for (const r of d?.repos || []) repos.set(`${r.owner}/${r.name}`.toLowerCase(), r);
    await sleep(400);
  }
  return repos;
}

async function readme(owner, name) {
  for (const f of ['README.md', 'readme.md', 'README.MD', 'README']) {
    const r = await fetch(`https://raw.githubusercontent.com/${owner}/${name}/HEAD/${f}`).catch(() => null);
    if (r?.ok) {
      return (await r.text())
        .replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').slice(0, 1800);
    }
  }
  return '';
}

const PROMPT = (r, text) => `너는 한국 직장인에게 깃허브 레포를 소개하는 편집자다. 아래 자료에 적힌 내용만 근거로 쓴다. 자료에 없는 기능, 숫자, 회사 이름은 지어내지 않는다.

레포: ${r.owner}/${r.name}
설명: ${r.description || '(없음)'}
토픽: ${(r.topics || []).join(', ') || '(없음)'}
README 앞부분: ${text || '(없음)'}

JSON 한 개만 출력한다.
{"ko": "무엇을 하는지 한국어로, 45자 이내, '~하는 도구' 또는 '~하는 프로그램'으로 끝냄","use": "회사원이 이 도구로 할 수 있는 일을 구체적으로, 45자 이내(예: '회의 녹음을 받아 적고 할 일만 뽑아 정리'), 개발자 전용이거나 업무와 관계없으면 빈 문자열", "dev": true 또는 false (개발자가 아니면 쓰기 어려우면 true)}
규칙: 가운데점(·) 금지. 과장 금지(최고, 혁신, 완벽 같은 말 금지). 영어 고유명사는 그대로 둔다.`;

async function summarize(r) {
  const text = await readme(r.owner, r.name);
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: PROMPT(r, text), format: 'json', stream: false, think: false, keep_alive: '10m', options: { temperature: 0.2, num_ctx: 4096, num_predict: 160 } }),
  });
  if (!res.ok) throw new Error('ollama ' + res.status);
  const j = JSON.parse((await res.json()).response);
  const clean = s => String(s || '').replace(/·/g, ', ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const ko = clean(j.ko);
  if (!/[가-힣]/.test(ko)) throw new Error('한국어 요약 아님');
  return { ko, use: clean(j.use), dev: !!j.dev };
}

const db = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { updatedAt: null, repos: {} };
const repos = await collect();
console.log(`모은 레포 ${repos.size}개, 요약 보유 ${Object.keys(db.repos).length}개`);
let made = 0, failed = 0;
for (const [key, r] of repos) {
  if (db.repos[key]) { db.repos[key].seen = today; continue; }
  if (made >= MAX) continue;
  try {
    db.repos[key] = { ...(await summarize(r)), made: today, seen: today };
    made++;
    if (made % 20 === 0) { fs.writeFileSync(OUT, JSON.stringify(db)); console.log(`  ${made}개 만듦`); }
  } catch (e) { failed++; console.log(`  실패 ${key}: ${e.message}`); }
  if ((made + failed) % 5 === 0) console.log(`  진행 ${made + failed}/${Math.min(MAX, repos.size)}  (${new Date().toLocaleTimeString('ko-KR')})`);
}
const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
for (const [k, v] of Object.entries(db.repos)) if (v.seen < cutoff) delete db.repos[k];
db.updatedAt = new Date().toISOString();
fs.writeFileSync(OUT, JSON.stringify(db));
console.log(`새로 만듦 ${made}, 실패 ${failed}, 보유 ${Object.keys(db.repos).length} → ${OUT}`);

if (args.includes('--deploy')) {
  execSync('vercel deploy --prod --yes', { cwd: ROOT, stdio: 'inherit' });
}
