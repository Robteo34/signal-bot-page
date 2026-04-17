interface MacroEvent {
  time: string;
  currency: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low';
  forecast: string;
  previous: string;
  actual: string | null;
  ageMinutes: number | null;
}

const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

const RELEVANT_CURRENCIES = ['USD', 'GBP', 'EUR', 'JPY'];

export async function fetchMacroCalendar(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(FF_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 }, // cache 30 min
    });
    clearTimeout(timeout);

    if (!res.ok) return '';
    const events: any[] = await res.json();

    if (!Array.isArray(events)) return '';

    const now    = Date.now();
    const past2h = now - 2 * 60 * 60 * 1000;
    // Weekends: show 72h ahead so Monday events are visible for prep
    const utcDay  = new Date().getUTCDay();
    const utcHour = new Date().getUTCHours();
    const isWeekend = utcDay === 6 || utcDay === 0 || (utcDay === 5 && utcHour >= 20);
    const nextWindow = now + (isWeekend ? 72 : 24) * 60 * 60 * 1000;

    // Filter: only relevant currencies, only HIGH/MEDIUM impact, within window
    const filtered: MacroEvent[] = events
      .filter((e) => RELEVANT_CURRENCIES.includes(e.country))
      .filter((e) => e.impact === 'High' || e.impact === 'Medium')
      .map((e) => {
        const eventTime = new Date(e.date).getTime();
        return {
          time:       e.date,
          currency:   e.country,
          event:      e.title,
          impact:     e.impact,
          forecast:   e.forecast  || '-',
          previous:   e.previous  || '-',
          actual:     e.actual    || null,
          ageMinutes: e.actual ? Math.round((now - eventTime) / 60000) : null,
        };
      })
      .filter((e) => {
        const t = new Date(e.time).getTime();
        return t >= past2h && t <= nextWindow;
      })
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(0, 15);

    if (filtered.length === 0) return '';

    const lines = filtered.map((e) => {
      const ukTime = new Date(e.time).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        weekday:  'short',
        hour:     '2-digit',
        minute:   '2-digit',
      });
      const status = e.actual !== null
        ? `RELEASED: actual=${e.actual} vs forecast=${e.forecast} vs previous=${e.previous}`
        : `UPCOMING: forecast=${e.forecast} vs previous=${e.previous}`;
      return `[${ukTime} BST] ${e.currency} ${e.impact}: ${e.event} — ${status}`;
    });

    return [
      '═══ VERIFIED MACRO CALENDAR (Forex Factory) ═══',
      `Window: past 2h to next ${isWeekend ? '72h (weekend — showing Monday events)' : '24h'}`,
      'Use these events for macro signal generation. Released events show actual vs forecast — surprises move markets.',
      '',
      ...lines,
      '═══ END CALENDAR ═══',
    ].join('\n');
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn('Forex Factory fetch error:', e?.message ?? e);
    return '';
  }
}
