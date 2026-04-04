'use client';

const DIR_COLOR: Record<string, string> = {
  LONG: '#5DCAA5',
  SHORT: '#D85A30',
  WAIT: '#EF9F27',
  EXIT: '#D85A30',
};

interface Props {
  asset: string;
  direction: string;
  strength: number;
  reason?: string;
  onClick?: () => void;
}

export default function SignalBar({ asset, direction, strength, reason, onClick }: Props) {
  const color = DIR_COLOR[direction.toUpperCase()] ?? '#888';
  const filled = Math.max(0, Math.min(10, Math.round(strength)));
  const empty = 10 - filled;

  return (
    <div
      className="flex items-center gap-3 px-4 font-mono"
      style={{
        minHeight: 56,
        borderBottom: '1px solid #1A1A1A',
        cursor: onClick ? 'pointer' : undefined,
      }}
      onClick={onClick}
    >
      {/* Asset */}
      <div className="w-20 text-sm" style={{ color: '#E8E8E0' }}>
        {asset}
      </div>

      {/* Bar */}
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: filled }).map((_, i) => (
          <div
            key={`f${i}`}
            className="h-1.5 flex-1 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <div
            key={`e${i}`}
            className="h-1.5 flex-1 rounded-sm"
            style={{ backgroundColor: '#1A1A1A' }}
          />
        ))}
      </div>

      {/* Direction */}
      <div
        className="text-xs font-bold w-10 text-center"
        style={{ color }}
      >
        {direction}
      </div>

      {/* Strength */}
      <div
        className="text-xs w-5 text-right"
        style={{ color: filled >= 8 ? color : '#555' }}
      >
        [{filled}]
      </div>
    </div>
  );
}
