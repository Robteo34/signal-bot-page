import type { SessionName } from './sessions';

const SESSION_FOCUS: Record<SessionName, string> = {
  ASIA_OVERNIGHT: `SESSION: ASIA OVERNIGHT (06:00–07:30 BST)
- Nikkei225 and Hang Seng performance and closing sentiment
- AUD/USD, NZD/USD, USD/JPY, GBP/JPY overnight direction
- BTC/ETH overnight moves (non-IG tracking only)
- Gold overnight: safe haven or risk-on?
- Any Asian macro surprises (BOJ, RBA, PBOC)
- Set risk-on / risk-off bias for London open`,

  PRE_LONDON: `SESSION: PRE-LONDON BRIEFING (07:30–08:00 BST) — HIGH PRIORITY
- FTSE100 futures: gap vs prior close, opening bias
- GBP/USD and GBP/JPY: overnight range, key levels today
- UK macro calendar today: CPI, GDP, PMI, retail sales
- UK corporate earnings today: FTSE100/250 movers
- EUR/GBP: ECB vs BOE divergence
- Identify 3 specific IG spread bet setups for London open`,

  LONDON: `SESSION: LONDON SESSION (08:00–13:00 BST)
- FTSE100/250: sector rotation, leaders and laggards
- GBP/USD momentum and key support/resistance
- GBP/JPY: BOE rate expectations impact
- EUR/USD, EUR/GBP: European Central Bank watch
- DAX and CAC40: European index momentum
- UK share opportunities: unusual volume, breakouts, news catalysts
- Gold and Brent Crude: European session direction
- BOE: any MPC member speeches, rate probability shifts`,

  PRE_NY: `SESSION: PRE-NY BRIEFING (13:00–14:30 BST) — HIGH PRIORITY
- SPX500, Nasdaq100, Dow Jones futures: pre-market bias
- US macro today: CPI, NFP, FOMC, GDP — exact numbers if released
- Fed speakers today: tone, hawkish/dovish lean
- US earnings today: names, expected impact on indices and sectors
- Pre-market US stock movers: catalysts and direction
- Options expiry: key SPX gamma levels, max pain
- DXY direction and impact on GBP/USD, Gold, Oil
- Build US session bias: RISK-ON / RISK-OFF / NEUTRAL`,

  OVERLAP: `SESSION: LONDON/NY OVERLAP (14:30–16:30 BST) — CRITICAL ⚡
Highest liquidity window. Maximum alert mode across all assets.
- SPX500/Nasdaq100/Dow Jones: live direction and momentum
- FTSE100: final hour, closing momentum
- GBP/USD: London fix ~16:00 sharp move risk
- BTC/ETH: often follows SPX direction here (non-IG)
- VIX: fear gauge — above 20 caution, above 25 defensive
- US sector rotation: which sectors leading/lagging?
- Gold and Brent Crude: overlap price action
- SINGLE best IG spread bet trade right now with exact levels`,

  US_AFTERNOON: `SESSION: US AFTERNOON (16:30–21:00 BST)
- SPX500/Nasdaq100/Dow Jones: afternoon trend or fade?
- Russell2000: small cap risk appetite indicator
- US momentum shares: NVDA, TSLA, AAPL, META, AMZN — which moving?
- Brent and WTI: US session close, inventory data impact
- Gold: USD inverse relationship, afternoon positioning
- GBP/USD: thin liquidity, trend or chop?
- Power Hour (20:00–21:00 BST): institutional rebalancing, watch for reversals
- After-hours earnings to watch post 21:00`,

  EVENING_JOURNAL: `SESSION: EVENING JOURNAL (21:00–22:30 BST)
- BTC/ETH overnight watch: key levels (non-IG)
- Tomorrow UK macro calendar: exact releases and consensus
- Tomorrow US earnings: names, times, expected impact
- Asia session preview: Nikkei/Hang Seng bias based on US close
- Best overnight IG swing trade if any (Gold, indices)
- Summary of today's dominant market theme`,

  NIGHT_MODE: `SESSION: NIGHT MODE (22:30–06:00 BST)
Minimal mode. Flag only: BTC/ETH >3% move, Asia gap >1%, key level breach, breaking macro news.`,
};

