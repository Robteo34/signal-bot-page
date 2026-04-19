'use client';

import { useState } from 'react';
import type {
  IntelligenceItem,
  BreakingOsint,
  IntelAccount,
  IntelCategory,
  IntelUrgency,
} from '@/lib/storage';

// ── Visual constants ──────────────────────────────────────────────────────────

const URGENCY_COLOR: Record<IntelUrgency, string> = {
  IMMEDIATE: '#D85A30',
  SOON:      '#EF9F27',
  WATCH:     '#378ADD',
};

// Polish urgency labels as requested
const URGENCY_PL: Record<IntelUrgency, string> = {
  IMMEDIATE: '⚡ NATYCHMIAST/IMMEDIATE',
  SOON:      '◉ WKRÓTCE/SOON',
  WATCH:     '◎ OBSERWUJ/WATCH',
};

const CAT: Record<IntelCategory, { label: string; color: string }> = {
  MILITARY:  { label: '⚔ MIL',  color: '#D85A30' },
  MACRO:     { label: '◎ MAC',  color: '#5DCAA5' },
  EARNINGS:  { label: '◈ ERN',  color: '#EF9F27' },
  OPTIONS:   { label: '◉ OPT',  color: '#c084fc' },
  CRYPTO:    { label: '₿ CRY',  color: '#378ADD' },
  SUPPLY:    { label: '⛽ SUP',  color: '#22d3ee' },
  REGULA:    { label: '⚖ REG',  color: '#a78bfa' },
};

const DIR_COLOR: Record<string, string> = {
  LONG: '#5DCAA5', SHORT: '#D85A30', HEDGE: '#EF9F27',
};

const URGENCY_ORDER: Record<IntelUrgency, number> = {
  IMMEDIATE: 0, SOON: 1, WATCH: 2,
};

// ── Time formatter ────────────────────────────────────────────────────────────

function formatFeedTime(publishedAt?: string, ageMinutesFallback?: number): string {
  let date: Date;
  if (publishedAt) {
    date = new Date(publishedAt);
    if (isNaN(date.getTime())) {
      date = new Date(Date.now() - (ageMinutesFallback ?? 0) * 60000);
    }
  } else if (ageMinutesFallback != null) {
    date = new Date(Date.now() - ageMinutesFallback * 60000);
  } else {
    return 'MSM';
  }
  const now     = new Date();
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);

  if (diffMin < 1) return 'teraz MSM';
  if (diffMin < 60) return `${diffMin}m temu MSM`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 6) {
    const mins = diffMin % 60;
    return mins > 0 ? `${diffHours}h ${mins}m temu MSM` : `${diffHours}h temu MSM`;
  }

  const timeStr   = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return `dzisiaj ${timeStr} MSM`;
  if (date.toDateString() === yesterday.toDateString()) return `wczoraj ${timeStr} MSM`;

  const dateStr = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  return `${dateStr} ${timeStr} MSM`;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function CredDots({ score }: { score: number }) {
  const n = Math.max(1, Math.min(10, Math.round(score)));
  const color = n >= 8 ? '#5DCAA5' : n >= 5 ? '#EF9F27' : '#D85A30';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
            backgroundColor: i < Math.round(n / 2) ? color : '#1A1A1A',
          }}
        />
      ))}
      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', marginLeft: 2 }}>
        {n}/10
      </span>
    </span>
  );
}

