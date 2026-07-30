import type { MarketAnalysis } from "../../services/marketAnalysis";
import type { AnalysisTopic, CategorySelection, MarketStore } from "./types";

type ScoreReason = MarketAnalysis["score"]["reasons"][number];

const LOWER_IS_BETTER = new Set(["폐업률", "동일 업종 밀도"]);

const MISSING_EVIDENCE_LABELS: Record<string, string> = {
  "동일 cohort 생존율": "같은 시기에 문을 연 점포의 생존율",
  "수요 증가율": "분기별 수요 증가율",
  "업종 다양성": "상권 내 업종 다양성",
  "매출 증가율": "분기별 매출 증가율",
  "대중교통 접근성": "대중교통 접근성",
  "보행 접근성": "보행 접근성",
};

const BLOCKER_LABELS: Record<string, string> = {
  fixture_present: "예시 데이터가 포함됨",
  coverage_below_60: "점수에 필요한 지표의 60% 미만만 갖춰짐",
  confidence_below_60: "자료의 신뢰도·최신성·표본을 합친 근거 충족도가 60% 미만",
  required_metric_missing: "점포당 매출 또는 유동인구 핵심 지표가 없음",
  peer_sample_too_small: "비교할 상권 표본이 30개 미만",
  cluster_evidence_too_weak: "업종 밀집 효과를 판단할 근거가 약함",
};

function replaceInternalTerms(message: string) {
  return message
    .replaceAll("peer group", "비교 상권")
    .replaceAll("peer", "비교 상권")
    .replaceAll("cohort", "같은 시기 점포군");
}

function plainReasonMessage(reason: ScoreReason) {
  if (reason.tone === "info") return replaceInternalTerms(reason.message);

  const percentileMatch = /peer 백분위가 (\d+(?:\.\d+)?)/.exec(reason.message);
  if (!percentileMatch) return replaceInternalTerms(reason.message);

  const percentile = Math.round(Number(percentileMatch[1]));
  const lowerIsBetter = LOWER_IS_BETTER.has(reason.label);
  if (reason.tone === "positive") {
    return lowerIsBetter
      ? `${reason.label}이 비교 상권의 약 ${100 - percentile}%보다 낮습니다.`
      : `${reason.label}이 비교 상권의 약 ${percentile}%보다 높습니다.`;
  }
  return lowerIsBetter
    ? `${reason.label}이 비교 상권의 약 ${percentile}%보다 높습니다.`
    : `${reason.label}이 비교 상권의 약 ${100 - percentile}%보다 낮습니다.`;
}

export function InspectorDecisionSummary({
  categorySelection,
  analysis,
  selected,
  topic,
}: {
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  selected: MarketStore | null;
  topic: AnalysisTopic;
}) {
  if (categorySelection.coverage !== "full" || analysis === null || topic !== "overview") {
    return null;
  }

  const summary = analysis.score.decision_summary;
  const verdict =
    summary?.verdict ??
    (analysis.score.decision_status === "insufficient_evidence"
      ? "insufficient"
      : analysis.score.score >= 65
        ? "suitable"
        : "caution");
  const strengths = analysis.score.reasons
    .filter((reason) => reason.tone === "positive")
    .slice(0, 2);
  const risks = analysis.score.reasons
    .filter((reason) => reason.tone === "caution")
    .slice(0, 2);
  const missingEvidence = (summary?.missing_evidence ?? []).map(
    (label) => MISSING_EVIDENCE_LABELS[label] ?? label.replaceAll("cohort", "같은 시기 점포군"),
  );
  const blockerLabels = analysis.score.decision_blockers.map(
    (blocker) => BLOCKER_LABELS[blocker] ?? blocker,
  );
  const confidence = Math.round(analysis.score.confidence);
  const availableMetricCount = analysis.score.metric_evidence.length;
  const totalMetricCount = Math.max(
    availableMetricCount + missingEvidence.length,
    availableMetricCount,
  );
  const verdictLabel =
    verdict === "suitable"
      ? "상대적으로 양호"
      : verdict === "caution"
        ? "추가 확인 필요"
        : "판단 보류";
  const headline =
    verdict === "suitable"
      ? `현재 비교 자료에서는 ${categorySelection.name} 업종에 상대적으로 양호한 조건이 확인됩니다.`
      : verdict === "caution"
        ? `현재 비교 자료에서는 ${categorySelection.name} 업종의 경쟁 또는 변화 지표를 더 확인해야 합니다.`
        : `현재 확보된 자료만으로 ${categorySelection.name} 운영 적합성을 판단하기 어려워 판단을 보류합니다.`;

  return (
    <section className={`decision-summary is-${verdict}`} aria-label="데이터 비교 결과">
      <div className="decision-summary-heading">
        <div>
          <span>데이터 비교 결과</span>
          <strong>{verdictLabel}</strong>
        </div>
        <small>분석 근거 충족도 {confidence}%</small>
      </div>
      <p>{headline}</p>
      <p className="decision-confidence-note">
        이 수치는 성공 확률이 아닙니다. 점수에 필요한 지표의 보유 여부, 자료 신뢰도, 최신성,
        비교 표본을 합친 값입니다. 현재 지표 {availableMetricCount}/{totalMetricCount}개, 점수 반영
        범위 {Math.round(analysis.score.data_coverage)}%입니다.
      </p>
      <div className="decision-reasons">
        <div>
          <b>확인된 강점</b>
          {strengths.length > 0 ? (
            <ul>
              {strengths.map((reason) => (
                <li key={`positive-${reason.label}`}>{plainReasonMessage(reason)}</li>
              ))}
            </ul>
          ) : (
            <small>확인된 자료 중 뚜렷한 우위 지표가 아직 없습니다.</small>
          )}
        </div>
        <div>
          <b>추가 확인할 점</b>
          {risks.length > 0 ? (
            <ul>
              {risks.map((reason) => (
                <li key={`caution-${reason.label}`}>{plainReasonMessage(reason)}</li>
              ))}
            </ul>
          ) : (
            <small>확인된 자료에서 뚜렷한 위험 지표는 없습니다.</small>
          )}
        </div>
      </div>
      <div className="decision-data-status">
        <span>판단을 보류한 이유</span>
        {blockerLabels.length > 0 && (
          <ul>
            {blockerLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        )}
        {missingEvidence.length > 0 && (
          <small>추가로 필요한 지표: {missingEvidence.join(", ")}</small>
        )}
      </div>
      <details className="decision-glossary">
        <summary>비교 기준 용어 보기</summary>
        <p>
          <b>비교 상권</b>: 같은 유형 또는 현재 서비스가 지원하는 상권 중 수치를 비교한
          대상입니다.
        </p>
        <p>
          <b>같은 시기 점포군</b>: 비슷한 시기에 문을 연 점포를 한 묶음으로 보고 생존 여부를
          비교하는 기준입니다.
        </p>
      </details>
      <small className="decision-scope-note">
        {selected
          ? "비교점수는 상권 전체와 업종 기준입니다. 선택한 점포 자체의 점수가 아닙니다."
          : "비교점수는 상권 전체와 업종 기준입니다. 실제 임대료와 현장 유동은 별도로 확인해야 합니다."}
      </small>
    </section>
  );
}
