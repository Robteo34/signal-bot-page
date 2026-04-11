import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    // Last 50 signals with parent scan metadata
    const { data: signals, error: sigErr } = await db
      .from('signals')
      .select(`
        id, created_at, asset, direction, strength, confidence_basis,
        platform, source, reason, entry, stop, target,
        overnight_risk, outcome, pnl_pips,
        scans ( session_name, uk_date, uk_time )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (sigErr) return NextResponse.json({ error: sigErr.message }, { status: 500 });

    // Top source accuracy
    const { data: sourceStats } = await db
      .from('source_stats')
      .select('handle, total_signals, hit_count, accuracy_pct')
      .order('accuracy_pct', { ascending: false, nullsFirst: false })
      .limit(5);

    return NextResponse.json({ signals: signals ?? [], sourceStats: sourceStats ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
