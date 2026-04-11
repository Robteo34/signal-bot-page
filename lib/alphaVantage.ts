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

// tickers: dynamic list from screener/scan. Capped at 4 (= 8 AV calls, safe for 25/day free tier).
export async function getMarketData(tickers: string[]): Promise<string> {
  if (!AV_KEY || tickers.length === 0) return '';

  const selected = tickers.slice(0, 4);
  const lines: string[] = [];

  await Promise.all(
    selected.map(async (sym) => {
      const [quote, rsi] = await Promise.all([fetchQuote(sym), fetchRSI(sym)]);
      if (!quote) return;
      const rsiLabel = rsi == null ? 'N/A' : rsi < 30 ? `${rsi.toFixed(1)} OVERSOLD` : rsi > 70 ? `${rsi.toFixed(1)} OVERBOUGHT` : `${rsi.toFixed(1)} neutral`;
      lines.push(`${sym}: close=$${quote.lastClose}, volume=${quote.volume?.toLocaleString() ?? 'N/A'}, RSI(14)=${rsiLabel}`);
    })
  );

  if (lines.length === 0) return '';

  return [
    '═══ VERIFIED TECHNICAL DATA (Alpha Vantage) ═══',
    ...lines,
    'RSI<30 = oversold bounce candidate. RSI>70 = overbought short candidate.',
    '═══ END ═══',
  ].join('\n');
}
