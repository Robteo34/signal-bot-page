import { getSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'No DB connection' }, { status: 500 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recentScans }, { data: recentSignals }, { data: sourceScores }] = await Promise.all([
    db.from('scans').select('*').gte('created_at', weekAgo).order('created_at', { ascending: false }),
    db.from('signals').select('*').gte('created_at', weekAgo).order('created_at', { ascending: false }),
    db.from('source_scores').select('*').order('total_signals', { ascending: false }),
  ]);

  const totalSignals  = recentSignals?.length ?? 0;
  const markedSignals = recentSignals?.filter((s) => s.outcome) ?? [];
  const hits          = markedSignals.filter((s) => s.outcome === 'HIT').length;
  const misses        = markedSignals.filter((s) => s.outcome === 'MISS').length;
  const partials      = markedSignals.filter((s) => s.outcome === 'PARTIAL').length;
  const expired       = markedSignals.filter((s) => s.outcome === 'EXPIRED').length;
  const hitRate       = markedSignals.length > 0
    ? ((hits / markedSignals.length) * 100).toFixed(1) + '%'
    : 'N/A';

  // Category breakdown
  const categories: Record<string, { total: number; hits: number; misses: number }> = {};
  for (const sig of markedSignals) {
    const cat = sig.category ?? 'UNKNOWN';
    if (!categories[cat]) categories[cat] = { total: 0, hits: 0, misses: 0 };
    categories[cat].total++;
    if (sig.outcome === 'HIT')  categories[cat].hits++;
    if (sig.outcome === 'MISS') categories[cat].misses++;
  }

  // Asset breakdown
  const assets: Record<string, { total: number; hits: number; misses: number; avgStrength: number }> = {};
  for (const sig of (recentSignals ?? [])) {
    const asset = sig.asset ?? 'UNKNOWN';
    if (!assets[asset]) assets[asset] = { total: 0, hits: 0, misses: 0, avgStrength: 0 };
    assets[asset].total++;
    assets[asset].avgStrength += sig.strength ?? 0;
    if (sig.outcome === 'HIT')  assets[asset].hits++;
    if (sig.outcome === 'MISS') assets[asset].misses++;
  }
  for (const a of Object.values(assets)) {
    a.avgStrength = parseFloat((a.avgStrength / a.total).toFixed(1));
  }

  // Session breakdown
  const sessions: Record<string, number> = {};
  for (const scan of (recentScans ?? [])) {
    const s = scan.session_name ?? 'UNKNOWN';
    sessions[s] = (sessions[s] ?? 0) + 1;
  }

  const autoVerified = markedSignals.filter((s) => (s.outcome_notes ?? '').startsWith('AUTO')).length;

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    period: 'last_7_days',
    summary: {
      total_scans:   recentScans?.length ?? 0,
      total_signals: totalSignals,
      marked:        markedSignals.length,
      unmarked:      totalSignals - markedSignals.length,
      hit_rate:      hitRate,
      hits,
      misses,
      partials,
      expired,
      auto_verified: autoVerified,
      manual_marked: markedSignals.length - autoVerified,
    },
    categories,
    assets,
    sessions,
    source_scores: sourceScores,
    scan_timings: (recentScans ?? []).slice(0, 20).map((s) => ({
      date:        s.created_at,
      session:     s.session_name,
      scanMs:      s.scan_duration_ms,
      analyzeMs:   s.analyze_duration_ms,
      totalMs:     s.total_duration_ms,
      dataQuality: s.data_quality,
    })),
    recent_signals: (recentSignals ?? []).slice(0, 30).map((s) => ({
      date:             s.created_at,
      asset:            s.asset,
      direction:        s.direction,
      strength:         s.strength,
      source:           s.source,
      category:         s.category,
      outcome:          s.outcome,
      outcome_notes:    s.outcome_notes,
      pnl_pips:         s.pnl_pips,
      confidence_basis: s.confidence_basis,
    })),
  });
}
