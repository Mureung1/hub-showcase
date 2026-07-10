import type { ContextAnalysisResult } from "../types/context";

type SummaryPanelProps = {
  result: ContextAnalysisResult;
};

function SummaryPanel({ result }: SummaryPanelProps) {
  return (
    <section className="summary-panel" aria-labelledby="summary-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Step 02</p>
        <h2 id="summary-title">{result.projectTitle}</h2>
        <p>입력 기록에서 추출한 팀 공유 맥락입니다.</p>
      </div>

      <div className="metric-row" aria-label="분석 결과 요약">
        <div>
          <strong>{result.summary.overview.length}</strong>
          <span>핵심 요약</span>
        </div>
        <div>
          <strong>{result.participants.length}</strong>
          <span>관점</span>
        </div>
        <div>
          <strong>{result.questions.length}</strong>
          <span>미결 질문</span>
        </div>
      </div>

      <ol className="summary-list">
        {result.summary.overview.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}

export default SummaryPanel;
