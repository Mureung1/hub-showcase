import { X } from "lucide-react";
import { lazy, Suspense } from "react";

import { DataPeriodSummary } from "../analysis/DataPeriodSummary";
import { CLUSTER_LABELS } from "../market/model";
import type { ScoreDecisionBlocker } from "../../services/marketAnalysis";
import type { ProductWorkspaceModel } from "./useProductWorkspaceModel";

const SceneWorkspace = lazy(() =>
  import("../../components/SceneWorkspace").then((module) => ({ default: module.SceneWorkspace })),
);

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
        <p className="modal-eyebrow">EVIDENCE · SOURCE PERIODS</p>
        <h2>이 화면의 숫자는 이렇게 읽습니다.</h2>
        <DataPeriodSummary
          analysis={analysis}
          background={background}
          nearbyEvidence={nearby.data?.evidence ?? []}
        />
        <div className="evidence-grid">
          {analysis && <AnalysisEvidence analysis={analysis} />}
          <div>
            <span>상권 변화</span>
            <b>서울시 상권분석서비스</b>
            <p>
              개업·폐업은 상권·서비스업종 단위 집계입니다. 개별 점포의 경영 상태로 해석하지
              않습니다.
            </p>
          </div>
          <div>
            <span>시간대 수요</span>
            <b>서울시 길단위인구 집계</b>
            <p>6개 시간대 공식 집계를 0~100으로 정규화해 표시합니다. 개인 이동 정보가 아닙니다.</p>
          </div>
          <div>
            <span>입지 점수</span>
            <b>LocalTwin score v{analysis?.score.formula_version ?? "1.1.0"}</b>
            <p>
              서울 peer 백분위의 수요·점포당 매출·폐업·업종 밀도·순증률만 반영합니다.
              {analysis ? ` 현재 근거 신뢰도는 ${analysis.score.confidence}%입니다.` : ""}
            </p>
          </div>
          <div>
            <span>분석 범위</span>
            <b>
              {market.name} · {category}
            </b>
            <p>
              지도 탐색 반경은 {radius}m이며, 우측 상권 집계의 현재 응답 기간은
              {analysis ? ` ${analysis.period}` : " 확인되지 않았습니다"}.
            </p>
          </div>
        </div>
        <button type="button" className="primary-action" onClick={() => setEvidenceOpen(false)}>
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
        <span>현재 판정</span>
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
        <span>데이터 반영 범위</span>
        <b>{analysis.score.data_coverage}%</b>
        <p>누락 지표는 0점으로 단정하지 않고 component별 50점 중립값 방향으로 수축했습니다.</p>
      </div>
      <div>
        <span>특수상권 판정</span>
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
                  · 순증 {netOpening == null ? "—" : `${netOpening > 0 ? "+" : ""}${netOpening}`}
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
      {model.panels.compareOpen && <ComparisonDialog model={model} />}
      {model.panels.sceneOpen && (
        <Suspense
          fallback={
            <div className="scene-loading" role="status">
              3D 장소 도구를 불러오는 중입니다.
            </div>
          }
        >
          <SceneWorkspace
            onClose={() => model.panels.setSceneOpen(false)}
            restoreFocusExternally={model.panels.restoreSceneFocus}
          />
        </Suspense>
      )}
    </>
  );
}
