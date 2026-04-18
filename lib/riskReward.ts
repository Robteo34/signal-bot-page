interface SignalLevels {
  action: string;
  entry: string | number;
  stop: string | number;
  target: string | number;
}

export interface RRResult {
  rr: number | null;
  valid: boolean;
  reason: string;
}

function parseNum(v: string | number): number | null {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (!v) return null;
  const match = String(v).match(/[\d,]+\.?\d*/);
  if (!match) return null;
  const num = parseFloat(match[0].replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

export function calculateRR(signal: SignalLevels): RRResult {
  const entry  = parseNum(signal.entry);
  const stop   = parseNum(signal.stop);
  const target = parseNum(signal.target);

  if (entry === null || stop === null || target === null) {
    return { rr: null, valid: false, reason: 'missing levels' };
  }

  const action = signal.action.toUpperCase();
  let risk: number, reward: number;

  if (action === 'LONG') {
    risk   = entry - stop;
    reward = target - entry;
  } else if (action === 'SHORT') {
    risk   = stop - entry;
    reward = entry - target;
  } else {
    return { rr: null, valid: false, reason: `action=${action} not LONG/SHORT` };
  }

  if (risk <= 0) {
    return { rr: null, valid: false, reason: `invalid stop: risk=${risk.toFixed(4)}` };
  }
  if (reward <= 0) {
    return { rr: null, valid: false, reason: `invalid target: reward=${reward.toFixed(4)}` };
  }

  const rr = reward / risk;
  return {
    rr,
    valid:  rr >= 1.5,
    reason: rr < 1.5 ? `R:R ${rr.toFixed(2)} < 1.5 minimum` : `R:R ${rr.toFixed(2)} OK`,
  };
}
