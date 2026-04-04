'use client';

interface XSentiment {
  overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trending_topics: string[];
  key_tweet_insight: string;
}

interface Props {
  sentiment: XSentiment;
}

const MOOD_COLOR = { BULLISH: '#5DCAA5', BEARISH: '#D85A30', NEUTRAL: '#EF9F27' };
const MOOD_LABEL = { BULLISH: '▲ BULL', BEARISH: '▼ BEAR', NEUTRAL: '◆ NEUT' };

export default function XSentimentStrip({ sentiment }: Props) {
  const color = MOOD_COLOR[sentiment.overall] ?? '#888';

  return (
    <div
      style={{
        borderBottom: '1px solid #1A1A1A',
        backgroundColor: '#080808',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 36,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* X logo + mood */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'monospace' }}>𝕏</span>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color,
            whiteSpace: 'nowrap',
          }}
        >
          {MOOD_LABEL[sentiment.overall]}
        </span>
      </div>

      <span style={{ color: '#1A1A1A', flexShrink: 0 }}>│</span>

      {/* Key insight */}
      <span
        style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#666',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {sentiment.key_tweet_insight}
      </span>

      {/* Trending topics */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {(sentiment.trending_topics ?? []).slice(0, 3).map((t, i) => (
          <span
            key={i}
            style={{
              fontSize: 9,
              fontFamily: 'monospace',
              color: '#444',
              backgroundColor: '#111',
              border: '1px solid #1A1A1A',
              borderRadius: 4,
              padding: '1px 5px',
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
