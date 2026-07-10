import type { ContextAnalysisResult } from "../types/context";

type DecisionListProps = {
  decisions: ContextAnalysisResult["decisions"];
};

const statusLabel = {
  confirmed: "확정",
  tentative: "논의중",
  unclear: "불확실",
} satisfies Record<ContextAnalysisResult["decisions"][number]["status"], string>;

function DecisionList({ decisions }: DecisionListProps) {
  return (
    <section className="result-panel" aria-labelledby="decision-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Decisions</p>
        <h2 id="decision-title">결정사항</h2>
      </div>

      {decisions.length > 0 ? (
        <ul className="decision-list">
          {decisions.map((item) => (
            <li key={item.decision}>
              <div>
                <strong>{item.decision}</strong>
                <p>{item.reason}</p>
              </div>
              <span className={`status-badge ${item.status}`}>{statusLabel[item.status]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="result-empty-state">입력 기록에서 명시적으로 확인된 결정사항이 없습니다.</p>
      )}
    </section>
  );
}

export default DecisionList;
