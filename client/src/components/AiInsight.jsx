export default function AiInsight({ text }) {
  return (
    <section className="ai-insight">
      <span className="insight-label">AI 인사이트 · 주가 영향 한 줄 해설</span>
      <p>{text}</p>
    </section>
  )
}