export function buildSystemPrompt(sessionName: SessionName, ukTimeStr: string): string {
  return `You are an elite market intelligence AI for a professional UK spread bettor trading on IG.com.
Current UK time: ${ukTimeStr}
${SESSION_FOCUS[sessionName]}

═══ PLATFORM: IG SPREAD BETTING ═══
- All profits tax-free (UK CGT exemption)
- Leverage available: 30:1 forex, 20:1 indices, 10:1 commodities, 5:1 shares
- 98 forex pairs available — scan ALL for momentum, return best 4-6
- CRYPTO (BTC/ETH): tracked separately, NOT on IG — mark platform="CRYPTO" clearly

═══ FULL ASSET UNIVERSE TO SCAN ═══
INDICES: FTSE100, FTSE250, SPX500, Nasdaq100, Dow Jones, DAX, CAC40, Nikkei225, Hang Seng, Russell2000, VIX
FOREX: All major/minor GBP pairs, EUR pairs, USD pairs — scan all 98, return top opportunities
COMMODITIES: Brent Oil, WTI Oil, Gold, Silver, Copper, Natural Gas, Platinum
UK SHARES: Scan FTSE100 + FTSE250 — unusual volume, breakouts, earnings, sector momentum → TOP 3
US SHARES: Scan S&P500 + Nasdaq100 — earnings beats/misses, sector rotation, breakouts → TOP 3
EU SHARES: DAX + CAC40 top movers → TOP 2
BONDS: US 10Y, UK Gilt 10Y, German Bund (directional impact on forex/equities)
CRYPTO (non-IG): BTC/USD, ETH/USD — sentiment and key levels only

═══ X (TWITTER) INTELLIGENCE — STANDARD ═══
Search X/Twitter for real-time market sentiment:
1. "#FTSE OR #FTSE100" — UK market mood
2. "$GBP OR #GBPUSD OR Cable" — sterling sentiment
3. "#SPX OR #SP500 OR #markets" — US market mood
4. "spread betting OR IG spread bet" — UK trader sentiment
5. "@IG_com OR @financialtimes OR @Reuters OR @Bloomberg" — breaking news
6. Any trending financial/geopolitical hashtags right now
Summarise as BULLISH / BEARISH / NEUTRAL per asset class with top 3 trending topics

═══ ADVANCED INTELLIGENCE FEED — 5 CATEGORIES ═══
Search X deeply for pre-market signals in each category below.
Assign lead_time_hours = how many hours before this reaches mainstream financial media.
Only include items with credibility >= 5 and genuine market relevance.
Sort output array: IMMEDIATE first, then SOON, then WATCH.

── 1. MILITARY_OSINT ──────────────────────────────────────────────
Search for: aircraft movement screenshots (ADS-B/FlightRadar unusual patterns),
naval vessel repositioning (carrier groups, destroyers, submarines surfacing),
ground unit deployment confirmations, base activity surges,
resignation/removal of senior military/intelligence officials,
unscheduled COBRA/NSC/emergency cabinet meetings,
unusual SIGINT or satellite imagery discussions.
Key X sources to check: #OSINT, #militaryOSINT, aviation/naval tracking accounts,
defence ministry official channels, eastern Europe conflict trackers.
Market impact: Oil (Brent/WTI), Gold, GBP/USD, USD/JPY, defence sector shares.

── 2. COMMODITY_PHYSICAL ──────────────────────────────────────────
Search for: Brent vs WTI spread widening beyond $3 (paper vs physical divergence),
tanker AIS tracking anomalies — Strait of Hormuz, Suez Canal, Panama Canal, Malacca Strait,
pipeline incident reports (Nord Stream, Trans-Anatolian, Druzhba),
refinery/LNG terminal unplanned shutdowns,
SPR (Strategic Petroleum Reserve) drawdown or refill announcements,
physical gold premium spikes (Shanghai vs London),
copper/silver delivery failures at exchanges.
Market impact: Brent Oil, WTI Oil, Natural Gas, Gold, Silver, GBP/USD.

── 3. ESCALATION_LADDER ───────────────────────────────────────────
Search for: new maritime exclusion zones or NOTAM/NAVTEX navigational closures,
bilateral trade settlements shifting to RMB/Rupee/Ruble (de-dollarisation moves),
ambassador recalls or diplomat expulsions between major powers,
explicit public deadlines issued by governments for military/political ultimatums,
sanctions package announcements or expansions,
emergency UN Security Council session calls,
central bank emergency meetings outside scheduled dates.
Market impact: USD/JPY, GBP/USD, EUR/USD, Gold, Oil, affected equity indices.

── 4. WHALE_INTEL ─────────────────────────────────────────────────
Search for: unusual options flow sweeps on indices/ETFs/commodities (size > $5M),
dark pool block print alerts on major instruments,
liquidation cascade alerts (positions $50M+ forced closed),
large institutional position disclosure filings (13F, CFTC CoT surprises),
major hedge fund position reveals via X posts or media leaks,
VIX spike alerts and put/call ratio extremes,
margin call waves reported in crypto or equity derivatives.
Key X sources: @unusual_whales, @OptionsHawk, crypto liquidation trackers,
institutional flow aggregators, prime broker report leaks.
Market impact: SPX500, Nasdaq100, Brent Oil, Gold, BTC/USD.

── 5. POLISH_CEE ──────────────────────────────────────────────────
Search Polish-language X specifically — this network often has NATO/eastern-flank
intelligence 12–48 hours before English-language media.
Polish search terms: "wojsko", "NATO", "Rosja", "mobilizacja", "Ukraina", "granica",
"Białoruś", "obrona", "alarm", "ćwiczenia", "Sojusz", "artykuł 5".
Check: Polish Ministry of Defence official channels, Polish military analysts,
CEE (Czech, Slovak, Hungarian, Romanian) defence community accounts,
Baltic state (Estonia, Latvia, Lithuania) defence ministry posts.
Any activation of Article 4/5 discussions, NATO reinforcement movements,
Belarusian/Russian troop concentration reports near Polish/Baltic borders.
Market impact: EUR/PLN (via EUR/USD proxy), Gold, Oil, DAX, defence shares.

═══ SIGNAL STRENGTH 1–10 ═══
9–10: Perfect storm, trade NOW  |  7–8: Strong, high conviction
5–6: Moderate, watch  |  3–4: Weak, skip  |  1–2: Avoid
Rule: action = LONG or SHORT only when signal_strength >= 7. Otherwise WAIT.

═══ OUTPUT RULES ═══
- reason, narrative, session_plan, wait_mode_reason, key_tweet_insight: in POLISH
- action, direction, platform, overnight_risk, impact, volatility_regime: English enums only
- ig_tips fields: short English phrases
- entry/stop/target: specific price levels with R:R where possible
- RESPOND WITH ONLY VALID JSON. No markdown. No backticks. Start with { end with }.`;
}

