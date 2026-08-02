import { X } from "lucide-react";

import { DataPeriodSummary } from "../analysis/DataPeriodSummary";
import { formatStoreChange } from "../market/formatStoreChange";
import { CLUSTER_LABELS } from "../market/model";
import type { ScoreDecisionBlocker } from "../../services/marketAnalysis";
import type { ProductWorkspaceModel } from "./useProductWorkspaceModel";

const SCORE_BLOCKER_LABELS: Record<ScoreDecisionBlocker, string> = {
  fixture_present: "개발용 fixture가 포함됨",
  coverage_below_60: "사용 가능한 지표가 60% 미만",
  confidence_below_60: "근거 신뢰도가 60% 미만",
  required_metric_missing: "매출 또는 유동 수요 필수 지표가 누락됨",
  peer_sample_too_small: "비교 상권 표본이 30개 미만이거나 확인되지 않음",
  cluster_evidence_too_weak: "업종 집적효과 근거가 충분하지 않음",
};

function EvidenceDialog({ model }: { model: ProductWorkspaceModel }) {
  const { analysis, background } = model.marketData.marketAnalysis;
  const { market, nearby } = model.marketData;
  const { category, radius } = model.selection;
  const { setEvidenceOpen } = model.panels;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => setEvidenceOpen(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="데이터 산정 근거"
        className="evidence-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="데이터 산정 근거 닫기"
          onClick={() => setEvidenceOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="evidence-modal-content" aria-label="데이터 산정 근거 내용" tabIndex={0}>
          <p className="modal-eyebrow">데이터 기준과 시점</p>
          <h2>이 숫자는 무엇을 뜻하나요?</h2>
          <DataPeriodSummary
            analysis={analysis}
            background={background}
            nearbyEvidence={nearby.data?.evidence ?? []}
          />
          <div className="evidence-grid">
            {analysis && <AnalysisEvidence analysis={analysis} />}
            <div>
              <span>가게 수의 변화</span>
              <b>새로 열고 닫은 가게 수</b>
              <p>상권 전체를 합친 숫자예요. 한 가게의 경영 상태를 뜻하지는 않습니다.</p>
            </div>
            <div>
              <span>사람이 많은 시간</span>
              <b>6개 시간대로 나눈 유동인구</b>
              <p>시간대끼리 얼마나 차이 나는지 보여줘요. 개인의 이동을 추적한 정보는 아닙니다.</p>
            </div>
            <div>
              <span>상권 점수</span>
              <b>LocalTwin score v{analysis?.score.formula_version ?? "1.1.0"}</b>
              <p>
                수요, 매출, 점포 수와 변화 추이를 함께 본 보조 점수예요.
                {analysis ? ` 현재 근거 신뢰도는 ${analysis.score.confidence}%입니다.` : ""}
              </p>
            </div>
            <div>
              <span>이 화면이 보는 범위</span>
              <b>
                {market.name} · {category}
              </b>
              <p>
                지도 점포는 상권 안에서, 주변 점포 비교는 중심에서 {radius}m 안에서 봅니다.
                {analysis ? ` 현재 선택한 자료 시점은 ${analysis.period}입니다.` : ""}
              </p>
            </div>
          </div>
          <button type="button" className="primary-action" onClick={() => setEvidenceOpen(false)}>
            확인
          </button>
        </div>
      </section>
    </div>
  );
}

function ReportDialog({ model }: { model: ProductWorkspaceModel }) {
  const { analysis } = model.marketData.marketAnalysis;
  const { market } = model.marketData;
  const { category, period } = model.selection;
  const { setReportOpen } = model.panels;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => setReportOpen(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="상권 분석 보고서"
        className="compare-modal report-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="상권 분석 보고서 닫기"
          onClick={() => setReportOpen(false)}
        >
          <X size={20} />
        </button>
        <p className="modal-eyebrow">LOCAL TWIN · ANALYSIS REPORT</p>
        <h2>{market.name} 상권 분석 보고서</h2>
        <p className="modal-description">
          {category} · {period || analysis?.period || "기준 기간 확인 중"}
        </p>
        <div className="evidence-grid">
          <div>
            <span>분석 요약</span>
            <b>{market.grade}</b>
            <p>{market.insight}</p>
          </div>
          <div>
            <span>입지 점수</span>
            <b>{analysis ? `${Math.round(analysis.score.score)} / 100` : "근거 확인 중"}</b>
            <p>점수는 선택 업종의 수요·경쟁·변화·접근성 근거를 함께 읽기 위한 보조 지표입니다.</p>
          </div>
          <div>
            <span>읽는 방법</span>
            <b>숫자보다 기준을 함께 확인</b>
            <p>
              상권 경계 집계와 반경 내 점포 수는 서로 다른 공간 기준이므로 한 값처럼 합치지
              않습니다.
            </p>
          </div>
        </div>
        <button type="button" className="primary-action" onClick={() => setReportOpen(false)}>
          확인
        </button>
      </section>
    </div>
  );
}

function AnalysisEvidence({
  analysis,
}: {
  analysis: NonNullable<ProductWorkspaceModel["marketData"]["marketAnalysis"]["analysis"]>;
}) {
  return (
    <>
      <div>
          <span>현재 판단</span>
        <b>
          {analysis.score.band} · 신뢰도 {analysis.score.confidence}%
        </b>
        <p>
          {analysis.score.decision_status === "supported"
            ? "현재 근거 범위에서 비교 판단을 지원합니다."
            : `근거가 충분하지 않습니다. ${analysis.score.decision_blockers.map((blocker) => SCORE_BLOCKER_LABELS[blocker]).join(" · ")}`}
        </p>
      </div>
      <div>
          <span>확인된 자료 범위</span>
        <b>{analysis.score.data_coverage}%</b>
        <p>누락 지표는 0점으로 단정하지 않고 component별 50점 중립값 방향으로 수축했습니다.</p>
      </div>
      <div>
          <span>상권의 특징</span>
        <b>
          {CLUSTER_LABELS[analysis.score.cluster.classification] ??
            analysis.score.cluster.classification}
        </b>
        <p>{analysis.score.cluster.explanation}</p>
      </div>
      {analysis.score.reasons.slice(0, 3).map((reason) => (
        <div key={`${reason.label}-${reason.tone}`}>
          <span>
            {reason.tone === "positive"
              ? "긍정 근거"
              : reason.tone === "caution"
                ? "주의 근거"
                : "참고 근거"}
          </span>
          <b>
            {reason.label} · {reason.value.toLocaleString("ko-KR")}
            {reason.unit}
          </b>
          <p>
            {reason.message} 출처: {reason.source_name}, {reason.period}.
          </p>
        </div>
      ))}
      {analysis.score.limitations.length > 0 && (
        <div>
          <span>데이터 한계</span>
          <b>누락 지표를 0점으로 처리하지 않음</b>
          <p>{analysis.score.limitations.join(" ")}</p>
        </div>
      )}
    </>
  );
}

function ComparisonDialog({ model }: { model: ProductWorkspaceModel }) {
  const { markets } = model.catalogState;
  const { comparison } = model.marketData.marketAnalysis;
  const { marketKey, category, radius } = model.selection;
  const { chooseMarket } = model.actions;
  const { setCompareOpen } = model.panels;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => setCompareOpen(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="상권 비교"
        className="compare-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="상권 비교 닫기"
          onClick={() => setCompareOpen(false)}
        >
          <X size={20} />
        </button>
        <p className="modal-eyebrow">LOCATION COMPARISON</p>
        <h2>같은 조건에서 후보 상권을 비교합니다.</h2>
        <p className="modal-description">
          {category} · 반경 {radius}m · 2025년 1분기 기준
        </p>
        <div className="compare-table">
          {Object.entries(markets).map(([key, item]) => {
            const actual = comparison?.[key as keyof typeof comparison];
            const score = actual ? Math.round(actual.score.score) : null;
            const flow = actual?.raw.total_flow;
            const netOpening = actual ? actual.raw.opening_count - actual.raw.closure_count : null;
            return (
              <button
                key={key}
                type="button"
                className={key === marketKey ? "compare-row selected" : "compare-row"}
                onClick={() => {
                  chooseMarket(key as typeof marketKey);
                  setCompareOpen(false);
                }}
              >
                <span>{item.name}</span>
                <b>{score ?? "—"}</b>
                <small>
                  유동{" "}
                  {flow == null ? "조회 전" : `${Math.round(flow).toLocaleString("ko-KR")}명/분기`}{" "}
                  · 점포 순변화 {netOpening == null ? "—" : formatStoreChange(netOpening)}
                </small>
              </button>
            );
          })}
        </div>
        <p className="modal-footnote">
          서로 다른 상권 유형을 비교할 때는 점수보다 각 지표와 데이터 범위를 함께 확인하세요.
        </p>
      </section>
    </div>
  );
}

export function WorkspaceDialogs({ model }: { model: ProductWorkspaceModel }) {
  return (
    <>
      {model.panels.evidenceOpen && <EvidenceDialog model={model} />}
      {model.panels.reportOpen && <ReportDialog model={model} />}
      {model.panels.compareOpen && <ComparisonDialog model={model} />}
    </>
  );
}
