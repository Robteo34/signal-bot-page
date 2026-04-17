interface GdeltEvent {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  ageMinutes: number;
  country: string;
  tone: number;
  language: string;
}

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';

// Fallback static queries (used if topic discovery fails or returns nothing)
export const FALLBACK_QUERIES: Record<string, string> = {
  MILITARY:     '(NATO OR Russia OR Ukraine OR China OR Iran OR Israel OR Hormuz OR blockade) AND (military OR troops OR missile OR drone OR strike OR deployment)',
  GEOPOLITICAL: '(sanctions OR embargo OR diplomatic OR summit OR crisis OR escalation) AND (announcement OR meeting OR talks)',
  ENERGY:       '(oil OR gas OR LNG OR pipeline OR tanker OR OPEC OR Hormuz OR Suez OR Strait) AND (disruption OR attack OR shutdown OR blockade OR surge)',
  MACRO:        '(Fed OR FOMC OR Powell OR BOE OR ECB OR BOJ) AND (rate OR decision OR meeting OR pivot OR hike OR cut)',
  SUPPLY:       '(supply chain OR port OR shipping OR freight OR tanker) AND (disruption OR closure OR seizure OR sanctions)',
};

export function generateTopicQueries(hotTopics: string[]): Record<string, string> {
  if (!hotTopics || hotTopics.length === 0) return FALLBACK_QUERIES;

  const dynamicQueries: Record<string, string> = {};

  for (const topic of hotTopics.slice(0, 5)) {
    const sanitized = topic.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    if (sanitized.length < 3) continue;
    const key = topic.slice(0, 20).toUpperCase().replace(/\s+/g, '_');
    dynamicQueries[key] = `${sanitized} sourcelang:english`;
  }

  // Always include macro as a stable category
  dynamicQueries['MACRO'] = FALLBACK_QUERIES.MACRO;

  return Object.keys(dynamicQueries).length > 1 ? dynamicQueries : FALLBACK_QUERIES;
}

async function gdeltQuery(query: string, timespan = '4h'): Promise<GdeltEvent[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const params = new URLSearchParams({
      query:      query + ' sourcelang:english',
      mode:       'ArtList',
      format:     'json',
      timespan,
      maxrecords: '10',
      sort:       'datedesc',
    });

    const url = `${GDELT_BASE}?${params.toString()}`;
    console.log(`GDELT URL: ${url.slice(0, 200)}`);
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 600 }, // cache 10 min
    } as RequestInit);
    clearTimeout(timeout);

    if (!res.ok) return [];
    const raw = await res.text();
    if (raw.includes('limit requests') || raw.includes('every 5 seconds')) {
      console.warn(`GDELT rate limited: ${raw.slice(0, 100)}`);
      return [];
    }
    let data: any;
    try { data = JSON.parse(raw); } catch { return []; }
    if (!data.articles || !Array.isArray(data.articles)) return [];

    const now = Date.now();
    return data.articles.slice(0, 5).map((a: any) => {
      // GDELT date format: 20260417T220000Z → 2026-04-17T22:00:00Z
      const dateStr = a.seendate || '';
      let publishedAt = new Date().toISOString();
      if (dateStr.length >= 15) {
        publishedAt = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${dateStr.slice(9, 11)}:${dateStr.slice(11, 13)}:${dateStr.slice(13, 15)}Z`;
      }
      return {
        title:      a.title          || '',
        url:        a.url            || '',
        source:     a.domain         || 'Unknown',
        publishedAt,
        ageMinutes: Math.round((now - new Date(publishedAt).getTime()) / 60000),
        country:    a.sourcecountry  || '',
        tone:       parseFloat(a.tone) || 0,
        language:   a.language       || 'English',
      };
    });
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn('GDELT query error:', e?.message ?? e);
    return [];
  }
}

export async function fetchOSINTEvents(
  _sessionName: string,
  queries?: Record<string, string>
): Promise<string> {
  const queryMap = queries ?? FALLBACK_QUERIES;
  const entries  = Object.entries(queryMap);

  // Prioritise topic-discovered queries (anything not a standard category key)
  const STANDARD = new Set(['MILITARY', 'GEOPOLITICAL', 'ENERGY', 'MACRO', 'SUPPLY']);
  const topicEntries    = entries.filter(([k]) => !STANDARD.has(k));
  const militaryEntry   = entries.find(([k]) => k === 'MILITARY');
  const energyEntry     = entries.find(([k]) => k === 'ENERGY');

  const finalQueries: [string, string][] = [
    ...topicEntries.slice(0, 2),                          // up to 2 hot topics
    ...(militaryEntry ? [militaryEntry] : []),
    ...(energyEntry   ? [energyEntry]   : []),
  ].slice(0, 3); // hard cap at 3 — 5.5s × 2 gaps = ~11s total

  console.log(`GDELT running ${finalQueries.length} queries sequentially (rate limited)`);

  // Sequential with 5.5s delay between requests to respect GDELT rate limit
  const results: { category: string; events: GdeltEvent[] }[] = [];
  for (let i = 0; i < finalQueries.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 5500));
    const [category, query] = finalQueries[i];
    const events = await gdeltQuery(query, '4h');
    results.push({ category, events });
  }
  if (!results || results.length === 0) return '';

  // Dedupe by URL across all categories
  const seen     = new Set<string>();
  const sections: string[] = [];

  for (const { category, events } of results) {
    if (!events || events.length === 0) continue;

    const unique = events.filter((e) => {
      if (seen.has(e.url) || !e.url) return false;
      seen.add(e.url);
      return true;
    }).slice(0, 4);

    if (unique.length === 0) continue;

    const lines = unique.map((e) =>
      `  [${e.ageMinutes}min ago | ${e.source} | ${e.country}] ${e.title}`
    );
    sections.push(`▸ ${category}:\n${lines.join('\n')}`);
  }

  if (sections.length === 0) return '';

  return [
    '═══ VERIFIED OSINT EVENTS (GDELT 2.0, last 4h) ═══',
    `Fetched at: ${new Date().toISOString()}`,
    'REAL geopolitical/military/energy events from global news sources with VERIFIED timestamps.',
    'Use these for MILITARY, MACRO, SUPPLY, REGULATORY categories in the intelligence feed.',
    '',
    sections.join('\n\n'),
    '═══ END OSINT ═══',
  ].join('\n');
}
