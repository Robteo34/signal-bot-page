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

async function fetchVolumeProfile(symbol: string): Promise<{
  avgVolume20: number | null;
  volumeRatio: number | null;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'FLAT';
} | null> {
  if (!AV_KEY) return null;
  try {
    const res  = await fetch(`${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${AV_KEY}`);
    const data = await res.json();
    const ts   = data['Time Series (Daily)'];
    if (!ts) return null;

    const dates = Object.keys(ts).sort().reverse();
    if (dates.length < 21) return null;

    const latestVolume  = parseInt(ts[dates[0]]?.['5. volume']) || 0;
    const last20Volumes = dates.slice(1, 21).map((d) => parseInt(ts[d]?.['5. volume']) || 0);
    const avgVolume20   = Math.round(last20Volumes.reduce((a, b) => a + b, 0) / 20);
    const volumeRatio   = avgVolume20 > 0 ? parseFloat((latestVolume / avgVolume20).toFixed(2)) : null;

    const last3 = dates.slice(0, 3).map((d) => parseInt(ts[d]?.['5. volume']) || 0);
    const volumeTrend =
      last3[0] > last3[1] && last3[1] > last3[2] ? 'INCREASING' :
      last3[0] < last3[1] && last3[1] < last3[2] ? 'DECREASING' : 'FLAT';

    return { avgVolume20, volumeRatio, volumeTrend };
  } catch {
    return null;
  }
}

function volLabel(ratio: number | null): string {
  if (ratio == null) return 'N/A';
  const pct = (ratio * 100).toFixed(0);
  if (ratio > 2.0)  return `🔥 UNUSUAL (${pct}% avg)`;
  if (ratio > 1.3)  return `ABOVE AVG (${pct}% avg)`;
  if (ratio < 0.5)  return `LOW VOLUME (${pct}% avg)`;
  return 'NORMAL';
}

// tickers: dynamic list from screener/scan. Capped at 4 (= 8 AV calls, safe for 25/day free tier).
// Per symbol: RSI (1 call) + TIME_SERIES_DAILY (1 call) = 2 calls. Quote reuses daily series data.
export async function getMarketData(tickers: string[]): Promise<string> {
  if (!AV_KEY || tickers.length === 0) return '';

  const selected = tickers.slice(0, 4);
  const lines: string[] = [];

  await Promise.all(
    selected.map(async (sym) => {
      const [rsiValue, dailyData, quote] = await Promise.all([
        fetchRSI(sym),
        fetchVolumeProfile(sym),
        fetchQuote(sym),
      ]);

      if (!quote && !dailyData) return;

      const rsi      = rsiValue;
      const rsiStr   = rsi != null
        ? `${rsi.toFixed(1)} ${rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL'}`
        : 'N/A';
      const vol      = volLabel(dailyData?.volumeRatio ?? null);
      const trend    = dailyData?.volumeTrend ?? 'N/A';
      const avg20    = dailyData?.avgVolume20?.toLocaleString() ?? 'N/A';
      const close    = quote?.lastClose ?? 'N/A';

      lines.push(`${sym}: close=$${close}, RSI(14)=${rsiStr}, Volume=${vol}, Vol Trend=${trend}, Avg20Vol=${avg20}`);
    })
  );

  if (lines.length === 0) return '';

  return [
    '═══ VERIFIED TECHNICAL DATA (Alpha Vantage) ═══',
    ...lines,
    'Trading signals:',
    '- RSI<30 + Volume INCREASING = strong reversal LONG candidate',
    '- RSI>70 + Volume DECREASING = momentum fading, SHORT candidate',
    '- UNUSUAL VOLUME (>200% avg) = institutional activity, follow the direction',
    '- LOW VOLUME = avoid, no conviction',
    '═══ END ═══',
  ].join('\n');
}
