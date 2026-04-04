'use client';

interface CryptoAsset {
  price: string;
  direction: string;
  key_level: string;
  note: string;
}

interface Props {
  btc: CryptoAsset;
  eth: CryptoAsset;
}

const DIR_COLOR: Record<string, string> = {
  LONG: '#5DCAA5', SHORT: '#D85A30', WAIT: '#EF9F27',
};

export default function CryptoSection({ btc, eth }: Props) {
  const assets = [
    { symbol: 'BTC/USD', data: btc },
    { symbol: 'ETH/USD', data: eth },
  ];

  return (
    <div style={{ borderBottom: '1px solid #1A1A1A' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 4px',
        }}
      >
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#a855f7', letterSpacing: '0.12em' }}>
          CRYPTO
        </span>
        <span
          style={{
            fontSize: 8,
            fontFamily: 'monospace',
            color: '#555',
            border: '1px solid #333',
            borderRadius: 3,
            padding: '1px 5px',
          }}
        >
          nie na IG
        </span>
      </div>

      {assets.map(({ symbol, data }) => {
        const color = DIR_COLOR[data?.direction?.toUpperCase()] ?? '#888';
        return (
          <div
            key={symbol}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderTop: '1px solid #0d0d0d',
              minHeight: 52,
              backgroundColor: '#0a0814',
            }}
          >
            {/* Purple crypto badge */}
            <span
              style={{
                fontSize: 8,
                fontWeight: 'bold',
                color: '#a855f7',
                border: '1px solid #a855f744',
                borderRadius: 3,
                padding: '1px 4px',
                backgroundColor: '#a855f711',
                flexShrink: 0,
              }}
            >
              ₿
            </span>

            {/* Symbol */}
            <div style={{ width: 68, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#a855f7', fontWeight: 'bold' }}>
                {symbol}
              </div>
            </div>

            {/* Price */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#E8E8E0', fontWeight: 'bold' }}>
                {data?.price || '—'}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#444', marginTop: 1 }}>
                Level: {data?.key_level || '—'}
              </div>
            </div>

            {/* Direction */}
            <div
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color,
                flexShrink: 0,
                width: 36,
                textAlign: 'center',
              }}
            >
              {data?.direction || '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
