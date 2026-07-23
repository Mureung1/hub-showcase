function TextSection({ title, children }) {
  if (!children) {
    return null
  }

  return (
    <section className="analysis-card">
      <h3>{title}</h3>
      <p>{children}</p>
    </section>
  )
}

function ListSection({ items, title }) {
  if (!items?.length) {
    return null
  }

  return (
    <section className="analysis-card">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function AnalysisResultPanel({ analysis }) {
  if (!analysis) {
    return null
  }

  return (
    <section className="analysis-result-panel" aria-labelledby="analysis-result-title">
      <div className="analysis-summary">
        <div>
          <p className="analysis-label">AI 분석 결과</p>
          <h2 id="analysis-result-title">{analysis.decision}</h2>
        </div>
        <strong>{analysis.overallScore}점</strong>
      </div>

      <TextSection title="종합 의견">{analysis.summary}</TextSection>
      <TextSection title="비용 분석">{analysis.costAnalysis}</TextSection>
      <TextSection title="통학 분석">{analysis.commuteAnalysis}</TextSection>
      <TextSection title="매물 신뢰도">{analysis.reliabilityAnalysis}</TextSection>
      <ListSection title="용어 설명" items={analysis.termExplanations} />
      <ListSection title="주의할 점" items={analysis.risks} />
      <ListSection title="계약 전 체크리스트" items={analysis.checklist} />
      <ListSection title="추가 확인 질문" items={analysis.nextQuestions} />
    </section>
  )
}

export default AnalysisResultPanel
