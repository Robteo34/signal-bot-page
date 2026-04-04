'use client';

import type { IntelligenceItem, IntelCategory, IntelUrgency } from '@/lib/storage';

// ── Visual config ─────────────────────────────────────────────────────────────

const URGENCY_COLOR: Record<IntelUrgency, string> = {
  IMMEDIATE: '#D85A30',
  SOON:      '#EF9F27',
  WATCH:     '#378ADD',
};

const URGENCY_LABEL: Record<IntelUrgency, string> = {
  IMMEDIATE: '⚡ IMMEDIATE',
  SOON:      '◉ SOON',
  WATCH:     '◎ WATCH',
};

const CATEGORY_TAG: Record<IntelCategory, { label: string; color: string }> = {
  MILITARY_OSINT:     { label: '⚔ MIL',  color: '#D85A30' },
  COMMODITY_PHYSICAL: { label: '⛽ COM',  color: '#EF9F27' },
  ESCALATION_LADDER:  { label: '▲ ESC',  color: '#c084fc' },
  WHALE_INTEL:        { label: '◈ WHR',  color: '#378ADD' },
  POLISH_CEE:         { label: '◆ CEE',  color: '#5DCAA5' },
};

const DIR_COLOR: Record<string, string> = {
  LONG: '#5DCAA5', SHORT: '#D85A30', HEDGE: '#EF9F27',
};

// ── Credibility dots ──────────────────────────────────────────────────────────

function CredibilityDots({ score }: { score: number }) {
  const n = Math.max(1, Math.min(10, Math.round(score)));
  const color = n >= 8 ? '#5DCAA5' : n >= 5 ? '#EF9F27' : '#D85A30';
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: i < Math.round(n / 2) ? color : '#1A1A1A',
          }}
        />
      ))}
      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', marginLeft: 2 }}>
        {n}/10
      </span>
    </div>
  );
}

// ── Single item ───────────────────────────────────────────────────────────────

function IntelItem({ item }: { item: IntelligenceItem }) {
  const urgColor = URGENCY_COLOR[item.urgency] ?? '#555';
  const cat = CATEGORY_TAG[item.category] ?? { label: item.category, color: '#888' };
  const dirColor = DIR_COLOR[item.direction] ?? '#888';

  return (
    <div
      style={{
        borderLeft: `2px solid ${urgColor}`,
        borderBottom: '1px solid #0d0d0d',
        padding: '10px 12px 10px 10px',
        backgroundColor: urgColor + '08',
      }}
    >
      {/* Row 1: urgency + category + direction + lead time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: urgColor,
            letterSpacing: '0.06em',
          }}
        >
          {URGENCY_LABEL[item.urgency]}
        </span>

        <span
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            color: cat.color,
            backgroundColor: cat.color + '18',
            border: `1px solid ${cat.color}40`,
            borderRadius: 3,
            padding: '1px 5px',
          }}
        >
          {cat.label}
        </span>

        <span
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: dirColor,
            backgroundColor: dirColor + '15',
            border: `1px solid ${dirColor}40`,
            borderRadius: 3,
            padding: '1px 5px',
          }}
        >
          {item.direction}
        </span>

        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', marginLeft: 'auto' }}>
          -{item.lead_time_hours}h MSM
        </span>
      </div>

      {/* Row 2: summary (Polish) */}
      <div
        style={{
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#E8E8E0',
          marginBottom: 5,
          lineHeight: 1.4,
        }}
      >
        {item.summary}
      </div>

      {/* Row 3: signal detail */}
      <div
        style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#666',
          marginBottom: 6,
          lineHeight: 1.4,
        }}
      >
        {item.signal}
      </div>

      {/* Row 4: market impact chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {(item.market_impact ?? []).map((inst, i) => (
          <span
            key={i}
            style={{
              fontSize: 9,
              fontFamily: 'monospace',
              color: '#5DCAA5',
              backgroundColor: '#5DCAA511',
              border: '1px solid #5DCAA530',
              borderRadius: 3,
              padding: '1px 5px',
            }}
          >
            {inst}
          </span>
        ))}
      </div>

      {/* Row 5: source + credibility */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444' }}>
          {item.source}
        </span>
        <CredibilityDots score={item.credibility} />
      </div>
    </div>
  );
}

// ── Feed container ────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<IntelUrgency, number> = { IMMEDIATE: 0, SOON: 1, WATCH: 2 };

interface Props {
  items: IntelligenceItem[];
}

export default function IntelligenceFeed({ items }: Props) {
  if (!items?.length) return null;

  // Sort by urgency first, then credibility descending
  const sorted = [...items].sort((a, b) => {
    const uDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    return uDiff !== 0 ? uDiff : b.credibility - a.credibility;
  });

  const immediateCount = sorted.filter((i) => i.urgency === 'IMMEDIATE').length;

  return (
    <div style={{ borderBottom: '1px solid #1A1A1A' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 6px',
          backgroundColor: '#060606',
          borderBottom: '1px solid #111',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'monospace',
              color: immediateCount > 0 ? '#D85A30' : '#888',
              fontWeight: 'bold',
              letterSpacing: '0.12em',
            }}
          >
            INTELLIGENCE FEED
          </span>
          {immediateCount > 0 && (
            <span
              style={{
                fontSize: 9,
                fontFamily: 'monospace',
                color: '#D85A30',
                backgroundColor: '#D85A3022',
                border: '1px solid #D85A3044',
                borderRadius: 3,
                padding: '1px 5px',
                animation: 'pulse-dot 1s ease-in-out infinite',
              }}
            >
              {immediateCount} IMMEDIATE
            </span>
          )}
        </div>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#333' }}>
          {sorted.length} signal{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Legend row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '4px 12px',
          backgroundColor: '#060606',
          borderBottom: '1px solid #0d0d0d',
        }}
      >
        {Object.entries(CATEGORY_TAG).map(([key, val]) => (
          <span
            key={key}
            style={{ fontSize: 8, fontFamily: 'monospace', color: val.color, whiteSpace: 'nowrap' }}
          >
            {val.label}
          </span>
        ))}
      </div>

      {/* Items */}
      {sorted.map((item, i) => (
        <IntelItem key={i} item={item} />
      ))}
    </div>
  );
}
