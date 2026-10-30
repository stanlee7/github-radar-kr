import { CATEGORIES } from './_categories.js';

const LIMIT = 15;
const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
// new: 최근 30일 안에 생긴 레포 / hot: 최근 7일 안에 커밋이 있는 레포 중 별 많은 순
const QUERY = {
  new: t => `topic:${t} created:>${day(30)} stars:>20`,
  hot: t => `topic:${t} pushed:>${day(7)} stars:>500`,
};

async function search(q, headers) {
  const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${LIMIT}`, { headers });
  if (!r.ok) throw new Error(`github ${r.status}`);
  return (await r.json()).items || [];
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.searchParams.get('list') === '1') {
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.status(200).json({ categories: CATEGORIES.map(({ id, name }) => ({ id, name })) });
  }
  const cat = CATEGORIES.find(c => c.id === url.searchParams.get('c')) || CATEGORIES[0];
  const mode = url.searchParams.get('mode') === 'hot' ? 'hot' : 'new';
  const headers = { 'User-Agent': 'github-radar', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const lists = await Promise.all(cat.topics.map(t => search(QUERY[mode](t), headers)));
    const seen = new Map();
    for (const x of lists.flat()) if (!seen.has(x.id)) seen.set(x.id, x);
    const repos = [...seen.values()]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, LIMIT)
      .map((x, i) => ({
        rank: i + 1, owner: x.owner.login, name: x.name, url: x.html_url,
        description: x.description || '', language: x.language, color: null,
        stars: x.stargazers_count, forks: x.forks_count, gained: null,
        createdAt: x.created_at, pushedAt: x.pushed_at, topics: x.topics || [],
      }));
    // 카테고리는 한 시간에 한 번 새로 받는다(토큰 없이 분당 10회 제한)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ category: { id: cat.id, name: cat.name, topics: cat.topics }, mode, fetchedAt: new Date().toISOString(), repos });
  } catch (e) {
    res.status(502).json({ error: '카테고리 목록을 불러오지 못했습니다', detail: String(e.message || e) });
  }
}
