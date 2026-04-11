const AV_KEY  = process.env.ALPHA_VANTAGE_KEY;
const AV_BASE = 'https://www.alphavantage.co/query';

async function fetchQuote(symbol: string): Promise<{ lastClose: number | null; volume: number | null } | null> {
  try {
    const res  = await fetch(`${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`);
    const data = await res.json();
    const q    = data['Global Quote'];
    if (!q || !q['05. price']) return null;
    return {
      lastClose: parseFloat(q['05. price']) || null,
      volume:    parseInt(q['06. volume'])  || null,
    };
  } catch {
    return null;
  }
}

async function fetchRSI(symbol: string): Promise<number | null> {
  try {
    const res  = await fetch(`${AV_BASE}?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${AV_KEY}`);
    const data = await res.json();
    const rsiData = data['Technical Analysis: RSI'];
    if (!rsiData) return null;
    const latest = Object.keys(rsiData)[0];
    return parseFloat(rsiData[latest]?.RSI) || null;
  } catch {
    return null;
  }
}

// 4 symbols × 2 calls = 8 Alpha Vantage calls per scan (well within 25/day free tier)
const SYMBOLS = ['NVDA', 'TSLA', 'AAPL', 'MSFT'];

export async function getMarketData(): Promise<string> {
  if (!AV_KEY) return 'Alpha Vantage API key not configured — no technical data available.';

  const lines: string[] = [];

  await Promise.all(
    SYMBOLS.map(async (sym) => {
      const [quote, rsi] = await Promise.all([fetchQuote(sym), fetchRSI(sym)]);
      if (!quote) return;
      const rsiLabel = rsi == null ? 'N/A' : rsi < 30 ? `${rsi.toFixed(1)} OVERSOLD` : rsi > 70 ? `${rsi.toFixed(1)} OVERBOUGHT` : `${rsi.toFixed(1)} neutral`;
      lines.push(`${sym}: close=$${quote.lastClose}, volume=${quote.volume?.toLocaleString() ?? 'N/A'}, RSI(14)=${rsiLabel}`);
    })
  );

  if (lines.length === 0) return 'Alpha Vantage: no data retrieved.';

  return [
    '═══ REAL TECHNICAL DATA (Alpha Vantage) ═══',
    ...lines,
    'Use this data to validate share analysis. RSI<30 = oversold bounce candidate. RSI>70 = overbought short candidate.',
  ].join('\n');
}