function ImpactChips({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {(items ?? []).map((inst, i) => (
        <span
          key={i}
          style={{
            fontSize: 9, fontFamily: 'monospace',
            color: '#5DCAA5', backgroundColor: '#5DCAA511',
            border: '1px solid #5DCAA530', borderRadius: 3, padding: '1px 5px',
          }}
        >
          {inst}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({
  title, count, urgent, color,
}: {
  title: string; count: number; urgent?: number; color: string;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px 5px',
        backgroundColor: '#060606',
        borderBottom: '1px solid #111',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', color, letterSpacing: '0.1em' }}>
          {title}
        </span>
        {urgent ? (
          <span
            style={{
              fontSize: 9, fontFamily: 'monospace', color: '#D85A30',
              backgroundColor: '#D85A3022', border: '1px solid #D85A3044',
              borderRadius: 3, padding: '1px 5px',
            }}
          >
            {urgent} ⚡
          </span>
        ) : null}
      </div>
      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#333' }}>
        {count}
      </span>
    </div>
  );
}

// ── Breaking OSINT item ───────────────────────────────────────────────────────

function BreakingItem({ item }: { item: BreakingOsint }) {
  const urgColor = URGENCY_COLOR[item.urgency] ?? '#555';
  const cat = CAT[item.category] ?? { label: item.category, color: '#888' };
  const dirColor = DIR_COLOR[item.direction] ?? '#888';

  return (
    <div
      style={{
        borderLeft: `3px solid ${urgColor}`,
        borderBottom: '1px solid #0d0d0d',
        padding: '9px 12px 9px 10px',
        backgroundColor: urgColor + '07',
      }}
    >
      {/* Row 1: urgency + category + direction + lead time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', color: urgColor }}>
          {URGENCY_PL[item.urgency]}
        </span>
        <span
          style={{
            fontSize: 9, fontFamily: 'monospace', color: cat.color,
            backgroundColor: cat.color + '18', border: `1px solid ${cat.color}40`,
            borderRadius: 3, padding: '1px 5px',
          }}
        >
          {cat.label}
        </span>
        <span
          style={{
            fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', color: dirColor,
            backgroundColor: dirColor + '15', border: `1px solid ${dirColor}40`,
            borderRadius: 3, padding: '1px 5px',
          }}
        >
          {item.direction}
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#555', marginLeft: 'auto' }}>
          {formatFeedTime(item.published_at, item.newsapi_age_minutes)}
        </span>
      </div>

      {/* Account + post summary */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: urgColor, fontWeight: 'bold', flexShrink: 0 }}>
          {item.account}
        </span>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#E8E8E0', lineHeight: 1.3 }}>
          {item.post_summary}
        </span>
      </div>

      {/* Impact + credibility */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <ImpactChips items={item.market_impact} />
        <CredDots score={item.credibility} />
      </div>
    </div>
  );
}

// ── Discovered account card ───────────────────────────────────────────────────

function AccountCard({ acc }: { acc: IntelAccount }) {
  const cat = CAT[acc.category] ?? { label: acc.category, color: '#888' };

  return (
    <div
      style={{
        borderBottom: '1px solid #0d0d0d',
        padding: '9px 12px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {/* Handle + cred */}
      <div style={{ flexShrink: 0, width: 100 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#22d3ee', fontWeight: 'bold' }}>
          {acc.handle}
        </div>
        <span
          style={{
            fontSize: 8, fontFamily: 'monospace', color: cat.color,
            backgroundColor: cat.color + '15', border: `1px solid ${cat.color}30`,
            borderRadius: 3, padding: '1px 4px', display: 'inline-block', marginTop: 3,
          }}
        >
          {cat.label}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#888', marginBottom: 3 }}>
          {acc.reason}
        </div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#555', fontStyle: 'italic' }}>
          {acc.todays_signal}
        </div>
      </div>

      {/* Credibility */}
      <div style={{ flexShrink: 0 }}>
        <CredDots score={acc.credibility} />
      </div>
    </div>
  );
}

// ── Deep intel item ───────────────────────────────────────────────────────────

function IntelItem({ item }: { item: IntelligenceItem }) {
  const urgColor = URGENCY_COLOR[item.urgency] ?? '#555';
  const cat = CAT[item.category] ?? { label: item.category, color: '#888' };
  const dirColor = DIR_COLOR[item.direction] ?? '#888';

  return (
    <div
      style={{
        borderLeft: `2px solid ${urgColor}`,
        borderBottom: '1px solid #0d0d0d',
        padding: '9px 12px 9px 10px',
        backgroundColor: urgColor + '06',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', color: urgColor }}>
          {URGENCY_PL[item.urgency]}
        </span>
        <span
          style={{
            fontSize: 9, fontFamily: 'monospace', color: cat.color,
            backgroundColor: cat.color + '18', border: `1px solid ${cat.color}40`,
            borderRadius: 3, padding: '1px 5px',
          }}
        >
          {cat.label}
        </span>
        <span
          style={{
            fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', color: dirColor,
            backgroundColor: dirColor + '15', border: `1px solid ${dirColor}40`,
            borderRadius: 3, padding: '1px 5px',
          }}
        >
          {item.direction}
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444', marginLeft: 'auto' }}>
          {formatFeedTime(item.published_at, item.newsapi_age_minutes)}
        </span>
      </div>

      <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#E8E8E0', marginBottom: 4, lineHeight: 1.4 }}>
        {item.summary}
      </div>
      <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#555', marginBottom: 6, lineHeight: 1.4 }}>
        {item.signal}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <ImpactChips items={item.market_impact} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#333' }}>{item.source}</span>
          <CredDots score={item.credibility} />
        </div>
      </div>
    </div>
  );
}

// ── Category legend ───────────────────────────────────────────────────────────

function Legend() {
  return (
    <div
      style={{
        display: 'flex', gap: 10, padding: '4px 12px',
        backgroundColor: '#060606', borderBottom: '1px solid #0d0d0d',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}
    >
      {Object.entries(CAT).map(([, val]) => (
        <span
          key={val.label}
          style={{ fontSize: 8, fontFamily: 'monospace', color: val.color, whiteSpace: 'nowrap' }}
        >
          {val.label}
        </span>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  items?: IntelligenceItem[];
  breaking?: BreakingOsint[];
  accounts?: IntelAccount[];
}

export default function IntelligenceFeed({ items, breaking, accounts }: Props) {
  const [showAccounts, setShowAccounts] = useState(false);

  const hasBreaking = breaking && breaking.length > 0;
  const hasItems    = items && items.length > 0;
  const hasAccounts = accounts && accounts.length > 0;

  if (!hasBreaking && !hasItems && !hasAccounts) return null;

  const sortedBreaking = hasBreaking
    ? [...breaking].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency])
    : [];
  const sortedItems = hasItems
    ? [...items].sort((a, b) => {
        const u = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
        return u !== 0 ? u : b.credibility - a.credibility;
      })
    : [];

  const immediateCount = [
    ...sortedBreaking.filter((i) => i.urgency === 'IMMEDIATE'),
    ...sortedItems.filter((i) => i.urgency === 'IMMEDIATE'),
  ].length;

  return (
    <div style={{ borderBottom: '1px solid #1A1A1A' }}>
      {/* Master header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px 6px', backgroundColor: '#040404',
          borderBottom: '1px solid #111',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold',
              color: immediateCount > 0 ? '#D85A30' : '#888',
              letterSpacing: '0.12em',
            }}
          >
            INTELLIGENCE FEED
          </span>
          {immediateCount > 0 && (
            <span
              style={{
                fontSize: 9, fontFamily: 'monospace', color: '#D85A30',
                backgroundColor: '#D85A3022', border: '1px solid #D85A3044',
                borderRadius: 3, padding: '1px 5px',
              }}
            >
              {immediateCount} ⚡
            </span>
          )}
        </div>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#333' }}>
          {sortedBreaking.length + sortedItems.length} signals
        </span>
      </div>

      <Legend />

      {/* ── Section 1: Breaking OSINT (named accounts, last 2h) ─────────── */}
      {hasBreaking && (
        <>
          <SectionHeader
            title="BREAKING — VERIFIED ACCOUNTS (2H)"
            count={sortedBreaking.length}
            urgent={sortedBreaking.filter((i) => i.urgency === 'IMMEDIATE').length}
            color="#D85A30"
          />
          {sortedBreaking.map((item, i) => (
            <BreakingItem key={i} item={item} />
          ))}
        </>
      )}

      {/* ── Section 2: Deep intelligence analysis ───────────────────────── */}
      {hasItems && (
        <>
          <SectionHeader
            title="ANALIZA DEEP INTEL"
            count={sortedItems.length}
            urgent={sortedItems.filter((i) => i.urgency === 'IMMEDIATE').length}
            color="#888"
          />
          {sortedItems.map((item, i) => (
            <IntelItem key={i} item={item} />
          ))}
        </>
      )}

      {/* ── Section 3: Discovered accounts (collapsible) ─────────────────── */}
      {hasAccounts && (
        <>
          <button
            onClick={() => setShowAccounts((v) => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '7px 12px 5px',
              backgroundColor: '#060606', borderBottom: '1px solid #111',
              border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', color: '#22d3ee', letterSpacing: '0.1em' }}>
              ODKRYTE KONTA — WARTO ŚLEDZIĆ
            </span>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#333' }}>
              {accounts.length}  {showAccounts ? '▲' : '▼'}
            </span>
          </button>
          {showAccounts && accounts.map((acc, i) => (
            <AccountCard key={i} acc={acc} />
          ))}
        </>
      )}
    </div>
  );
}
