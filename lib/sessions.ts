export type SessionName =
  | 'ASIA_OVERNIGHT'
  | 'PRE_LONDON'
  | 'LONDON'
  | 'PRE_NY'
  | 'OVERLAP'
  | 'US_AFTERNOON'
  | 'EVENING_JOURNAL'
  | 'NIGHT_MODE';

export interface Session {
  name: SessionName;
  label: string;
  color: string;
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL';
  isAlertMode: boolean;
  description: string;
}

// British Summer Time: last Sunday March → last Sunday October
function isBST(date: Date): boolean {
  const year = date.getUTCFullYear();

  const march = new Date(Date.UTC(year, 2, 31));
  while (march.getUTCDay() !== 0) march.setUTCDate(march.getUTCDate() - 1);

  const october = new Date(Date.UTC(year, 9, 31));
  while (october.getUTCDay() !== 0) october.setUTCDate(october.getUTCDate() - 1);

  const bstStart = new Date(march);
  bstStart.setUTCHours(1, 0, 0, 0);
  const bstEnd = new Date(october);
  bstEnd.setUTCHours(1, 0, 0, 0);

  return date >= bstStart && date < bstEnd;
}

// US DST: 2nd Sunday March → 1st Sunday November
function isUSDST(date: Date): boolean {
  const year = date.getUTCFullYear();

  let march = new Date(Date.UTC(year, 2, 1));
  let sundays = 0;
  while (sundays < 2) {
    if (march.getUTCDay() === 0) sundays++;
    if (sundays < 2) march.setUTCDate(march.getUTCDate() + 1);
  }

  let november = new Date(Date.UTC(year, 10, 1));
  while (november.getUTCDay() !== 0) november.setUTCDate(november.getUTCDate() + 1);

  return date >= march && date < november;
}

// During ~1 week when US is still EDT but UK has reverted to GMT,
// NY opens at 13:30 BST instead of 14:30
export function getNYOpenHour(date: Date = new Date()): number {
  const ukBST = isBST(date);
  const usDST = isUSDST(date);
  // UK is GMT, US still on EDT → NY opens 1h earlier in UK time
  if (!ukBST && usDST) return 13.5;
  return 14.5;
}

function toUKTime(date: Date): number {
  const offset = isBST(date) ? 1 : 0;
  const h = ((date.getUTCHours() + offset) % 24 + 24) % 24;
  return h + date.getUTCMinutes() / 60;
}

export function getCurrentSession(now: Date = new Date()): Session {
  const t = toUKTime(now);
  const nyOpen = getNYOpenHour(now);
  const overlapEnd = nyOpen + 2; // 2 hour overlap window

  if (t >= 6 && t < 7.5) return SESSIONS.ASIA_OVERNIGHT;
  if (t >= 7.5 && t < 8) return SESSIONS.PRE_LONDON;
  if (t >= 8 && t < 13) return SESSIONS.LONDON;
  if (t >= 13 && t < nyOpen) return SESSIONS.PRE_NY;
  if (t >= nyOpen && t < overlapEnd) return SESSIONS.OVERLAP;
  if (t >= overlapEnd && t < 21) return SESSIONS.US_AFTERNOON;
  if (t >= 21 && t < 22.5) return SESSIONS.EVENING_JOURNAL;
  return SESSIONS.NIGHT_MODE;
}

export const SESSIONS: Record<SessionName, Session> = {
  ASIA_OVERNIGHT: {
    name: 'ASIA_OVERNIGHT',
    label: 'AZJA',
    color: '#185FA5',
    priority: 'NORMAL',
    isAlertMode: false,
    description: 'BTC/ETH overnight, JPY, Nikkei/HSI',
  },
  PRE_LONDON: {
    name: 'PRE_LONDON',
    label: 'PRE-LONDYN',
    color: '#854F0B',
    priority: 'HIGH',
    isAlertMode: false,
    description: 'FTSE futures, GBP levels, UK setup',
  },
  LONDON: {
    name: 'LONDON',
    label: 'LONDYN',
    color: '#854F0B',
    priority: 'NORMAL',
    isAlertMode: false,
    description: 'FTSE100, GBP pairs, EUR/USD',
  },
  PRE_NY: {
    name: 'PRE_NY',
    label: 'PRE-NY',
    color: '#854F0B',
    priority: 'HIGH',
    isAlertMode: false,
    description: 'SPX/NDX futures, US macro, setup',
  },
  OVERLAP: {
    name: 'OVERLAP',
    label: 'OVERLAP',
    color: '#993C1D',
    priority: 'CRITICAL',
    isAlertMode: true,
    description: 'Najważniejsze okno handlowe dnia',
  },
  US_AFTERNOON: {
    name: 'US_AFTERNOON',
    label: 'USA',
    color: '#534AB7',
    priority: 'NORMAL',
    isAlertMode: false,
    description: 'NVDA/TSLA/AAPL/META, BTC/ETH US',
  },
  EVENING_JOURNAL: {
    name: 'EVENING_JOURNAL',
    label: 'WIECZÓR',
    color: '#0F6E56',
    priority: 'NORMAL',
    isAlertMode: false,
    description: 'P&L, jutrzejszy kalendarz, BTC noc',
  },
  NIGHT_MODE: {
    name: 'NIGHT_MODE',
    label: 'NOC',
    color: '#333',
    priority: 'NORMAL',
    isAlertMode: false,
    description: 'Tryb nocny — tylko alertY BTC/ETH',
  },
};

export function formatUKTime(now: Date = new Date()): string {
  const bst = isBST(now);
  const offset = bst ? 1 : 0;
  const h = ((now.getUTCHours() + offset) % 24 + 24) % 24;
  const m = now.getUTCMinutes();
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${bst ? 'BST' : 'GMT'}`;
}

interface NextEvent {
  label: string;
  minutes: number;
}

export function getNextEvent(now: Date = new Date()): NextEvent {
  const t = toUKTime(now);
  const nyOpen = getNYOpenHour(now);

  const checkpoints = [
    { label: 'Londyn Open', time: 8 },
    { label: 'Pre-NY', time: 13 },
    { label: 'NY Open', time: nyOpen },
    { label: 'Koniec overlap', time: nyOpen + 2 },
    { label: 'Power Hour', time: 20 },
    { label: 'Wieczór', time: 21 },
    { label: 'Azja Open', time: 24 + 6 },
  ];

  for (const cp of checkpoints) {
    if (t < cp.time) {
      return { label: cp.label, minutes: Math.round((cp.time - t) * 60) };
    }
  }

  return { label: 'Azja Open', minutes: Math.round((30 - t) * 60) };
}
