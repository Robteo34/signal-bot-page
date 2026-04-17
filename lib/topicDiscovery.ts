const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_URL     = 'https://api.x.ai/v1/chat/completions';

export async function discoverHotTopics(): Promise<string[]> {
  if (!XAI_API_KEY) return [];

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 10_000);

    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `It is ${currentDate}. You are a market intelligence analyst. Search the web and identify the 4-5 HOTTEST ongoing geopolitical, military, or macro-economic topics RIGHT NOW that are moving financial markets (oil, gold, forex, indices).

Focus on:
- Active military conflicts or naval operations
- Central bank decisions imminent or just made
- Major diplomatic summits or talks happening NOW
- Energy supply disruptions
- Currency crises

Return ONLY a JSON array of short topic strings (3-6 words each). No explanation.

Example format: ["Strait of Hormuz blockade", "Fed rate decision May", "China Taiwan tension"]

Search the web first, then return the array.`;

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
        max_tokens:        500,
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
