import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    const { signalId, outcome, pnlPips } = await req.json();

    if (!signalId || !outcome) {
      return NextResponse.json({ error: 'signalId and outcome are required' }, { status: 400 });
    }
    if (!['HIT', 'MISS', 'PARTIAL', 'EXPIRED'].includes(outcome)) {
      return NextResponse.json({ error: 'outcome must be HIT | MISS | PARTIAL | EXPIRED' }, { status: 400 });
    }

    // 1. Fetch the signal to get its source handle
    const { data: signal, error: fetchErr } = await db
      .from('signals')
      .select('id, source, outcome')
      .eq('id', signalId)
      .single();

    if (fetchErr || !signal) {
      return NextResponse.json({ error: fetchErr?.message ?? 'Signal not found' }, { status: 404 });
    }

    const previousOutcome: string | null = signal.outcome;

    // 2. Update the signal row
    const { error: updateErr } = await db
      .from('signals')
      .update({ outcome, pnl_pips: pnlPips ?? null })
      .eq('id', signalId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Update source_stats for the citing handle (upsert)
    const handle = (signal.source ?? '').trim();
    if (handle) {
      // Build increment deltas — subtract previous outcome first if re-marking
      const hitDelta     = (outcome === 'HIT'     ? 1 : 0) - (previousOutcome === 'HIT'     ? 1 : 0);
      const missDelta    = (outcome === 'MISS'    ? 1 : 0) - (previousOutcome === 'MISS'    ? 1 : 0);
      const partialDelta = (outcome === 'PARTIAL' ? 1 : 0) - (previousOutcome === 'PARTIAL' ? 1 : 0);
      // total_signals only increments on first marking (no previous outcome)
      const totalDelta   = previousOutcome ? 0 : 1;

      const { data: existing } = await db
        .from('source_stats')
        .select('total_signals, hit_count, miss_count, partial_count')
        .eq('handle', handle)
        .single();

      if (existing) {
        await db.from('source_stats').update({
          total_signals:  existing.total_signals  + totalDelta,
          hit_count:      existing.hit_count      + hitDelta,
          miss_count:     existing.miss_count     + missDelta,
          partial_count:  existing.partial_count  + partialDelta,
          last_updated:   new Date().toISOString(),
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

    return NextResponse.json({ success: true, updated: signalId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
