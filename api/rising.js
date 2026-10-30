// 최근 N일 안에 만들어진 레포 중 별이 많은 순. 깃허브 검색 API(토큰 없이 분당 10회라 CDN 캐시 필수)
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days')) || 7));
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const q = encodeURIComponent(`created:>${since} stars:>20`);
  try {
    const headers = { 'User-Agent': 'github-radar', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const r = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=50`, { headers });
    if (!r.ok) throw new Error(`github ${r.status}`);
    const data = await r.json();
    const repos = (data.items || []).map((x, i) => ({
      rank: i + 1, owner: x.owner.login, name: x.name, url: x.html_url,
      description: x.description || '', language: x.language, color: null,
      stars: x.stargazers_count, forks: x.forks_count, gained: null,
      createdAt: x.created_at, topics: x.topics || [],
    }));
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=7200');
    res.status(200).json({ days, fetchedAt: new Date().toISOString(), repos });
  } catch (e) {
    res.status(502).json({ error: '새 레포 목록을 불러오지 못했습니다', detail: String(e.message || e) });
  }
}