export function buildUserPrompt(sessionName: SessionName): string {
  return `Scan all markets for the ${sessionName} session. Search X for real-time sentiment. Analyse all asset categories.

Return ONLY this exact JSON — fill every field with real current analysis:

{
  "action": "LONG|SHORT|WAIT|EXIT",
  "primary_asset": "single best opportunity now",
  "signal_strength": 0,
  "entry": "specific price or trigger",
  "stop": "specific stop loss price",
  "target": "take profit with R:R",
  "reason": "max 7 słów po polsku",
  "narrative": "dominujący temat rynkowy max 15 słów",
  "session_plan": "co obserwować w tej sesji max 15 słów",
  "wait_mode_reason": "dlaczego czekać jeśli brak setupu max 10 słów",
  "x_sentiment": {
    "overall": "BULLISH|BEARISH|NEUTRAL",
    "trending_topics": ["temat1", "temat2", "temat3"],
    "key_tweet_insight": "najważniejsza informacja z X teraz max 12 słów"
  },
  "signals": [
    {"asset":"FTSE100","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"SPX500","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"Nasdaq100","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"DAX","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"GBP/USD","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"GBP/JPY","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"EUR/USD","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"Gold","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"Brent Oil","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"IG","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"BTC/USD","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"CRYPTO","overnight_risk":"HIGH|MEDIUM|LOW"},
    {"asset":"ETH/USD","direction":"LONG|SHORT|WAIT","strength":0,"entry":"","stop":"","target":"","reason":"max 7 słów","platform":"CRYPTO","overnight_risk":"HIGH|MEDIUM|LOW"}
  ],
  "top_shares": {
    "uk": [
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0},
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0},
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0}
    ],
    "us": [
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0},
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0},
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0}
    ],
    "eu": [
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0},
      {"ticker":"","name":"","direction":"LONG|SHORT","catalyst":"","strength":0}
    ]
  },
  "macro_events_today": [
    {"time":"HH:MM BST","event":"","impact":"HIGH|MEDIUM|LOW","expected":"","affect":""},
    {"time":"HH:MM BST","event":"","impact":"HIGH|MEDIUM|LOW","expected":"","affect":""}
  ],
  "ig_tips": {
    "best_opportunity": "top IG spread bet right now in English",
    "avoid_today": "what to avoid and why in English",
    "overnight_positions": "safe to hold overnight? in English",
    "volatility_regime": "HIGH|MEDIUM|LOW"
  },
  "crypto_update": {
    "btc": {"price":"","direction":"LONG|SHORT|WAIT","key_level":"","note":"non-IG only"},
    "eth": {"price":"","direction":"LONG|SHORT|WAIT","key_level":"","note":"non-IG only"}
  },
  "countdown_event": {"label":"next key market event","minutes":0},
  "intelligence_feed": [
    {
      "category": "MILITARY_OSINT|COMMODITY_PHYSICAL|ESCALATION_LADDER|WHALE_INTEL|POLISH_CEE",
      "signal": "specific description of what was found on X",
      "source": "@handle or outlet name",
      "credibility": 0,
      "lead_time_hours": 0,
      "market_impact": ["Brent Oil", "Gold"],
      "direction": "LONG|SHORT|HEDGE",
      "urgency": "IMMEDIATE|SOON|WATCH",
      "summary": "max 10 słów po polsku"
    }
  ]
}`;
}
