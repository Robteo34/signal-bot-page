const TD_KEY  = process.env.TWELVE_DATA_KEY;
const TD_BASE = 'https://api.twelvedata.com';

interface PriceData {
  symbol: string;
  displayName: string;
  price: number;
  changePercent: number;
  timestamp: string;
}

const SYMBOL_MAP: Record<string, string> = {
  // Forex
  'GBP/USD': 'GBP/USD', 'EUR/USD': 'EUR/USD', 'GBP/JPY': 'GBP/JPY',
  'USD/JPY': 'USD/JPY', 'EUR/GBP': 'EUR/GBP', 'AUD/USD': 'AUD/USD', 'NZD/USD': 'NZD/USD',
  // Commodities
  'Gold': 'XAU/USD', 'Silver': 'XAG/USD', 'Brent Oil': 'BRENT',
  'WTI Oil': 'WTI/USD', 'Copper': 'COPPER', 'Natural Gas': 'NG', 'Platinum': 'XPT/USD',
  // Indices
  'SPX500': 'SPX', 'Nasdaq100': 'NDX', 'Dow Jones': 'DJI',
  'FTSE100': 'UKX', 'DAX': 'DAX', 'CAC40': 'PX1',
  'Nikkei225': 'N225', 'Hang Seng': 'HSI', 'Russell2000': 'RUT', 'VIX': 'VIX',
  // Crypto
  'BTC/USD': 'BTC/USD', 'ETH/USD': 'ETH/USD',
  // US stocks
  'NVDA': 'NVDA', 'TSLA': 'TSLA', 'AAPL': 'AAPL', 'MSFT': 'MSFT',
  'AMZN': 'AMZN', 'META': 'META', 'GOOGL': 'GOOGL', 'JPM': 'JPM',
  // UK stocks
  'SHEL.L': 'SHEL', 'BP.L': 'BP', 'BARC.L': 'BARC',
  'HSBA.L': 'HSBA', 'AZN.L': 'AZN', 'RR.L': 'RR',
};

const SESSION_UNIVERSE: Record<string, string[]> = {
  ASIA_OVERNIGHT:  ['Gold', 'BTC/USD', 'ETH/USD', 'USD/JPY', 'AUD/USD', 'Nikkei225', 'Hang Seng'],
  PRE_LONDON:      ['Gold', 'Silver', 'Brent Oil', 'GBP/USD', 'EUR/USD', 'EUR/GBP', 'FTSE100', 'BTC/USD'],
  LONDON:          ['Gold', 'Silver', 'Brent Oil', 'GBP/USD', 'GBP/JPY', 'EUR/USD', 'FTSE100', 'DAX', 'BTC/USD', 'SHEL.L', 'BP.L'],
  PRE_NY:          ['Gold', 'Brent Oil', 'GBP/USD', 'EUR/USD', 'SPX500', 'Nasdaq100', 'NVDA', 'TSLA', 'BTC/USD', 'VIX'],
  OVERLAP:         ['Gold', 'Silver', 'Brent Oil', 'GBP/USD', 'EUR/USD', 'SPX500', 'Nasdaq100', 'FTSE100', 'NVDA', 'BTC/USD', 'VIX'],
  US_AFTERNOON:    ['Gold', 'Brent Oil', 'SPX500', 'Nasdaq100', 'Dow Jones', 'NVDA', 'TSLA', 'AAPL', 'BTC/USD', 'ETH/USD', 'VIX'],
  EVENING_JOURNAL: ['Gold', 'BTC/USD', 'ETH/USD', 'SPX500', 'Nasdaq100', 'GBP/USD'],
  NIGHT_MODE:      ['BTC/USD', 'ETH/USD'],
  WEEKEND:         ['BTC/USD', 'ETH/USD', 'Gold'],
};

async function fetchSinglePrice(symbol: string): Promise<{ price: number; changePercent: number; timestamp: string } | null> {
  if (!TD_KEY) return null;
  try {
    const res  = await fetch(`${TD_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code) return null; // API error response
    const price = parseFloat(data.close ?? data.price);
    if (!price) return null;
    return {
      price,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp:     data.datetime ?? new Date().toISOString(),
    };
  } catch (e: any) {
    console.warn(`Twelve Data error for ${symbol}:`, e?.message ?? e);
    return null;
  }
}

export async function fetchSessionPrices(sessionName: string): Promise<string> {
  if (!TD_KEY) return '';

  const assets    = SESSION_UNIVERSE[sessionName] ?? SESSION_UNIVERSE['OVERLAP'];
  const fetchedAt = new Date().toISOString();
  const results: PriceData[] = [];
  const BATCH = 8; // free tier: 8 req/min

  for (let i = 0; i < assets.length; i += BATCH) {
    const batch = assets.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async (assetName) => {
        const tdSymbol = SYMBOL_MAP[assetName];
        if (!tdSymbol) return null;
        const data = await fetchSinglePrice(tdSymbol);
        if (!data) return null;
        return { symbol: tdSymbol, displayName: assetName, ...data } as PriceData;
      })
    );
    results.push(...batchResults.filter((r): r is PriceData => r !== null));
    if (i + BATCH < assets.length) await new Promise((r) => setTimeout(r, 1000));
  }

  if (results.length === 0) return '';

  const lines = results.map((r) => {
    const dp    = r.price > 100 ? 2 : 4;
    const sign  = r.changePercent >= 0 ? '+' : '';
    return `${r.displayName}: ${r.price.toFixed(dp)} (${sign}${r.changePercent.toFixed(2)}%) [as of ${r.timestamp}]`;
  });

  return [
    '═══ VERIFIED LIVE PRICES (Twelve Data) ═══',
    `Fetched at: ${fetchedAt}`,
    'THESE ARE REAL PRICES. Use ONLY these for entry/stop/target levels.',
    'DO NOT invent or estimate prices. If an asset is not listed here, do not provide specific price levels.',
    '',
    ...lines,
    '═══ END PRICES ═══',
  ].join('\n');
}
