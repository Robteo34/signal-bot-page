import { getSupabase } from './supabase';

export async function adjustConfidenceBySourceHistory(signals: any[]): Promise<any[]> {
  const db = getSupabase();
  if (!db) return signals;

  const { data: scores } = await db
    .from('source_scores')
    .select('handle, total_signals, hit_count, miss_count');
  if (!scores || scores.length === 0) return signals;

  const scoreMap = new Map<string, { total: number; hits: number; accuracy: number }>();
  for (const s of scores) {
    if (s.total_signals >= 3) {
      scoreMap.set(s.handle, {
        total: s.total_signals,
        hits: s.hit_count,
        accuracy: s.total_signals > 0 ? (s.hit_count / s.total_signals) * 100 : 50,
      });
    }
  }

  return signals.map((signal) => {
    const handleWithAt = signal.source;
    const handleBare   = signal.source?.replace(/^@/, '');
    const sourceData   = scoreMap.get(handleWithAt) || scoreMap.get(handleBare);

    if (!sourceData) return signal;

    let adjustment = 0;
    if (sourceData.accuracy >= 80 && sourceData.total >= 5) adjustment = +2;
    else if (sourceData.accuracy >= 70) adjustment = +1;
    else if (sourceData.accuracy < 25 && sourceData.total >= 5) adjustment = -2;
    else if (sourceData.accuracy < 40) adjustment = -1;

    const base = signal.strength ?? signal.signal_strength ?? 5;
    const adjustedStrength = Math.max(1, Math.min(10, base + adjustment));

    return {
      ...signal,
      strength: adjustedStrength,
      source_accuracy: Math.round(sourceData.accuracy),
      source_total_signals: sourceData.total,
      source_adjusted: adjustment !== 0,
    };
  });
}
