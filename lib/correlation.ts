export interface CorrelationGroup {
  theme: string;
  direction: 'anti-USD' | 'pro-USD' | 'risk-on' | 'risk-off' | 'anti-oil' | 'pro-oil' | 'anti-JPY' | 'pro-JPY' | 'anti-GBP' | 'pro-GBP';
  signals: string[];
}

// Exposures when LONG — SHORT inverts all of them
const LONG_EXPOSURE: Record<string, string[]> = {
  'Gold':        ['anti-USD', 'risk-off'],
  'XAU/USD':     ['anti-USD', 'risk-off'],
  'Silver':      ['anti-USD', 'risk-off'],
  'XAG/USD':     ['anti-USD', 'risk-off'],
  'EUR/USD':     ['anti-USD'],
  'GBP/USD':     ['anti-USD', 'pro-GBP'],
  'AUD/USD':     ['anti-USD', 'risk-on'],
  'NZD/USD':     ['anti-USD', 'risk-on'],
  'USD/JPY':     ['pro-USD', 'anti-JPY'],
  'USD/CHF':     ['pro-USD'],
  'USD/CAD':     ['pro-USD', 'anti-oil'],
  'GBP/JPY':     ['anti-JPY', 'risk-on', 'pro-GBP'],
  'EUR/JPY':     ['anti-JPY', 'risk-on'],
  'AUD/JPY':     ['anti-JPY', 'risk-on'],
  'NZD/JPY':     ['anti-JPY', 'risk-on'],
  'CAD/JPY':     ['anti-JPY', 'pro-oil'],
  'CHF/JPY':     ['anti-JPY'],
  'EUR/GBP':     ['anti-GBP'],
  'GBP/CHF':     ['pro-GBP'],
  'GBP/AUD':     ['pro-GBP'],
  'GBP/CAD':     ['pro-GBP'],
  'GBP/NZD':     ['pro-GBP'],
  'Brent Oil':   ['pro-oil', 'risk-on'],
  'WTI Oil':     ['pro-oil', 'risk-on'],
  'Natural Gas': ['pro-oil'],
  'BTC/USD':     ['risk-on', 'anti-USD'],
  'ETH/USD':     ['risk-on', 'anti-USD'],
  'SPX500':      ['risk-on'],
  'Nasdaq100':   ['risk-on'],
  'Dow Jones':   ['risk-on'],
  'FTSE100':     ['risk-on'],
  'DAX':         ['risk-on'],
  'CAC40':       ['risk-on'],
  'Nikkei225':   ['risk-on', 'anti-JPY'],
  'VIX':         ['risk-off'],
  'NVDA':        ['risk-on'],
  'TSLA':        ['risk-on'],
  'AAPL':        ['risk-on'],
  'MSFT':        ['risk-on'],
  'AMZN':        ['risk-on'],
  'META':        ['risk-on'],
  'GOOGL':       ['risk-on'],
  'JPM':         ['risk-on'],
};

const EXPOSURE_LABELS: Record<string, string> = {
  'anti-USD': 'Bearish USD',
  'pro-USD':  'Bullish USD',
  'risk-on':  'Risk-on (equities/crypto)',
  'risk-off': 'Risk-off (safe havens)',
  'anti-oil': 'Bearish oil',
  'pro-oil':  'Bullish oil',
  'anti-JPY': 'Bearish JPY',
  'pro-JPY':  'Bullish JPY',
  'anti-GBP': 'Bearish GBP',
  'pro-GBP':  'Bullish GBP',
};

const INVERT: Record<string, string> = {
  'anti-USD': 'pro-USD',  'pro-USD':  'anti-USD',
  'risk-on':  'risk-off', 'risk-off': 'risk-on',
  'anti-oil': 'pro-oil',  'pro-oil':  'anti-oil',
  'anti-JPY': 'pro-JPY',  'pro-JPY':  'anti-JPY',
  'anti-GBP': 'pro-GBP',  'pro-GBP':  'anti-GBP',
};

interface SignalInput {
  asset: string;
  action: string;
}

export function analyzeCorrelations(signals: SignalInput[]): CorrelationGroup[] {
  const actionable = signals.filter((s) => s.action === 'LONG' || s.action === 'SHORT');
  if (actionable.length < 2) return [];

  const exposureMap: Record<string, Set<string>> = {};

  for (const sig of actionable) {
    const baseExposures = LONG_EXPOSURE[sig.asset];
    if (!baseExposures) continue;
    const invert = sig.action === 'SHORT';
    for (const exp of baseExposures) {
      const finalExp = invert ? (INVERT[exp] ?? exp) : exp;
      if (!exposureMap[finalExp]) exposureMap[finalExp] = new Set();
      exposureMap[finalExp].add(sig.asset);
    }
  }

  const groups: CorrelationGroup[] = [];
  for (const [exposure, assets] of Object.entries(exposureMap)) {
    if (assets.size >= 2) {
      groups.push({
        theme:     EXPOSURE_LABELS[exposure] ?? exposure,
        direction: exposure as CorrelationGroup['direction'],
        signals:   Array.from(assets),
      });
    }
  }

  return groups.sort((a, b) => b.signals.length - a.signals.length);
}
