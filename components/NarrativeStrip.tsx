'use client';

interface Props {
  text: string;
  sessionPlan?: string;
}

export default function NarrativeStrip({ text, sessionPlan }: Props) {
  return (
    <div
      className="px-4 py-3 font-mono"
      style={{
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid #1A1A1A',
      }}
    >
      <div className="text-xs mb-0.5" style={{ color: '#444' }}>
        NARRACJA
      </div>
      <div className="text-sm" style={{ color: '#888' }}>
        {text || '—'}
      </div>
      {sessionPlan && (
        <div className="text-xs mt-1" style={{ color: '#444' }}>
          Plan: {sessionPlan}
        </div>
      )}
    </div>
  );
}
