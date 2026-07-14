const SENTIMENT_META = {
  bullish: { label: "호재", tone: "buy" },
  bearish: { label: "악재", tone: "sell" },
  neutral: { label: "중립", tone: "hold" },
}

export default function AiInsight({ text, marketSentiment }) {
  const sentiment = SENTIMENT_META[marketSentiment]

  return (
    <section className="ai-insight">
      <div className="insight-header">
        <span className="insight-label">AI 인사이트 · 주가 영향 한 줄 해설</span>
        {sentiment && <span className={`badge ${sentiment.tone}`}>{sentiment.label}</span>}
      </div>
      <p>{text}</p>
    </section>
  )
}
