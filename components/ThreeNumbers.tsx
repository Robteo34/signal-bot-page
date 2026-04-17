'use client';

interface PriceData {
  btc: number | null;
  gbpusd: number | null;
  spx: number | null;
  eth: number | null;
  ftse: number | null;
  gold: number | null;
  vix: number | null;
}

interface Props {
  prices: PriceData | null;
  sessionName: string;
}

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return '—';
  return n.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getThree(prices: PriceData | null, sessionName: string) {
  if (!prices) {
    return [
      { value: '—', label: 'Gold' },
      { value: '—', label: 'GBP/USD' },
      { value: '—', label: 'SPX' },
    ];
  }

  const isAsiaOrLondon = ['ASIA_OVERNIGHT', 'PRE_LONDON', 'LONDON'].includes(sessionName);
  const isEvening = ['EVENING_JOURNAL', 'NIGHT_MODE'].includes(sessionName);

  if (isAsiaOrLondon) {
    return [
      {
        value: fmt(prices.gold),
        label: 'Gold',
              },
      {
        value: fmt(prices.gbpusd, 4),
        label: 'GBP/USD',
              },
      {
        value: fmt(prices.ftse),
        label: 'FTSE100',
              },
    ];
  }

  if (isEvening) {
    return [
      {
        value: fmt(prices.spx),
        label: 'SPX',
              },
      {
        value: fmt(prices.gold),
        label: 'Gold',
              },
      {
        value: fmt(prices.vix, 2),
        label: 'VIX',
              },
    ];
  }

  // US sessions / overlap
  return [
    {
      value: fmt(prices.gold),
      label: 'Gold',
          },
    {
      value: fmt(prices.gbpusd, 4),
      label: 'GBP/USD',
          },
    {
      value: fmt(prices.spx),
      label: 'SPX FUT',
          },
  ];
}

export default function ThreeNumbers({ prices, sessionName }: Props) {
  const three = getThree(prices, sessionName);

  return (
    <div
      className="grid grid-cols-3 font-mono"
      style={{ borderBottom: '1px solid #1A1A1A' }}
    >
      {three.map((item, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center py-4"
          style={{
            borderRight: i < 2 ? '1px solid #1A1A1A' : undefined,
          }}
        >
          <div
            className="text-xl font-bold tracking-tight"
            style={{ color: '#E8E8E0' }}
          >
            {item.value}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#555' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
