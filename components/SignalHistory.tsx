'use client';

import { useState, useEffect } from 'react';

interface HistorySignal {
  id: string;
  created_at: string;
  asset: string;
  direction: string;
  strength: number;
  platform: string;
  source: string;
  reason: string;
  outcome: string | null;
  pnl_pips: number | null;
  scans: { session_name: string; uk_date: string; uk_time: string } | null;
}

interface SourceStat {
  handle: string;
  total_signals: number;
  hit_count: number;
  accuracy_pct: number | null;
}

const OUTCOME_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  HIT:     { label: '✅ HIT',     color: '#5DCAA5', bg: '#5DCAA515' },
  MISS:    { label: '❌ MISS',    color: '#D85A30', bg: '#D85A3015' },
  PARTIAL: { label: '⚡ PARTIAL', color: '#EF9F27', bg: '#EF9F2715' },
  EXPIRED: { label: '⏰ EXPIRED', color: '#555',    bg: '#55555515' },
};

const DIR_COLOR: Record<string, string> = { LONG: '#5DCAA5', SHORT: '#D85A30', WAIT: '#555' };

export default function SignalHistory({ onClose }: { onClose: () => void }) {
  const [signals, setSignals] = useState<HistorySignal[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/signals/history')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSignals(d.signals ?? []);
        setSourceStats(d.sourceStats ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Summary stats derived from returned signals
  const marked    = signals.filter((s) => s.outcome);
  const hits      = marked.filter((s) => s.outcome === 'HIT').length;
  const hitRate   = marked.length > 0 ? Math.round((hits / marked.length) * 100) : null;
  const bestCat   = sourceStats[0]?.handle ?? '—';

  return (
    <div style={{ height: '100dvh', background: '#050505', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #1A1A1A', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold', color: '#EF9F27', letterSpacing: '0.12em' }}>
          📊 HISTORIA SYGNAŁÓW
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer', padding: '4px 8px', minHeight: 36 }}
        >
          ✕
        </button>
      </div>

      {/* Summary stats */}
      {signals.length > 0 && (
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #111', flexShrink: 0 }}>
          {[
            { label: 'SYGNAŁY', value: signals.length },
            { label: 'OCENIONE', value: marked.length },
            { label: 'HIT RATE', value: hitRate != null ? `${hitRate}%` : '—' },
            { label: 'TOP SOURCE', value: bestCat },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRight: '1px solid #111' }}>
              <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', color: '#E8E8E0' }}>{s.value}</div>
              <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#444', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Source leaderboard */}
      {sourceStats.length > 0 && (
        <div style={{ padding: '6px 12px 4px', borderBottom: '1px solid #0d0d0d', flexShrink: 0 }}>
          <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#333', letterSpacing: '0.1em', marginBottom: 4 }}>TOP ŹRÓDŁA</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sourceStats.map((s) => (
              <span key={s.handle} style={{ fontSize: 9, fontFamily: 'monospace', color: '#5DCAA5', background: '#5DCAA511', border: '1px solid #5DCAA530', borderRadius: 3, padding: '2px 6px' }}>
                {s.handle} {s.accuracy_pct != null ? `${s.accuracy_pct}%` : ''} ({s.total_signals})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Signal list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: '#333', fontFamily: 'monospace', fontSize: 11 }}>
            ŁADOWANIE...
          </div>
        )}
        {error && (
          <div style={{ padding: 16, color: '#D85A30', fontFamily: 'monospace', fontSize: 11 }}>⚠ {error}</div>
        )}
        {!loading && !error && signals.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#333', fontFamily: 'monospace', fontSize: 11 }}>
            Brak sygnałów w bazie danych.
          </div>
        )}
        {signals.map((sig) => {
          const outcome = sig.outcome ? OUTCOME_STYLE[sig.outcome] : null;
          const dirColor = DIR_COLOR[sig.direction] ?? '#888';
          const scan = sig.scans;
          return (
            <div
              key={sig.id}
              style={{
                borderBottom: '1px solid #0d0d0d',
                padding: '8px 12px',
                backgroundColor: outcome ? outcome.bg : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', color: dirColor }}>
                    {sig.direction}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#E8E8E0' }}>{sig.asset}</span>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444' }}>[{sig.strength}/10]</span>
                  {sig.platform === 'CRYPTO' && (
                    <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#c084fc', background: '#c084fc15', borderRadius: 3, padding: '1px 4px', border: '1px solid #c084fc30' }}>₿</span>
                  )}
                </div>
                {outcome ? (
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: outcome.color, fontWeight: 'bold' }}>
                    {outcome.label}{sig.pnl_pips != null ? ` ${sig.pnl_pips > 0 ? '+' : ''}${sig.pnl_pips}p` : ''}
                  </span>
                ) : (
                  <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#333' }}>nie oceniono</span>
                )}
              </div>
              {sig.source && (
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#5DCAA5', marginBottom: 2 }}>{sig.source}</div>
              )}
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#555', lineHeight: 1.4 }}
                   dangerouslySetInnerHTML={{ __html: (sig.reason ?? '').slice(0, 120) }} />
              {scan && (
                <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#2a2a2a', marginTop: 3 }}>
                  {scan.uk_date} {scan.uk_time} · {scan.session_name}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
