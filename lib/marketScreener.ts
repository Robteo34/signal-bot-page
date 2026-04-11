const SCREENER_URLS = {
  yahoo_active:  'https://finance.yahoo.com/markets/stocks/most-active/',
  yahoo_gainers: 'https://finance.yahoo.com/markets/stocks/gainers/',
  yahoo_losers:  'https://finance.yahoo.com/markets/stocks/losers/',
};

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

function extractTickers(html: string): string[] {
  const matches = html.match(/data-symbol="([A-Z]{1,5})"/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/data-symbol="|"/g, '')))];
}

export async function screenMarkets(): Promise<string> {
  const sections: string[] = [];

  const fetches = [
    { label: 'MOST ACTIVE',  url: SCREENER_URLS.yahoo_active,  limit: 15 },
    { label: 'TOP GAINERS',  url: SCREENER_URLS.yahoo_gainers, limit: 10 },
    { label: 'TOP LOSERS',   url: SCREENER_URLS.yahoo_losers,  limit: 10 },
  ];

  await Promise.all(
    fetches.map(async ({ label, url, limit }) => {
      try {
        const res = await fetch(url, { headers: UA });
        if (!res.ok) return;
        const tickers = extractTickers(await res.text()).slice(0, limit);
        if (tickers.length > 0) sections.push(`${label}: ${tickers.join(', ')}`);
      } catch (e: any) {
        console.warn(`Screener fetch failed (${label}):`, e?.message ?? e);
      }
    })
  );

  if (sections.length === 0) {
    return 'Market screener: no data retrieved. Use X search to find movers.';
  }

  return [
    '═══ LIVE MARKET SCREENER DATA ═══',
    ...sections,
    'Investigate these tickers — they are moving RIGHT NOW. Find out WHY on X/Twitter.',
    '═══ END SCREENER ═══',
  ].join('\n');
}
