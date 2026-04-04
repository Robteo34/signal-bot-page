import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60; // cache 60s

interface PriceData {
  btc: number | null;
  gbpusd: number | null;
  spx: number | null;
  eth: number | null;
  ftse: number | null;
  gold: number | null;
  vix: number | null;
  btcChange: number | null;
}

async function fetchCoinGecko(): Promise<{ btc: number | null; eth: number | null; btcChange: number | null }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { btc: null, eth: null, btcChange: null };
    const data = await res.json();
    return {
      btc: data?.bitcoin?.usd ?? null,
      eth: data?.ethereum?.usd ?? null,
      btcChange: data?.bitcoin?.usd_24h_change ?? null,
    };
  } catch {
    return { btc: null, eth: null, btcChange: null };
  }
}

async function fetchYahoo(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const [crypto, gbpusd, spx, ftse, gold, vix] = await Promise.all([
    fetchCoinGecko(),
    fetchYahoo('GBPUSD=X'),
    fetchYahoo('^GSPC'),
    fetchYahoo('^FTSE'),
    fetchYahoo('GC=F'),
    fetchYahoo('^VIX'),
  ]);

  const result: PriceData = {
    btc: crypto.btc,
    eth: crypto.eth,
    btcChange: crypto.btcChange,
    gbpusd,
    spx,
    ftse,
    gold,
    vix,
  };

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
