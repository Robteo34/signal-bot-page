import { cacheGetOrFetch } from './cache';

const XAI_API_KEY       = process.env.XAI_API_KEY;
const XAI_RESPONSES_URL = 'https://api.x.ai/v1/responses';

async function fetchHotTopics(): Promise<string[]> {
  console.log('🔍 Fetcher step 1: building request');
  if (!XAI_API_KEY) {
    console.error('🔍 Fetcher ABORT: XAI_API_KEY is missing');
    return [];
  }

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 25_000);

    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `It is ${currentDate}. You are a market intelligence analyst for active traders (day traders, swing traders) and financial markets investors.

Search the web and identify the 4-6 HOTTEST topics RIGHT NOW (last 24-48h) that are DIRECTLY moving prices on:
- Forex pairs (GBP/USD, EUR/USD, USD/JPY, etc.)
- Commodities (Gold, Silver, Brent Oil, Copper, Natural Gas)
- Indices (SPX500, Nasdaq, FTSE100, DAX, Nikkei)
- Major stocks (US mega-caps, UK blue chips)
- Crypto (BTC, ETH)

Categories to search:
1. CENTRAL BANK ACTION — Fed/BOE/ECB/BOJ decisions, speeches, rate changes
2. MACRO RELEASES — CPI, NFP, GDP, PMI surprises
3. GEOPOLITICAL → OIL — Middle East, Hormuz, OPEC, pipelines
4. GEOPOLITICAL → RISK — NATO, China-Taiwan, trade wars
5. EARNINGS SURPRISES — Major beats/misses moving sectors
6. CRYPTO CATALYSTS — ETF flows, regulatory news
7. CURRENCY CRISES — Sharp FX moves, intervention
8. COMMODITY SHOCKS — Supply disruptions

Return ONLY a JSON array of 4-6 short topic strings (3-6 words each), ranked by trading relevance. NO markdown, NO explanation — just the array.

Example: ["Fed May rate decision", "Hormuz blockade oil spike", "TSLA earnings beat"]`;

    console.log('🔍 Fetcher step 2: sending request to xAI');
    const res = await fetch(XAI_RESPONSES_URL, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        input: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search' }],
      }),
    });
    clearTimeout(timeout);

    console.log(`🔍 Fetcher step 3: got response, status ${res.status}`);
    console.log(`Topic discovery HTTP status: ${res.status}`);
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Topic discovery non-OK: ${res.status} — ${errText.slice(0, 300)}`);
      return [];
    }

    console.log('🔍 Fetcher step 4: parsing JSON body');
    const data = await res.json();

    // Responses API structure: data.output[] → items with type 'message'
    let content = '';
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          for (const c of item.content) {
            if (c.type === 'output_text' && c.text) {
              content += c.text;
            }
          }
        }
      }
    } else if (data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content;
    } else if (typeof data.output_text === 'string') {
      content = data.output_text;
    }

    console.log(`Topic discovery raw content (first 500): ${content.slice(0, 500)}`);

    if (!content) {
      console.warn('Topic discovery: empty content in response');
      console.log(`Full response keys: ${Object.keys(data).join(',')}`);
      return [];
    }

    console.log('🔍 Fetcher step 5: extracting JSON array from content');
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const match = cleaned.match(/\[\s*"[\s\S]*?"\s*\]/);
    if (!match) {
      console.warn('Topic discovery: no JSON array found in response');
      return [];
    }

    console.log(`Topic discovery matched JSON: ${match[0].slice(0, 300)}`);

    console.log('🔍 Fetcher step 6: parsing matched JSON array');
    try {
      const topics = JSON.parse(match[0]);
      if (!Array.isArray(topics)) {
        console.warn('Topic discovery: parsed value is not an array');
        return [];
      }
      const filtered = topics
        .filter((t: unknown) => typeof t === 'string' && t.length > 3)
        .slice(0, 5) as string[];
      console.log(`Topic discovery final: ${JSON.stringify(filtered)}`);
      return filtered;
    } catch (e) {
      console.warn(`Topic discovery JSON parse failed: ${e}`);
      return [];
    }
  } catch (e) {
    console.error('Topic discovery FETCH ERROR:', e instanceof Error ? e.message : e);
    return [];
  }
}

export async function discoverHotTopics(): Promise<string[]> {
  console.log('discoverHotTopics called');

  return cacheGetOrFetch(
    'topics:hot:v3',
    30 * 60, // 30 minute cache — topics don't change minute-to-minute
    async () => {
      console.log('discoverHotTopics: inside cache fetcher, making xAI request');
      return fetchHotTopics();
    }
  );
}
