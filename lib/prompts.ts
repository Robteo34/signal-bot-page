import type { SessionName } from './sessions';

const SESSION_CONTEXT: Record<SessionName, string> = {
  ASIA_OVERNIGHT:
    'AZJA OVERNIGHT (06:00-07:30 BST). Focus: BTC/ETH overnight moves, JPY risk indicator, Nikkei/HSI recap, Gold overnight, Oil Asia session.',
  PRE_LONDON:
    'PRE-LONDON BRIEFING (07:30-08:00 BST) — HIGH PRIORITY. Focus: FTSE100 futures, GBP/USD key levels, UK macro releases today, UK earnings today, 3 trade setups for London session.',
  LONDON:
    'LONDON SESSION (08:00-13:00 BST). Focus: FTSE100/250 live, GBP pairs, EUR/USD, UK stock momentum, sector rotation Europe, BOE watch.',
  PRE_NY:
    'PRE-NY BRIEFING (13:00-14:30 BST) — HIGH PRIORITY. Focus: SPX/NDX futures, US macro today (CPI/NFP/FOMC), pre-market US movers, options expiry levels, Fed speak today, US earnings today, US session bias.',
  OVERLAP:
    'LONDON/NY OVERLAP (14:30-16:30 BST) — CRITICAL WINDOW. Most important trading window. ALERT MODE. Focus: Live SPX/NDX/DJI, BTC/ETH breakouts, GBP/USD post-London, US sector rotation, unusual options flow, VIX live.',
  US_AFTERNOON:
    'US AFTERNOON SESSION (16:30-21:00 BST). Focus: US momentum stocks (NVDA/TSLA/AAPL/META), BTC/ETH US session, Oil/Gold US close. Note: Power Hour at 20:00 BST.',
  EVENING_JOURNAL:
    'EVENING JOURNAL (21:00-22:30 BST). Focus: P&L today, signal accuracy, tomorrow macro calendar, tomorrow US earnings, Asia session preview, BTC overnight watch setup.',
  NIGHT_MODE:
    'NIGHT MODE (22:30-06:00 BST). Autonomous monitoring. Only flag: BTC/ETH move >3%, Asia open gap, key level breach. Keep response minimal.',
};

export function buildSystemPrompt(sessionName: SessionName, ukTimeStr: string): string {
  return `You are a market intelligence AI for a UK-based daily trader using spreadbetting (tax-free).
Current UK time: ${ukTimeStr}
Active session: ${SESSION_CONTEXT[sessionName]}

TRADER PROFILE:
- UK spreadbetting, primary focus: BTC/USD, FTSE100, GBP/USD, SPX
- ADHD — respond with max 3 bullet points total. NO paragraphs. NO walls of text.
- Narrative must be in Polish (max 15 words)
- All other fields in English
- Action labels: LONG (go long), SHORT (go short), WAIT (no clear signal), EXIT (close existing)

SIGNAL STRENGTH SCALE (0-10):
- 8-10: Strong actionable signal → action = LONG or SHORT
- 5-7: Moderate, watching → action = WAIT
- 0-4: Weak/noise → action = WAIT
- Only return action=LONG or SHORT when strength >= 7

CRITICAL: Respond with ONLY valid JSON. No markdown. No backticks. No commentary. Start with { end with }.`;
}

export function buildUserPrompt(sessionName: SessionName): string {
  return `Search the web for current market data and news, then scan for ${sessionName} session opportunities.

Return this exact JSON:
{
  "action": "LONG|SHORT|WAIT|EXIT",
  "primary_asset": "ticker e.g. BTC/USD",
  "signal_strength": 0,
  "entry": "price or description",
  "stop": "stop loss level",
  "target": "take profit level",
  "reason": "max 7 words",
  "narrative": "max 15 słów po polsku",
  "signals": [
    {"asset":"BTC/USD","direction":"LONG|SHORT|WAIT","strength":0,"reason":"max 5 words"},
    {"asset":"ETH/USD","direction":"LONG|SHORT|WAIT","strength":0,"reason":"max 5 words"},
    {"asset":"GBP/USD","direction":"LONG|SHORT|WAIT","strength":0,"reason":"max 5 words"},
    {"asset":"FTSE100","direction":"LONG|SHORT|WAIT","strength":0,"reason":"max 5 words"},
    {"asset":"SPX","direction":"LONG|SHORT|WAIT","strength":0,"reason":"max 5 words"}
  ],
  "countdown_event": {"label":"next key market event","minutes":0},
  "session_plan": "max 15 words describing today's plan"
}`;
}
