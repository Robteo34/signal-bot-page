export interface Trade {
  id: string;
  asset: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  entry: number;
  exit?: number;
  timestamp: number;
  closed: boolean;
  pnl?: number;
  outcome?: 'WIN' | 'LOSS';
}

export interface SignalRecord {
  id: string;
  asset: string;
  direction: 'LONG' | 'SHORT' | 'WAIT' | 'EXIT';
  strength: number;
  timestamp: number;
  session: string;
  outcome?: 'CORRECT' | 'WRONG';
}

export interface ScanSignal {
  asset: string;
  direction: string;
  strength: number;
  entry?: string;
  stop?: string;
  target?: string;
  reason: string;
  platform?: 'IG' | 'CRYPTO' | 'BOTH';
  overnight_risk?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ShareOpportunity {
  ticker: string;
  name: string;
  direction: string;
  catalyst: string;
  strength: number;
}

export interface MacroEvent {
  time: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  expected: string;
  affect: string;
}

export interface ScanResult {
  action: 'LONG' | 'SHORT' | 'WAIT' | 'EXIT';
  primary_asset: string;
  signal_strength: number;
  entry: string;
  stop: string;
  target: string;
  reason: string;
  narrative: string;
  session_plan: string;
  wait_mode_reason?: string;
  signals: ScanSignal[];
  x_sentiment?: {
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    trending_topics: string[];
    key_tweet_insight: string;
  };
  top_shares?: {
    uk: ShareOpportunity[];
    us: ShareOpportunity[];
    eu: ShareOpportunity[];
  };
  macro_events_today?: MacroEvent[];
  ig_tips?: {
    best_opportunity: string;
    avoid_today: string;
    overnight_positions: string;
    volatility_regime: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  crypto_update?: {
    btc: { price: string; direction: string; key_level: string; note: string };
    eth: { price: string; direction: string; key_level: string; note: string };
  };
  countdown_event: { label: string; minutes: number };
  // legacy / optional
  macro_context?: {
    risk_mood: string;
    dxy_bias: string;
    vix_level: string;
    boe_stance: string;
    fed_stance: string;
    key_level_watch: string;
  };
}

export interface AppState {
  trades: Trade[];
  signals: SignalRecord[];
  patientStreak: number;
  lastScan: number | null;
  lastScanResult: ScanResult | null;
  visitCount: number;
}

const KEY = 'signal_bot_v4';

function defaultState(): AppState {
  return { trades: [], signals: [], patientStreak: 0, lastScan: null, lastScanResult: null, visitCount: 0 };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch { return defaultState(); }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function incrementVisitCount(): number {
  const state = loadState();
  state.visitCount = (state.visitCount || 0) + 1;
  saveState(state);
  return state.visitCount;
}

export function addTrade(trade: Omit<Trade, 'id' | 'timestamp' | 'closed'>): Trade {
  const state = loadState();
  const newTrade: Trade = { ...trade, id: Date.now().toString(), timestamp: Date.now(), closed: false };
  state.trades = [newTrade, ...state.trades];
  saveState(state);
  return newTrade;
}

export function closeTrade(id: string, exitPrice: number): void {
  const state = loadState();
  state.trades = state.trades.map((t) => {
    if (t.id !== id) return t;
    const pnl = t.direction === 'LONG' ? (exitPrice - t.entry) * t.size : (t.entry - exitPrice) * t.size;
    return { ...t, exit: exitPrice, closed: true, pnl, outcome: pnl >= 0 ? 'WIN' : 'LOSS' };
  });
  saveState(state);
}

export function getStats(state: AppState) {
  const closed = state.trades.filter((t) => t.closed && t.pnl !== undefined);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);

  const todayPnl = closed.filter((t) => t.timestamp >= todayStart.getTime()).reduce((s, t) => s + (t.pnl ?? 0), 0);
  const weekPnl = closed.filter((t) => t.timestamp >= weekStart.getTime()).reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = closed.filter((t) => t.outcome === 'WIN').length;
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  let streak = 0; let streakType: 'WIN' | 'LOSS' | null = null;
  for (const t of [...closed].sort((a, b) => b.timestamp - a.timestamp)) {
    if (!streakType) { streakType = t.outcome === 'WIN' ? 'WIN' : 'LOSS'; streak = 1; }
    else if (t.outcome === streakType) streak++;
    else break;
  }
  return { todayPnl, weekPnl, winRate, streak, streakType, totalTrades: closed.length };
}
