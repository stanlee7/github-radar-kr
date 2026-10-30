import { parseTrending } from './_parse.js';

const SINCE = ['daily', 'weekly', 'monthly'];

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const since = SINCE.includes(url.searchParams.get('since')) ? url.searchParams.get('since') : 'daily';
  const lang = (url.searchParams.get('lang') || '').replace(/[^a-z0-9+#.-]/gi, '').toLowerCase();
  try {
    const r = await fetch(`https://github.com/trending/${encodeURIComponent(lang)}?since=${since}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (github-radar)', 'Accept-Language': 'en' },
    });
    if (!r.ok) throw new Error(`github ${r.status}`);
    const repos = parseTrending(await r.text());
    // 15분 동안 CDN이 같은 결과를 주고, 그 뒤 1시간은 옛 결과를 주면서 뒤에서 새로 받는다
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json({ since, lang: lang || null, fetchedAt: new Date().toISOString(), repos });
  } catch (e) {
    res.status(502).json({ error: '깃허브 트렌딩을 불러오지 못했습니다', detail: String(e.message || e) });
  }
}
