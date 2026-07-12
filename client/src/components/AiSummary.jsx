export default function AiSummary({ bullets }) {
  return (
    <details className="ai-summary">
      <summary>AI 요약 보기</summary>
      <ul>
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </details>
  )
}
