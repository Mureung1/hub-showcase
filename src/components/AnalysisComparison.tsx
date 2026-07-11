import type { ContextAnalysisResultV2 } from "../types/context";
import { compareAnalyses } from "../utils/analysisComparison";

function AnalysisComparison({
  previous,
  latest,
}: {
  previous?: ContextAnalysisResultV2;
  latest?: ContextAnalysisResultV2;
}) {
  const changes = compareAnalyses(previous, latest);

  return (
    <section className="comparison-panel" aria-labelledby="comparison-title">
      <div className="section-row">
        <div><p className="section-kicker">Latest vs previous</p><h2 id="comparison-title">최근 분석 변화</h2></div>
        <span>{changes.length}건</span>
      </div>
      {!previous ? (
        <p className="empty-card">비교할 이전 성공 분석이 없습니다.</p>
      ) : changes.length === 0 ? (
        <p className="empty-card">관점, 결정, 질문에서 확인된 변화가 없습니다.</p>
      ) : (
        <ul className="comparison-list">
          {changes.map((change) => (
            <li key={`${change.kind}-${change.id}`}>
              <span className={`change-chip ${change.kind}`}>
                {{ added: "추가", changed: "변경", resolved: "해결" }[change.kind]}
              </span>
              <p>{change.label}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AnalysisComparison;
