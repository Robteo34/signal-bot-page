'use client';

import { Session } from '@/lib/sessions';

interface Props {
  session: Session;
  timeStr: string;   // "10:42 BST"
  dateStr: string;   // "Fri 04 Apr 2026"
  nextEvent: { label: string; minutes: number };
}

export default function SessionHeader({ session, timeStr, dateStr, nextEvent }: Props) {
  const isOverlap = session.name === 'OVERLAP';

  return (
    <div
      style={{
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid #1A1A1A',
        flexShrink: 0,
      }}
    >
      {/* Row 1 — date bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px 2px',
          borderBottom: '1px solid #111',
        }}
      >
        {/* Full date — prominent so trader can verify */}
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#5DCAA5',
            fontWeight: 'bold',
            letterSpacing: '0.04em',
          }}
        >
          {dateStr}
        </span>

        {/* Next event countdown */}
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#444' }}>
          {nextEvent.label}{' '}
          <span style={{ color: '#555' }}>
            {nextEvent.minutes >= 60
              ? `${Math.floor(nextEvent.minutes / 60)}h${nextEvent.minutes % 60}m`
              : `${nextEvent.minutes}m`}
          </span>
        </span>
      </div>

      {/* Row 2 — time + session badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px 5px',
        }}
      >
        {/* Time */}
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#E8E8E0',
            fontWeight: 'bold',
          }}
        >
          {timeStr}
        </span>

        {/* Session badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOverlap && (
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#D85A30',
                animation: 'pulse-dot 1s ease-in-out infinite',
              }}
            />
          )}
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              color: session.color,
              backgroundColor: session.color + '18',
              border: `1px solid ${session.color}40`,
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {isOverlap ? 'OVERLAP ◉ LIVE' : session.label}
          </span>
          {session.priority === 'HIGH' && !isOverlap && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#EF9F27' }}>
              ▲ HIGH
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
