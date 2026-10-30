// 깃허브 트렌딩 HTML → 레포 목록. 공식 API가 없어 페이지를 읽는다.
const num = s => Number(String(s || '').replace(/[^0-9]/g, '')) || 0;
const clean = s => String(s || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();

export function parseTrending(html) {
  const rows = html.split('<article class="Box-row">').slice(1);
  return rows.map((row, i) => {
    const h2 = (row.match(/<h2[\s\S]*?<\/h2>/) || [''])[0];
    const href = (h2.match(/href="\/([^"?]+)"/) || [])[1] || '';
    const desc = (row.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/) || [])[1];
    const lang = (row.match(/itemprop="programmingLanguage">([^<]+)</) || [])[1];
    const color = (row.match(/repo-language-color" style="background-color: ([^"]+)"/) || [])[1];
    const stars = (row.match(/\/stargazers"[\s\S]*?<\/svg>\s*([\d,]+)\s*<\/a>/) || [])[1];
    const forks = (row.match(/\/forks"[\s\S]*?<\/svg>\s*([\d,]+)\s*<\/a>/) || [])[1];
    const gained = (row.match(/([\d,]+)\s+stars? (today|this week|this month)/) || [])[1];
    const [owner, name] = href.split('/');
    return {
      rank: i + 1, owner, name, url: `https://github.com/${href}`,
      description: clean(desc), language: lang ? lang.trim() : null, color: color || null,
      stars: num(stars), forks: num(forks), gained: num(gained),
    };
  }).filter(r => r.owner && r.name);
}
