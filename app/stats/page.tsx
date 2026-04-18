'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Outcome = 'HIT' | 'MISS' | 'PARTIAL' | 'EXPIRED';

interface Signal {
  id: string;
  created_at: string;
  asset: string;
  direction: string;
  strength: number;
  session_name: string | null;
  entry: string | null;
  stop: string | null;
  target: string | null;
  reason: string | null;
  outcome: Outcome | null;
  outcome_notes: string | null;
  platform: string | null;
}

type Filter = { session: string; direction: string; outcome: string };

export default function StatsPage() {
  const [signals, setSignals]   = useState<Signal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<Filter>({ session: 'all', direction: 'all', outcome: 'all' });

  useEffect(() => { loadSignals(); }, []);

  async function loadSignals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('signals')
      .select('id, created_at, asset, direction, strength, session_name, entry, stop, target, reason, outcome, outcome_notes, platform')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setSignals(data as Signal[]);
    setLoading(false);
  }

  async function markOutcome(id: string, outcome: Outcome) {
    const { error } = await supabase
      .from('signals')
      .update({ outcome })
      .eq('id', id);
    if (!error) {
      setSignals((prev) => prev.map((s) => s.id === id ? { ...s, outcome } : s));
    }
  }

  const filtered = signals.filter((s) => {
    if (filter.session !== 'all' && s.session_name !== filter.session) return false;
    if (filter.direction !== 'all' && s.direction !== filter.direction) return false;
    if (filter.outcome === 'pending' && s.outcome !== null) return false;
    if (filter.outcome !== 'all' && filter.outcome !== 'pending' && s.outcome !== filter.outcome) return false;
    return true;
  });

  const actionable = signals.filter((s) => s.direction === 'LONG' || s.direction === 'SHORT');
  const marked     = actionable.filter((s) => s.outcome === 'HIT' || s.outcome === 'MISS' || s.outcome === 'PARTIAL');
  const hits       = marked.filter((s) => s.outcome === 'HIT').length;
  const hitRate    = marked.length > 0 ? ((hits / marked.length) * 100).toFixed(1) : 'N/A';
  const pending    = actionable.filter((s) => !s.outcome).length;

  const sessionStats: Record<string, { total: number; hits: number }> = {};
  for (const s of marked) {
    const key = s.session_name ?? 'unknown';
    if (!sessionStats[key]) sessionStats[key] = { total: 0, hits: 0 };
    sessionStats[key].total++;
    if (s.outcome === 'HIT') sessionStats[key].hits++;
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#050505', color: '#E8E8E0', fontFamily: 'monospace', padding: '16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#5DCAA5' }}>SIGNAL STATS</div>
          <a href="/" style={{ fontSize: 11, color: '#444', textDecoration: 'none' }}>← back</a>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          <MetricCard label="Total signals" value={signals.length.toString()} />
          <MetricCard label="Hit rate" value={hitRate === 'N/A' ? 'N/A' : `${hitRate}%`}
            color={hitRate !== 'N/A' && parseFloat(hitRate) >= 60 ? '#5DCAA5' : '#EF9F27'} />
          <MetricCard label="Marked" value={`${marked.length}/${actionable.length}`} />
          <MetricCard label="Pending" value={pending.toString()} color={pending > 5 ? '#EF9F27' : '#555'} />
        </div>

        {/* Per-session breakdown */}
        {Object.keys(sessionStats).length > 0 && (
          <div style={{ border: '1px solid #1A1A1A', borderRadius: 6, padding: '10px 12px', marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 8 }}>HIT RATE PER SESSION</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {Object.entries(sessionStats).map(([session, stats]) => (
                <div key={session}>
                  <div style={{ fontSize: 9, color: '#555' }}>{session}</div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: '#E8E8E0' }}>
                    {((stats.hits / stats.total) * 100).toFixed(0)}%
                    <span style={{ fontSize: 9, color: '#444', marginLeft: 4 }}>({stats.hits}/{stats.total})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { key: 'session', options: [
              ['all', 'All sessions'], ['LONDON', 'London'], ['PRE_LONDON', 'Pre-London'],
              ['PRE_NY', 'Pre-NY'], ['OVERLAP', 'Overlap'], ['US_AFTERNOON', 'US Afternoon'],
              ['ASIA_OVERNIGHT', 'Asia'], ['EVENING_JOURNAL', 'Evening'], ['NIGHT_MODE', 'Night'], ['WEEKEND', 'Weekend'],
            ]},
            { key: 'direction', options: [['all', 'All directions'], ['LONG', 'LONG'], ['SHORT', 'SHORT'], ['WAIT', 'WAIT']] },
            { key: 'outcome', options: [
              ['all', 'All outcomes'], ['pending', 'Pending'], ['HIT', 'HIT'], ['MISS', 'MISS'], ['PARTIAL', 'PARTIAL'], ['EXPIRED', 'EXPIRED'],
            ]},
          ].map(({ key, options }) => (
            <select
              key={key}
              value={filter[key as keyof Filter]}
              onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}
              style={{ background: '#0d0d0d', border: '1px solid #1A1A1A', borderRadius: 4, padding: '4px 8px', fontSize: 11, color: '#888', fontFamily: 'monospace' }}
            >
              {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          ))}
          <button onClick={loadSignals} style={{ background: 'none', border: '1px solid #1A1A1A', borderRadius: 4, padding: '4px 10px', fontSize: 11, color: '#444', fontFamily: 'monospace', cursor: 'pointer' }}>
            ↺ refresh
          </button>
        </div>

        {/* Signals list */}
        {loading ? (
          <div style={{ color: '#333', fontSize: 12 }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((sig) => {
              const isActionable = sig.direction === 'LONG' || sig.direction === 'SHORT';
              const dirColor = sig.direction === 'LONG' ? '#5DCAA5' : sig.direction === 'SHORT' ? '#D85A30' : '#555';
              const outcomeColor: Record<string, string> = { HIT: '#5DCAA5', MISS: '#D85A30', PARTIAL: '#EF9F27', EXPIRED: '#444' };
              return (
                <div key={sig.id} style={{ border: '1px solid #1A1A1A', borderRadius: 6, padding: '10px 12px', background: '#0a0a0a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', color: dirColor }}>{sig.direction}</span>
                        <span style={{ fontWeight: 'bold', color: '#E8E8E0' }}>{sig.asset}</span>
                        {sig.session_name && <span style={{ fontSize: 9, color: '#444' }}>{sig.session_name}</span>}
                        <span style={{ fontSize: 9, color: '#444' }}>str {sig.strength}</span>
                        {sig.platform && <span style={{ fontSize: 8, color: sig.platform === 'CRYPTO' ? '#a855f7' : '#5DCAA5', border: `1px solid ${sig.platform === 'CRYPTO' ? '#a855f744' : '#5DCAA544'}`, borderRadius: 3, padding: '1px 4px' }}>{sig.platform}</span>}
                        {sig.outcome && (
                          <span style={{ fontSize: 9, color: outcomeColor[sig.outcome] ?? '#888', border: `1px solid ${outcomeColor[sig.outcome] ?? '#888'}44`, borderRadius: 3, padding: '1px 5px' }}>
                            {sig.outcome}
                          </span>
                        )}
                      </div>
                      {sig.entry && (
                        <div style={{ fontSize: 10, color: '#444', marginTop: 3 }}>
                          Entry {sig.entry} · Stop {sig.stop} · Target {sig.target}
                        </div>
                      )}
                      {sig.reason && (
                        <div style={{ fontSize: 10, color: '#555', marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                          {sig.reason}
                        </div>
                      )}
                      <div style={{ fontSize: 9, color: '#333', marginTop: 3 }}>
                        {new Date(sig.created_at).toLocaleString('pl-PL')}
                      </div>
                    </div>
                    {isActionable && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {(['HIT', 'MISS', 'PARTIAL', 'EXPIRED'] as Outcome[]).map((o) => {
                          const icons: Record<Outcome, string> = { HIT: '✅', MISS: '❌', PARTIAL: '⚡', EXPIRED: '⏰' };
                          return (
                            <button
                              key={o}
                              onClick={() => markOutcome(sig.id, o)}
                              style={{
                                padding: '4px 7px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                                background: sig.outcome === o ? (outcomeColor[o] + '33') : 'none',
                                border: `1px solid ${sig.outcome === o ? outcomeColor[o] : '#1A1A1A'}`,
                                color: sig.outcome === o ? outcomeColor[o] : '#333',
                                minHeight: 32,
                              }}
                            >
                              {icons[o]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ color: '#333', textAlign: 'center', padding: '32px 0', fontSize: 12 }}>
                No signals match these filters
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = '#E8E8E0' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ border: '1px solid #1A1A1A', borderRadius: 6, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}
