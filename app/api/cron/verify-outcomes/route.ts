import { getSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Symbol map for common IG assets → Alpha Vantage tickers
const SYMBOL_MAP: Record<string, string> = {
  'Gold':      'XAUUSD',
  'Silver':    'XAGUSD',
  'Brent Oil': 'BZ=F',
  'GBP/USD':   'GBPUSD',
  'EUR/USD':   'EURUSD',
  'USD/JPY':   'USDJPY',
  'GBP/JPY':   'GBPJPY',
  'EUR/GBP':   'EURGBP',
  'SPX500':    'SPY',
  'Nasdaq100': 'QQQ',
  'FTSE100':   'ISF.L',
  'Dow Jones': 'DIA',
  'DAX':       'DAX',
};

function resolveSymbol(asset: string): string | null {
  // Mapped asset
  if (SYMBOL_MAP[asset]) return SYMBOL_MAP[asset];
  // Individual stock — asset name IS the ticker if it's all caps, no slash
  if (/^[A-Z]{1,5}$/.test(asset)) return asset;
  // UK stock with .L suffix pattern (e.g. "BARC.L")
  if (/^[A-Z]{1,4}\.L$/.test(asset)) return asset;
  return null;
}

async function fetchCurrentPrice(ticker: string, avKey: string): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${avKey}`;
    const res  = await fetch(url);
    const data = await res.json();
    const price = parseFloat(data?.['Global Quote']?.['05. price']);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function determineOutcome(
  direction: string,
  entry: number,
  current: number,
  stop: number | null,
  target: number | null,
): { outcome: string; pnl: number } {
  const pnl = direction === 'SHORT' ? entry - current : current - entry;

  if (direction === 'LONG') {
    if (target && current >= target) return { outcome: 'HIT',     pnl };
    if (stop   && current <= stop)   return { outcome: 'MISS',    pnl };
    if (current > entry)             return { outcome: 'PARTIAL', pnl };
    return { outcome: 'MISS', pnl };
  }

  if (direction === 'SHORT') {
    if (target && current <= target) return { outcome: 'HIT',     pnl };
    if (stop   && current >= stop)   return { outcome: 'MISS',    pnl };
    if (current < entry)             return { outcome: 'PARTIAL', pnl };
    return { outcome: 'MISS', pnl };
  }

  // WAIT signals auto-expire
  return { outcome: 'EXPIRED', pnl: 0 };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  const AV_KEY = process.env.ALPHA_VANTAGE_KEY;

  // Signals from the last 24 h with no outcome yet
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: unmarked } = await db
    .from('signals')
    .select('id, asset, direction, entry, stop, target, source, platform, outcome')
    .is('outcome', null)
    .gte('created_at', yesterday);

  if (!unmarked || unmarked.length === 0) {
    return NextResponse.json({ message: 'No signals to verify', count: 0 });
  }

  let verified = 0;

  for (const signal of unmarked) {
    try {
      // WAIT signals don't need price data
      if (signal.direction === 'WAIT') {
        await db.from('signals').update({
          outcome:       'EXPIRED',
          outcome_notes: 'AUTO-VERIFIED: WAIT signal auto-expired',
          pnl_pips:      null,
        }).eq('id', signal.id);
        verified++;
        continue;
      }

      if (signal.platform === 'CRYPTO') continue;

      const ticker = resolveSymbol(signal.asset);
      if (!ticker || !AV_KEY) continue;

      const currentPrice = await fetchCurrentPrice(ticker, AV_KEY);
      if (!currentPrice) continue;

      const entryPrice  = parsePrice(signal.entry);
      if (!entryPrice) continue;

      const stopPrice   = parsePrice(signal.stop);
      const targetPrice = parsePrice(signal.target);

      const { outcome, pnl } = determineOutcome(
        signal.direction, entryPrice, currentPrice, stopPrice, targetPrice,
      );

      await db.from('signals').update({
        outcome,
        outcome_notes: `AUTO-VERIFIED: entry=${entryPrice}, current=${currentPrice}, pnl=${pnl.toFixed(2)}`,
        pnl_pips:      parseFloat(pnl.toFixed(2)),
      }).eq('id', signal.id);

      // Update source_stats for the source handle
      const handle = (signal.source ?? '').trim();
      if (handle) {
        const { data: existing } = await db
          .from('source_stats')
          .select('total_signals, hit_count, miss_count, partial_count')
          .eq('handle', handle)
          .single();

        if (existing) {
          await db.from('source_stats').update({
            total_signals: existing.total_signals + 1,
            hit_count:     outcome === 'HIT'     ? existing.hit_count     + 1 : existing.hit_count,
            miss_count:    outcome === 'MISS'    ? existing.miss_count    + 1 : existing.miss_count,
            partial_count: outcome === 'PARTIAL' ? existing.partial_count + 1 : existing.partial_count,
            last_updated:  new Date().toISOString(),
          }).eq('handle', handle);
        } else {
          await db.from('source_stats').insert({
            handle,
            total_signals:  1,
            hit_count:      outcome === 'HIT'     ? 1 : 0,
            miss_count:     outcome === 'MISS'    ? 1 : 0,
            partial_count:  outcome === 'PARTIAL' ? 1 : 0,
          });
        }
      }

      verified++;
      console.log(`Auto-verified ${signal.asset} (${signal.direction}): ${outcome} pnl=${pnl.toFixed(2)}`);
    } catch (e: any) {
      console.error(`Verify error for signal ${signal.id}:`, e?.message ?? e);
    }
  }

  return NextResponse.json({ message: `Verified ${verified} of ${unmarked.length} signals`, count: verified });
}
