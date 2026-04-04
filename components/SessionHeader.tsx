'use client';

import { Session } from '@/lib/sessions';

interface Props {
  session: Session;
  timeStr: string;
  nextEvent: { label: string; minutes: number };
}

export default function SessionHeader({ session, timeStr, nextEvent }: Props) {
  const isOverlap = session.name === 'OVERLAP';

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-xs font-mono"
      style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid #1A1A1A', minHeight: 40 }}
    >
      {/* Time */}
      <span style={{ color: '#888' }}>{timeStr}</span>

      {/* Session badge */}
      <div className="flex items-center gap-1.5">
        {isOverlap && (
          <span
            className="inline-block w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#D85A30' }}
          />
        )}
        <span
          className="px-2 py-0.5 rounded text-xs font-bold tracking-wider"
          style={{
            backgroundColor: session.color + '22',
            color: session.color,
            border: `1px solid ${session.color}44`,
          }}
        >
          {isOverlap ? 'OVERLAP ◉ LIVE' : session.label}
        </span>
        {session.priority === 'HIGH' && !isOverlap && (
          <span style={{ color: '#EF9F27', fontSize: 10 }}>▲ HIGH</span>
        )}
      </div>

      {/* Next event countdown */}
      <span style={{ color: '#555', fontSize: 10 }}>
        {nextEvent.label} {nextEvent.minutes}m
      </span>
    </div>
  );
}
