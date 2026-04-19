import { cacheGetOrFetch } from './cache';

const MARKETAUX_KEY  = process.env.MARKETAUX_KEY;
const MARKETAUX_BASE = 'https://api.marketaux.com/v1';

interface MarketauxEntity {
  symbol: string;
  name: string;
  exchange: string | null;
  exchange_long: string | null;
  country: string | null;
  type: string;
  industry: string | null;
  match_score: number;
  sentiment_score: number;
}

interface MarketauxArticle {
  uuid: string;
  title: string;
  description: string;
  snippet: string;
  url: string;
  source: string;
  published_at: string;
  entities: MarketauxEntity[];
  ageMinutes: number;
}

const SESSION_ENTITIES: Record<string, string> = {
  ASIA_OVERNIGHT:  'BTCUSD,ETHUSD',
  PRE_LONDON:      'BTCUSD,ETHUSD',
  LONDON:          'SHEL.L,BP.L,HSBA.L,BARC.L,AZN.L,BTCUSD',
  PRE_NY:          'NVDA,TSLA,AAPL,MSFT,SPY,QQQ,BTCUSD',
  OVERLAP:         'NVDA,TSLA,AAPL,SPY,QQQ,BTCUSD,ETHUSD',
  US_AFTERNOON:    'NVDA,TSLA,AAPL,MSFT,AMZN,META,SPY,QQQ,BTCUSD,ETHUSD',
  EVENING_JOURNAL: 'NVDA,TSLA,SPY,QQQ,BTCUSD,ETHUSD',
  NIGHT_MODE:      'BTCUSD,ETHUSD',
  WEEKEND:         'BTCUSD,ETHUSD',
};

async function fetchMarketauxNewsRaw(sessionName: string): Promise<string> {
  const symbols        = SESSION_ENTITIES[sessionName] ?? SESSION_ENTITIES['OVERLAP'];
  const publishedAfter = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split('.')[0];

  const entityUrl = `${MARKETAUX_BASE}/news/all?` + new URLSearchParams({
    symbols,
    filter_entities: 'true',
    language:        'en',
    published_after: publishedAfter,
    limit:           '10',
    api_token:       MARKETAUX_KEY!,
  }).toString();

  const macroUrl = `${MARKETAUX_BASE}/news/all?` + new URLSearchParams({
    countries:       'us,gb',
    language:        'en',
    published_after: publishedAfter,
    limit:           '10',
    api_token:       MARKETAUX_KEY!,
  }).toString();

  console.log(`Marketaux entity URL: ${entityUrl.replace(MARKETAUX_KEY!, 'XXX')}`);
  console.log(`Marketaux macro URL: ${macroUrl.replace(MARKETAUX_KEY!, 'XXX')}`);

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8000);

  const [entityRes, macroRes] = await Promise.all([
    fetch(entityUrl, { signal: controller.signal }).catch(() => null),
    fetch(macroUrl,  { signal: controller.signal }).catch(() => null),
  ]);
  clearTimeout(timeout);

  const now = Date.now();
  const allArticles: MarketauxArticle[] = [];

  for (const res of [entityRes, macroRes]) {
    if (!res) continue;
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn(`Marketaux HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      continue;
    }
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      console.warn(`Marketaux unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
      continue;
    }
    for (const a of data.data) {
      allArticles.push({
        uuid:         a.uuid,
        title:        a.title        || '',
        description:  a.description  || '',
        snippet:      a.snippet      || '',
        url:          a.url          || '',
        source:       a.source       || 'Unknown',
        published_at: a.published_at,
        entities:     a.entities     || [],
        ageMinutes:   Math.round((now - new Date(a.published_at).getTime()) / 60000),
      });
    }
  }

  // Dedupe by uuid
  const seen   = new Set<string>();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.uuid)) return false;
    seen.add(a.uuid);
    return true;
  });

  // Sort by recency, keep top 15
  const sorted = unique.sort((a, b) => a.ageMinutes - b.ageMinutes).slice(0, 15);

  if (sorted.length === 0) {
    console.log('Marketaux: 0 articles returned');
    return '';
  }

  console.log(`Marketaux: ${sorted.length} articles`);

  const lines = sorted.map((a) => {
    const topEntities = a.entities
      .filter((e) => e.match_score >= 20)
      .slice(0, 3)
      .map((e) => {
        const sent      = e.sentiment_score;
        const sentLabel = sent > 0.15 ? '▲bullish' : sent < -0.15 ? '▼bearish' : '●neutral';
        return `${e.symbol}(${sentLabel} ${sent.toFixed(2)})`;
      })
      .join(', ');

    const entityStr = topEntities ? ` | entities: ${topEntities}` : '';
    return `[${a.ageMinutes}min ago | ${a.source} | pub:${a.published_at}] ${a.title}${entityStr}`;
  });

  return [
    '═══ VERIFIED FINANCIAL NEWS (Marketaux, last 4h) ═══',
    `Fetched at: ${new Date().toISOString()}`,
    'REAL news with VERIFIED timestamps + AI sentiment per tradable entity.',
    'Sentiment score range: -1.0 (very bearish) to +1.0 (very bullish)',
    'Match score ≥ 20 = relevant entity mention',
    '',
    ...lines,
    '═══ END NEWS ═══',
  ].join('\n');
}

export async function fetchMarketauxNews(sessionName: string): Promise<string> {
  if (!MARKETAUX_KEY) {
    console.log('Marketaux: key not set');
    return '';
  }

  const cacheKey = `marketaux:news:${sessionName}`;

  try {
    return await cacheGetOrFetch(
      cacheKey,
      5 * 60, // 5 minute cache
      () => fetchMarketauxNewsRaw(sessionName)
    );
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.error('Marketaux error:', e?.message ?? e);
    return '';
  }
}
