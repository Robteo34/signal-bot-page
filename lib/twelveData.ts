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

// MAX 7 per session — all fetched in parallel, no batching
const SESSION_UNIVERSE: Record<string, string[]> = {
  ASIA_OVERNIGHT:  ['BTC/USD', 'ETH/USD', 'USD/JPY', 'Gold', 'Nikkei225', 'AUD/USD', 'Hang Seng'],
  PRE_LONDON:      ['GBP/USD', 'EUR/USD', 'Gold', 'Brent Oil', 'FTSE100', 'BTC/USD', 'EUR/GBP'],
  LONDON:          ['GBP/USD', 'EUR/USD', 'Gold', 'Brent Oil', 'FTSE100', 'DAX', 'BTC/USD'],
  PRE_NY:          ['GBP/USD', 'EUR/USD', 'SPX500', 'Nasdaq100', 'Gold', 'BTC/USD', 'VIX'],
  OVERLAP:         ['SPX500', 'Nasdaq100', 'GBP/USD', 'EUR/USD', 'Gold', 'BTC/USD', 'VIX'],
  US_AFTERNOON:    ['SPX500', 'Nasdaq100', 'NVDA', 'TSLA', 'BTC/USD', 'ETH/USD', 'VIX'],
  EVENING_JOURNAL: ['SPX500', 'Nasdaq100', 'BTC/USD', 'Gold', 'GBP/USD', 'ETH/USD', 'VIX'],
  NIGHT_MODE:      ['BTC/USD', 'ETH/USD', 'Gold'],
  WEEKEND:         ['BTC/USD', 'ETH/USD', 'Gold'],
};

async function fetchSinglePrice(symbol: string): Promise<{ price: number; changePercent: number; timestamp: string } | null> {
  if (!TD_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000); // 5s per-fetch timeout
  try {
    const res  = await fetch(
      `${TD_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`,
      { signal: controller.signal }
    );
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
    if (e?.name !== 'AbortError') console.warn(`Twelve Data error for ${symbol}:`, e?.message ?? e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSessionPrices(sessionName: string): Promise<string> {
  if (!TD_KEY) return '';

  const assets    = SESSION_UNIVERSE[sessionName] ?? SESSION_UNIVERSE['OVERLAP'];
  const fetchedAt = new Date().toISOString();

  // Fetch ALL prices in parallel — no batching, individual 5s timeouts handle stragglers
  const batchResults = await Promise.all(
    assets.map(async (assetName) => {
      const tdSymbol = SYMBOL_MAP[assetName];
      if (!tdSymbol) return null;
      const data = await fetchSinglePrice(tdSymbol);
      if (!data) return null;
      return { symbol: tdSymbol, displayName: assetName, ...data } as PriceData;
    })
  );

  const results = batchResults.filter((r): r is PriceData => r !== null);
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
