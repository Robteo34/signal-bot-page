const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_URL     = 'https://api.x.ai/v1/chat/completions';

export async function discoverHotTopics(): Promise<string[]> {
  if (!XAI_API_KEY) return [];

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6_000);

    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `It is ${currentDate}. You are a market intelligence analyst for active traders (day traders, swing traders) and financial markets investors.

Search the web and identify the 4-6 HOTTEST topics RIGHT NOW (last 24-48h) that are DIRECTLY moving prices on:
- Forex pairs (GBP/USD, EUR/USD, USD/JPY, etc.)
- Commodities (Gold, Silver, Brent Oil, Copper, Natural Gas)
- Indices (SPX500, Nasdaq, FTSE100, DAX, Nikkei)
- Major stocks (US mega-caps, UK blue chips, European giants)
- Crypto (BTC, ETH)
- Bond yields (US 10Y, UK gilts)

Focus on actionable topics where a trader could take a position TODAY or prepare for Monday open. Categories to search:

1. CENTRAL BANK ACTION — Fed/BOE/ECB/BOJ decisions, speeches, minutes, rate changes, QT/QE shifts
2. MACRO RELEASES — CPI, NFP, GDP, PMI surprises, inflation data
3. GEOPOLITICAL → OIL — Middle East conflicts, Hormuz, Russia sanctions, OPEC decisions, pipeline events
4. GEOPOLITICAL → RISK — NATO escalations, China-Taiwan, trade wars, tariffs affecting supply chains
5. EARNINGS SURPRISES — Major company beats/misses that move sectors (tech, banks, energy)
6. CRYPTO CATALYSTS — ETF flows, regulatory news, whale movements, on-chain events
7. CURRENCY CRISES — Sharp FX moves, intervention, political instability affecting major currencies
8. COMMODITY SHOCKS — Supply disruptions, weather events affecting grains, metals, energy

DO NOT include:
- Pure political drama without market impact
- Historical events (>48h old) unless still actively developing
- General news (elections not imminent, domestic scandals)
- Sports, entertainment, celebrity news

Return ONLY a JSON array of short topic strings (3-6 words each), ranked by trading relevance (most market-moving first).

Example format: ["Fed May rate decision", "Hormuz blockade oil spike", "TSLA earnings Q1 beat", "BTC ETF record inflows", "Yen intervention BOJ"]

Search the web thoroughly before returning. Each topic must have VERIFIABLE recent news (within 48h) moving at least one major asset.`;

    const res = await fetch(XAI_URL, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:             'grok-4-fast-reasoning',
        temperature:       0.2,
        max_tokens:        300,
        messages:          [{ role: 'user', content: prompt }],
        search_parameters: { mode: 'auto' },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data    = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    const topics = JSON.parse(match[0]);
    if (!Array.isArray(topics)) return [];
    return topics
      .filter((t: unknown) => typeof t === 'string' && t.length > 3)
      .slice(0, 5) as string[];
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn('Topic discovery error:', e?.message ?? e);
    return [];
  }
}
