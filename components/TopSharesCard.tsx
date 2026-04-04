'use client';

import { useState } from 'react';
import type { ShareOpportunity } from '@/lib/storage';

interface Props {
  uk: ShareOpportunity[];
  us: ShareOpportunity[];
  eu: ShareOpportunity[];
}

type Tab = 'uk' | 'us' | 'eu';

const DIR_COLOR: Record<string, string> = { LONG: '#5DCAA5', SHORT: '#D85A30' };

export default function TopSharesCard({ uk, us, eu }: Props) {
  const [tab, setTab] = useState<Tab>('uk');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'uk', label: 'UK', count: uk?.length ?? 0 },
    { key: 'us', label: 'US', count: us?.length ?? 0 },
    { key: 'eu', label: 'EU', count: eu?.length ?? 0 },
  ];

  const rows = tab === 'uk' ? uk : tab === 'us' ? us : eu;

  return (
    <div style={{ borderBottom: '1px solid #1A1A1A' }}>
      {/* Header + tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 0',
        }}
      >
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', letterSpacing: '0.12em' }}>
          TOP AKCJE
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: tab === t.key ? 'bold' : 'normal',
                color: tab === t.key ? '#E8E8E0' : '#444',
                backgroundColor: tab === t.key ? '#1A1A1A' : 'transparent',
                border: `1px solid ${tab === t.key ? '#333' : 'transparent'}`,
                borderRadius: 4,
                padding: '3px 8px',
                minHeight: 28,
                cursor: 'pointer',
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ color: '#555', marginLeft: 3 }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      {(!rows || rows.length === 0) ? (
        <div style={{ padding: '12px', fontSize: 11, fontFamily: 'monospace', color: '#333', textAlign: 'center' }}>
          Brak okazji
        </div>
      ) : (
        rows.map((s, i) => {
          const color = DIR_COLOR[s.direction] ?? '#888';
          const bars = Math.max(0, Math.min(10, s.strength ?? 0));
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderTop: '1px solid #0d0d0d',
                minHeight: 52,
              }}
            >
              {/* Ticker */}
              <div style={{ width: 52, flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', color: '#E8E8E0' }}>
                  {s.ticker}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color,
                    marginTop: 1,
                  }}
                >
                  {s.direction}
                </div>
              </div>

              {/* Name + catalyst */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: '#888',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: '#444',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}
                >
                  {s.catalyst}
                </div>
              </div>

              {/* Strength mini-bar */}
              <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <div
                    key={j}
                    style={{
                      width: 4,
                      height: 14,
                      borderRadius: 2,
                      backgroundColor: j < Math.round(bars / 2) ? color : '#1A1A1A',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
