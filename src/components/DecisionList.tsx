import type { ContextAnalysisResult, EvidenceRef } from "../types/context";
import ContextSectionHeader from "./ContextSectionHeader";
import EvidenceButton from "./EvidenceButton";
import EvidenceCoverageBadge from "./EvidenceCoverageBadge";
import { summarizeEvidenceCoverage } from "./evidenceCoverage";

type DecisionListProps = {
  decisions: ContextAnalysisResult["decisions"];
  onOpenEvidence?: (evidence: EvidenceRef[]) => void;
  presentation?: "list" | "featured";
};

const statusLabel = {
  confirmed: "확정",
  tentative: "논의 중",
  unclear: "불확실",
} satisfies Record<ContextAnalysisResult["decisions"][number]["status"], string>;

function DecisionList({ decisions, onOpenEvidence, presentation = "list" }: DecisionListProps) {
  const coverage = summarizeEvidenceCoverage(decisions);

  if (presentation === "featured") {
    const [leadDecision, ...remainingDecisions] = decisions;

    return (
      <section className="decision-feature" aria-label="결정사항">
        <div className="decision-feature-topline">
          <p className="section-kicker">핵심 결정</p>
          <EvidenceCoverageBadge {...coverage} label="근거 검증" />
        </div>
        {leadDecision ? (
          <>
            <div className="decision-feature-heading">
              <h2 id="decision-title">{leadDecision.decision}</h2>
              <span className={`status-badge ${leadDecision.status}`}>{statusLabel[leadDecision.status]}</span>
            </div>
            <div className="decision-feature-reason">
              <h3>결정 이유</h3>
              <p>{leadDecision.reason}</p>
            </div>
            <EvidenceButton
              evidence={leadDecision.evidence}
              onOpen={onOpenEvidence}
              appearance="primary"
            />
            {remainingDecisions.length > 0 && (
              <details className="remaining-decisions">
                <summary>함께 확인된 결정 {remainingDecisions.length}건</summary>
                <ul>
                  {remainingDecisions.map((item) => (
                    <li key={item.id ?? item.decision}>
                      <div><strong>{item.decision}</strong><p>{item.reason}</p></div>
                      <EvidenceButton evidence={item.evidence} onOpen={onOpenEvidence} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p id="decision-title" className="result-empty-state">입력 기록에서 명시적으로 확인된 결정사항이 없습니다.</p>
        )}
      </section>
    );
  }

  return (
    <section className="result-panel context-sequence-panel decision-panel" aria-label="결정사항">
      <ContextSectionHeader
        step="01"
        kicker="Decision context"
        title="결정 배경"
        titleId="decision-title"
        intro="무엇을 정했는지뿐 아니라 그 판단을 만든 이유, 원문 근거와 확실성을 가장 먼저 봅니다."
        aside={<EvidenceCoverageBadge {...coverage} />}
      />

      {decisions.length > 0 ? (
        <ul className="decision-list">
          {decisions.map((item, index) => (
            <li key={item.id ?? item.decision}>
              <div>
                <span className="context-item-index" aria-hidden="true">D{index + 1}</span>
                <strong>{item.decision}</strong>
                <p>{item.reason}</p>
                <EvidenceButton evidence={item.evidence} onOpen={onOpenEvidence} />
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
