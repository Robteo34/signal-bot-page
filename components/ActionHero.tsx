'use client';

import { ScanResult } from '@/lib/storage';

const ACTION_COLOR: Record<string, string> = {
  LONG: '#5DCAA5',
  SHORT: '#D85A30',
  WAIT: '#EF9F27',
  EXIT: '#D85A30',
};

interface Props {
  result: ScanResult;
  nextEvent: { label: string; minutes: number };
}

export default function ActionHero({ result, nextEvent }: Props) {
  const color = ACTION_COLOR[result.action] ?? '#888';
  const bars = Math.round(result.signal_strength);
  const filled = bars;
  const empty = 10 - bars;

  return (
    <div className="px-4 py-5" style={{ borderBottom: '1px solid #1A1A1A' }}>
      {/* Question */}
      <div
        className="text-xs tracking-[0.15em] mb-2 font-mono"
        style={{ color: '#555' }}
      >
        CO ROBISZ TERAZ?
      </div>

      {/* Action */}
      <div
        className="text-4xl font-bold font-mono tracking-tight mb-1"
        style={{ color, lineHeight: 1.1 }}
      >
        {result.action}{' '}
        <span style={{ color: '#E8E8E0' }}>{result.primary_asset}</span>
      </div>

      {/* Reason */}
      <div
        className="text-sm font-mono mb-4"
        style={{ color: '#888', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {result.reason}
      </div>

      {/* Signal bar + countdown */}
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5 flex-1">
          {Array.from({ length: filled }).map((_, i) => (
            <div
              key={`f${i}`}
              className="h-2 flex-1 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <div
              key={`e${i}`}
              className="h-2 flex-1 rounded-sm"
              style={{ backgroundColor: '#1A1A1A' }}
            />
          ))}
        </div>
        <div
          className="text-xs font-mono whitespace-nowrap"
          style={{ color: '#555' }}
        >
          {nextEvent.label} za{' '}
          <span style={{ color: '#888' }}>
            {nextEvent.minutes >= 60
              ? `${Math.floor(nextEvent.minutes / 60)}h ${nextEvent.minutes % 60}m`
              : `${nextEvent.minutes}m`}
          </span>
        </div>
      </div>
    </div>
  );
}
