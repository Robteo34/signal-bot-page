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

// Topic queries that matter for the 7 intelligence categories
const GDELT_QUERIES: Record<string, string> = {
  MILITARY:     '(NATO OR Russia OR Ukraine OR China OR Taiwan OR Iran OR Israel) AND (military OR troops OR airspace OR missile OR drone OR fighter OR deployment)',
  GEOPOLITICAL: '("Article 4" OR "Article 5" OR sanctions OR embargo OR diplomatic) AND (crisis OR emergency OR escalation)',
  ENERGY:       '(oil OR gas OR LNG OR pipeline OR tanker OR OPEC OR Hormuz OR Suez) AND (disruption OR attack OR shutdown OR outage)',
  MACRO:        '(Fed OR FOMC OR Powell OR BOE OR ECB) AND (rate OR decision OR meeting OR pivot)',
  SUPPLY:       '(supply chain OR port OR shipping OR Baltic OR freight) AND (disruption OR closure OR backlog)',
};

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

    const res = await fetch(`${GDELT_BASE}?${params.toString()}`, {
      signal: controller.signal,
      next: { revalidate: 600 }, // cache 10 min
    } as RequestInit);
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
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
        title:       a.title       || '',
        url:         a.url         || '',
        source:      a.domain      || 'Unknown',
        publishedAt,
        ageMinutes:  Math.round((now - new Date(publishedAt).getTime()) / 60000),
        country:     a.sourcecountry || '',
        tone:        parseFloat(a.tone) || 0,
        language:    a.language    || 'English',
      };
    });
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn('GDELT query error:', e?.message ?? e);
    return [];
  }
}

export async function fetchOSINTEvents(_sessionName: string): Promise<string> {
  // Geopolitics doesn't sleep — run all categories every scan
  const queriesToRun: [string, string][] = [
    ['MILITARY',     GDELT_QUERIES.MILITARY],
    ['GEOPOLITICAL', GDELT_QUERIES.GEOPOLITICAL],
    ['ENERGY',       GDELT_QUERIES.ENERGY],
    ['MACRO',        GDELT_QUERIES.MACRO],
    ['SUPPLY',       GDELT_QUERIES.SUPPLY],
  ];

  // Parallel with 10s overall cap
  const fetchPromise = Promise.all(
    queriesToRun.map(async ([category, query]) => ({
      category,
      events: await gdeltQuery(query, '4h'),
    }))
  );
  const timeoutPromise = new Promise<{ category: string; events: GdeltEvent[] }[]>((resolve) =>
    setTimeout(() => resolve([]), 10_000)
  );

  const results = await Promise.race([fetchPromise, timeoutPromise]);
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
