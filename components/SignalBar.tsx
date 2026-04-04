'use client';

const DIR_COLOR: Record<string, string> = {
  LONG: '#5DCAA5', SHORT: '#D85A30', WAIT: '#EF9F27', EXIT: '#D85A30',
};
const RISK_COLOR = { HIGH: '#D85A30', MEDIUM: '#EF9F27', LOW: '#5DCAA5' };

interface Props {
  asset: string;
  direction: string;
  strength: number;
  reason?: string;
  platform?: 'IG' | 'CRYPTO' | 'BOTH';
  overnight_risk?: 'HIGH' | 'MEDIUM' | 'LOW';
  onClick?: () => void;
}

export default function SignalBar({ asset, direction, strength, platform, overnight_risk, onClick }: Props) {
  const color = DIR_COLOR[direction.toUpperCase()] ?? '#888';
  const filled = Math.max(0, Math.min(10, Math.round(strength)));
  const empty = 10 - filled;
  const isCrypto = platform === 'CRYPTO';

  return (
    <div
      className="flex items-center gap-2 px-3 font-mono"
      style={{
        minHeight: 56,
        borderBottom: '1px solid #1A1A1A',
        cursor: onClick ? 'pointer' : undefined,
        backgroundColor: isCrypto ? '#0a0814' : undefined,
      }}
      onClick={onClick}
    >
      {/* Platform badge */}
      <div style={{ width: 28, flexShrink: 0 }}>
        {isCrypto ? (
          <span
            style={{
              fontSize: 8,
              fontWeight: 'bold',
              color: '#a855f7',
              border: '1px solid #a855f744',
              borderRadius: 3,
              padding: '1px 3px',
              backgroundColor: '#a855f711',
            }}
          >
            ₿
          </span>
        ) : (
          <span
            style={{
              fontSize: 8,
              fontWeight: 'bold',
              color: '#5DCAA5',
              border: '1px solid #5DCAA544',
              borderRadius: 3,
              padding: '1px 3px',
              backgroundColor: '#5DCAA511',
            }}
          >
            IG
          </span>
        )}
      </div>

      {/* Asset name */}
      <div style={{ width: 76, fontSize: 12, color: isCrypto ? '#a855f7' : '#E8E8E0', flexShrink: 0 }}>
        {asset}
      </div>

      {/* Signal bar */}
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: filled }).map((_, i) => (
          <div key={`f${i}`} className="h-1.5 flex-1 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <div key={`e${i}`} className="h-1.5 flex-1 rounded-sm" style={{ backgroundColor: '#1A1A1A' }} />
        ))}
      </div>

      {/* Direction */}
      <div className="text-xs font-bold" style={{ color, width: 36, textAlign: 'center', flexShrink: 0 }}>
        {direction}
      </div>

      {/* Strength */}
      <div style={{ fontSize: 11, color: filled >= 8 ? color : '#444', width: 18, textAlign: 'right', flexShrink: 0 }}>
        {filled}
      </div>

      {/* Overnight risk dot */}
      {overnight_risk && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: RISK_COLOR[overnight_risk] ?? '#333',
            flexShrink: 0,
          }}
          title={`Overnight risk: ${overnight_risk}`}
        />
      )}
    </div>
  );
}
