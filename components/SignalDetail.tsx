'use client';

import { ScanResult } from '@/lib/storage';

const ACTION_COLOR: Record<string, string> = {
  LONG: '#5DCAA5',
  SHORT: '#D85A30',
  WAIT: '#EF9F27',
  EXIT: '#D85A30',
};

interface Props {
  signal: ScanResult['signals'][0] & {
    entry?: string;
    stop?: string;
    target?: string;
  };
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  total: number;
}

export default function SignalDetail({
  signal,
  onClose,
  onPrev,
  onNext,
  currentIndex,
  total,
}: Props) {
  const color = ACTION_COLOR[signal.direction?.toUpperCase()] ?? '#888';
  const filled = Math.max(0, Math.min(10, Math.round(signal.strength)));
  const empty = 10 - filled;

  const rows = [
    { label: 'Kierunek', value: signal.direction, color },
    { label: 'Siła sygnału', value: `${signal.strength}/10`, color: filled >= 7 ? color : '#888' },
    { label: 'Powód', value: signal.reason || '—', color: '#888' },
    ...(signal.entry ? [{ label: 'Entry', value: signal.entry, color: '#E8E8E0' }] : []),
    ...(signal.stop ? [{ label: 'Stop', value: signal.stop, color: '#D85A30' }] : []),
    ...(signal.target ? [{ label: 'Target', value: signal.target, color: '#5DCAA5' }] : []),
  ];

  return (
    <div
      className="flex flex-col h-full font-mono"
      style={{ backgroundColor: '#050505', color: '#E8E8E0' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1A1A1A' }}
      >
        <button
          className="text-sm"
          style={{ color: '#555', minHeight: 44, minWidth: 44 }}
          onClick={onClose}
        >
          ← Wróć
        </button>
        <span className="text-sm" style={{ color: '#555' }}>
          {currentIndex + 1} / {total}
        </span>
        <div className="flex gap-2">
          <button
            className="text-sm px-2"
            style={{ color: '#555', minHeight: 44, minWidth: 44 }}
            onClick={onPrev}
          >
            ‹
          </button>
          <button
            className="text-sm px-2"
            style={{ color: '#555', minHeight: 44, minWidth: 44 }}
            onClick={onNext}
          >
            ›
          </button>
        </div>
      </div>

      {/* Asset name */}
      <div className="px-4 pt-6 pb-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
        <div className="text-xs mb-1" style={{ color: '#555' }}>
          ASSET
        </div>
        <div className="text-3xl font-bold" style={{ color: '#E8E8E0' }}>
          {signal.asset}
        </div>
        <div className="text-xl font-bold mt-1" style={{ color }}>
          {signal.direction}
        </div>
      </div>

      {/* Signal bar */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
        <div className="text-xs mb-2" style={{ color: '#555' }}>
          SIŁA SYGNAŁU
        </div>
        <div className="flex gap-1 mb-1">
          {Array.from({ length: filled }).map((_, i) => (
            <div
              key={`f${i}`}
              className="h-3 flex-1 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <div
              key={`e${i}`}
              className="h-3 flex-1 rounded-sm"
              style={{ backgroundColor: '#1A1A1A' }}
            />
          ))}
        </div>
        <div className="text-2xl font-bold" style={{ color: filled >= 7 ? color : '#555' }}>
          {signal.strength} / 10
        </div>
      </div>

      {/* Detail rows */}
      <div className="flex-1">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-4"
            style={{ borderBottom: '1px solid #0d0d0d', minHeight: 56 }}
          >
            <div className="text-xs" style={{ color: '#444' }}>
              {row.label}
            </div>
            <div className="text-sm font-bold" style={{ color: row.color }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>

      {/* Nav hint */}
      <div
        className="px-4 py-4 text-center text-xs"
        style={{ color: '#333', borderTop: '1px solid #1A1A1A' }}
      >
        ‹ poprzedni asset · następny ›
      </div>
    </div>
  );
}
