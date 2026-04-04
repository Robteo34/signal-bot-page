'use client';

interface MacroEvent {
  time: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  expected: string;
  affect: string;
}

interface Props {
  events: MacroEvent[];
}

const IMPACT_COLOR = { HIGH: '#D85A30', MEDIUM: '#EF9F27', LOW: '#555' };
const IMPACT_DOT = { HIGH: '●', MEDIUM: '◉', LOW: '○' };

export default function MacroEventsStrip({ events }: Props) {
  if (!events?.length) return null;

  return (
    <div
      style={{
        borderBottom: '1px solid #1A1A1A',
        backgroundColor: '#060606',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        minHeight: 34,
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontFamily: 'monospace',
          color: '#333',
          marginRight: 8,
          flexShrink: 0,
          letterSpacing: '0.1em',
        }}
      >
        MAKRO
      </span>
      {events.map((ev, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            marginRight: 16,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              color: IMPACT_COLOR[ev.impact],
            }}
          >
            {IMPACT_DOT[ev.impact]}
          </span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#555' }}>
            {ev.time}
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              color: ev.impact === 'HIGH' ? '#E8E8E0' : '#888',
              whiteSpace: 'nowrap',
            }}
          >
            {ev.event}
          </span>
          {ev.expected && (
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#444' }}>
              ({ev.expected})
            </span>
          )}
          {i < events.length - 1 && (
            <span style={{ color: '#222', marginLeft: 8 }}>·</span>
          )}
        </div>
      ))}
    </div>
  );
}
