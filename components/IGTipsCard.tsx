'use client';

interface IGTips {
  best_opportunity: string;
  avoid_today: string;
  overnight_positions: string;
  volatility_regime: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Props {
  tips: IGTips;
}

const VOL_COLOR = { HIGH: '#D85A30', MEDIUM: '#EF9F27', LOW: '#5DCAA5' };

export default function IGTipsCard({ tips }: Props) {
  const volColor = VOL_COLOR[tips.volatility_regime] ?? '#888';

  const rows = [
    { icon: '▶', label: 'NAJLEPSZA', value: tips.best_opportunity, color: '#5DCAA5' },
    { icon: '✕', label: 'UNIKAJ', value: tips.avoid_today, color: '#D85A30' },
    { icon: '◑', label: 'OVERNIGHT', value: tips.overnight_positions, color: '#888' },
  ];

  return (
    <div
      style={{
        margin: '0',
        borderBottom: '1px solid #1A1A1A',
        backgroundColor: '#080808',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 6px',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#5DCAA5',
            letterSpacing: '0.12em',
            fontWeight: 'bold',
          }}
        >
          IG TIPS
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            color: volColor,
            border: `1px solid ${volColor}44`,
            borderRadius: 4,
            padding: '2px 6px',
            backgroundColor: volColor + '11',
          }}
        >
          VOL: {tips.volatility_regime}
        </span>
      </div>

      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '6px 12px',
            borderTop: '1px solid #0d0d0d',
            minHeight: 40,
          }}
        >
          <span style={{ fontSize: 11, color: row.color, flexShrink: 0, marginTop: 1 }}>
            {row.icon}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#444', letterSpacing: '0.1em' }}>
              {row.label}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', marginTop: 1 }}>
              {row.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
