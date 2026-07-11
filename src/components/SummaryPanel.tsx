import type { ContextAnalysisResult } from "../types/context";

type SummaryResult = Pick<
  ContextAnalysisResult,
  "projectTitle" | "summary" | "participants" | "questions"
>;

function SummaryPanel({ result }: { result: SummaryResult }) {
  return (
    <section className="summary-panel" aria-labelledby={`summary-title-${result.summary.generatedAt}`}>
      <div className="panel-heading compact"><p className="section-kicker">Context summary</p><h2 id={`summary-title-${result.summary.generatedAt}`}>{result.projectTitle}</h2><p>관점 차이와 미결 질문을 포함해 입력 기록에서 확인한 공동 맥락입니다.</p></div>
      <div className="metric-row" aria-label="분석 결과 요약">
        <div><strong>{result.participants.length}</strong><span>구분된 관점</span></div>
        <div><strong>{result.questions.length}</strong><span>미해결 질문</span></div>
        <div><strong>{result.summary.overview.length}</strong><span>핵심 맥락</span></div>
      </div>
      <ol className="summary-list">{result.summary.overview.map((item) => <li key={item}>{item}</li>)}</ol>
    </section>
  );
}

export default SummaryPanel;
