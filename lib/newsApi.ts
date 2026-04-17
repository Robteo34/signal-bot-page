const NEWS_KEY  = process.env.NEWSAPI_KEY;
const NEWS_BASE = 'https://newsapi.org/v2';

interface NewsItem {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  ageMinutes: number;
}

// Curated query sets per session focus
const NEWS_QUERIES: Record<string, string[]> = {
  ASIA_OVERNIGHT:  ['"BOJ" OR "Bank of Japan"', '"Hang Seng" OR "Nikkei"', 'crypto OR bitcoin'],
  PRE_LONDON:      ['"Bank of England" OR "BOE"', 'FTSE OR sterling', '"oil price" OR Brent'],
  LONDON:          ['"Bank of England" OR ECB', 'FTSE OR DAX', 'sterling OR euro forex', 'oil OR gold'],
  PRE_NY:          ['"Federal Reserve" OR FOMC', '"S&P 500" OR Nasdaq', 'CPI OR inflation OR NFP', 'Treasury OR yields'],
  OVERLAP:         ['"Federal Reserve"', 'S&P 500 OR Nasdaq', 'oil OR gold', 'crypto OR bitcoin', '"Bank of England"'],
  US_AFTERNOON:    ['"Federal Reserve"', 'S&P 500 OR Nasdaq', 'tech earnings', 'crypto OR bitcoin'],
  EVENING_JOURNAL: ['Federal Reserve', 'crypto OR bitcoin', '"economic calendar"'],
  NIGHT_MODE:      ['crypto OR bitcoin'],
  WEEKEND:         ['crypto OR bitcoin', 'geopolitical OR Russia OR Iran', 'central bank'],
};

// Post-filter by source name — preferred but not exclusive (free tier doesn't support sources= param)
const TRUSTED_SOURCE_NAMES = [
  'Reuters', 'Bloomberg', 'Financial Times', 'The Wall Street Journal',
  'CNBC', 'BBC News', 'The Economist', 'Business Insider', 'Fortune',
  'Forbes', 'MarketWatch', 'Investing.com',
];

async function fetchNewsForQuery(query: string): Promise<NewsItem[]> {
  if (!NEWS_KEY) return [];

  // Only news from last 4 hours — anything older is stale for trading
  const fromTime = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // No sources= param — free tier blocks it. Post-filter instead.
    const url = `${NEWS_BASE}/everything?q=${encodeURIComponent(query)}&from=${fromTime}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${NEWS_KEY}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`NewsAPI HTTP ${res.status} for "${query}"`);
      return [];
    }
    const data = await res.json();
    console.log(`NewsAPI articles returned for "${query}": ${data.articles?.length || 0}`);
    if (!data.articles) return [];

    const now = Date.now();
    return data.articles
      .slice(0, 10)
      .map((a: any): NewsItem => ({
        title:       a.title,
        description: a.description || '',
        source:      a.source?.name || 'Unknown',
        url:         a.url,
        publishedAt: a.publishedAt,
        ageMinutes:  Math.round((now - new Date(a.publishedAt).getTime()) / 60000),
      }))
      .filter((a: NewsItem) => {
        const isTrusted = TRUSTED_SOURCE_NAMES.some((t) =>
          a.source.toLowerCase().includes(t.toLowerCase())
        );
        return isTrusted || a.ageMinutes < 60; // trusted source OR very fresh (<1h)
      })
      .slice(0, 3);
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn(`NewsAPI error for "${query}":`, e?.message ?? e);
    return [];
  }
}

export async function fetchSessionNews(sessionName: string): Promise<string> {
  console.log(`NewsAPI key set: ${!!NEWS_KEY}`);
  if (!NEWS_KEY) return '';

  const queries = NEWS_QUERIES[sessionName] ?? NEWS_QUERIES['OVERLAP'];

  // Parallel fetch all queries with overall 8s cap
  const fetchPromise   = Promise.all(queries.map((q) => fetchNewsForQuery(q)));
  const timeoutPromise = new Promise<NewsItem[][]>((resolve) =>
    setTimeout(() => resolve([]), 8000)
  );

  const allResults = await Promise.race([fetchPromise, timeoutPromise]);
  const flatNews   = allResults.flat();

  // Dedupe by URL
  const seen   = new Set<string>();
  const unique = flatNews.filter((n) => {
    if (seen.has(n.url)) return false;
    seen.add(n.url);
    return true;
  });

  // Sort by recency (newest first), keep top 12
  const sorted = unique.sort((a, b) => a.ageMinutes - b.ageMinutes).slice(0, 12);

  if (sorted.length === 0) return '';

  const lines = sorted.map((n) =>
    `[${n.ageMinutes}min ago | ${n.source}] ${n.title}${n.description ? ' — ' + n.description.slice(0, 120) : ''}`
  );

  return [
    '═══ VERIFIED RECENT NEWS (NewsAPI, last 4h) ═══',
    `Fetched at: ${new Date().toISOString()}`,
    'THESE ARE REAL NEWS WITH VERIFIED TIMESTAMPS.',
    'Use ONLY these news items for analysis. DO NOT invent news or claim Twitter posts that are not provided.',
    '',
    ...lines,
    '═══ END NEWS ═══',
  ].join('\n');
}
