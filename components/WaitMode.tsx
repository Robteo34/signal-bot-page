'use client';

import { ScanResult } from '@/lib/storage';

interface Props {
  patientStreak: number;
  nextEvent: { label: string; minutes: number };
  narrative: string;
  signals: ScanResult['signals'];
}

export default function WaitMode({ patientStreak, nextEvent, narrative, signals }: Props) {
  const bestSignal = signals.reduce(
    (best, s) => (s.strength > (best?.strength ?? 0) ? s : best),
    signals[0]
  );

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 font-mono">
      {/* Main CZEKASZ */}
      <div
        className="text-5xl font-bold tracking-widest mb-2 text-center"
        style={{ color: '#EF9F27' }}
      >
        CZEKASZ
      </div>

      {/* Narrative */}
      <div
        className="text-sm text-center mb-8"
        style={{ color: '#888', maxWidth: '100%' }}
      >
        {narrative}
      </div>

      {/* Patience streak */}
      <div
        className="px-6 py-4 rounded-lg mb-6 text-center w-full"
        style={{ backgroundColor: '#111', border: '1px solid #1A1A1A' }}
      >
        <div className="text-3xl font-bold mb-1" style={{ color: '#EF9F27' }}>
          🔥 Streak: {patientStreak}
        </div>
        <div className="text-xs" style={{ color: '#555' }}>
          nie wszedłeś w słabe sygnały
        </div>
      </div>

      {/* Next opportunity */}
      <div
        className="px-4 py-3 rounded-lg w-full text-center mb-4"
        style={{ backgroundColor: '#0a0a0a', border: '1px solid #1A1A1A' }}
      >
        <div className="text-xs mb-1" style={{ color: '#555' }}>
          NASTĘPNA OKAZJA
        </div>
        <div className="text-lg font-bold" style={{ color: '#888' }}>
          {nextEvent.label}
        </div>
        <div className="text-2xl font-bold" style={{ color: '#E8E8E0' }}>
          {nextEvent.minutes >= 60
            ? `${Math.floor(nextEvent.minutes / 60)}h ${nextEvent.minutes % 60}m`
            : `${nextEvent.minutes}m`}
        </div>
      </div>

      {/* Best current signal (for info only) */}
      {bestSignal && bestSignal.strength > 0 && (
        <div className="text-xs text-center" style={{ color: '#444' }}>
          Najsilniejszy sygnał: {bestSignal.asset} [{bestSignal.strength}/10]
        </div>
      )}

      {/* Swipe hint */}
      <div className="mt-8 text-xs text-center" style={{ color: '#333' }}>
        swipe ↓ nowy skan
      </div>
    </div>
  );
}
