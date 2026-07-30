import { CircleHelp, Target, TrendingUp, UsersRound, X } from "lucide-react";

import type { MarketAnalysis } from "../../services/marketAnalysis";
import { TermHelp } from "./TermHelp";
import type {
  AnalysisScope,
  AnalysisTopic,
  CategorySelection,
  Market,
  MarketStore,
} from "./types";
import type { AnalysisState } from "./useMarketAnalysis";

function formatQuarterPeriod(period: string) {
  const match = /^(\d{4})([1-4])$/.exec(period);
  return match ? `${match[1]}년 ${match[2]}분기` : period;
}

function analysisTopicLabel(topic: AnalysisTopic) {
  if (topic === "overview") return "종합 분석";
  if (topic === "stores") return "점포·개폐업";
  if (topic === "competition") return "경쟁 현황";
  if (topic === "sales") return "매출·소비";
  if (topic === "population") return "주거·직장인구";
  return "유동인구";
}

export function InspectorHeader({
  market,
  selected,
  categorySelection,
  categoryCoverageReason,
  topic,
  analysisState,
  onAnalysisRetry,
  onClosePanel,
  onClearSelection,
}: {
  market: Market;
  selected: MarketStore | null;
  categorySelection: CategorySelection;
  categoryCoverageReason: string;
  topic: AnalysisTopic;
  analysisState: AnalysisState;
  onAnalysisRetry: () => void;
  onClosePanel: () => void;
  onClearSelection: () => void;
}) {
  const coverageLabel =
    categorySelection.coverage === "full"
      ? "상세 분석 지원 업종"
      : categorySelection.coverage === "partial"
        ? "점포 위치·경쟁만 제공"
        : "선택 상권에 점포 없음";
  const coverageDetail =
    categorySelection.coverage === "full"
      ? "이 업종은 상세 분석 대상입니다. 실제 제공 자료는 선택한 분기별로 다릅니다."
      : categoryCoverageReason;

  return (
    <>
      <div className="inspector-title">
        <div>
          <p>{selected?.name ?? market.name}</p>
          <span>
            {selected
              ? `${selected.category} · ${selected.address ?? market.address}`
              : `${categorySelection.name} · 상권 분석`}
          </span>
        </div>
        <div className="inspector-actions">
          {selected && (
            <button type="button" className="text-button" onClick={onClearSelection}>
              점포 선택 해제
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label="분석 결과 닫기"
            onClick={onClosePanel}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className={`inspector-coverage is-${categorySelection.coverage}`} role="status">
        <b>{categorySelection.name}</b>
        <span>{coverageLabel}</span>
        <p>{coverageDetail}</p>
      </div>
      <p className="inspector-topic" aria-live="polite">
        {analysisTopicLabel(topic)}
      </p>
      {analysisState === "error" && categorySelection.coverage === "full" && (
        <div className="nearby-state is-error" role="alert">
          <b>상권 분석 데이터를 불러오지 못했습니다.</b>
          <span>예시 값으로 바꾸지 않았습니다. 연결을 확인한 뒤 다시 시도해 주세요.</span>
          <button type="button" onClick={onAnalysisRetry}>
            다시 시도
          </button>
        </div>
      )}
    </>
  );
}

export function InspectorScoreAndCompetition({
  market,
  categorySelection,
  score,
  sameCategoryCount,
  analysis,
  analysisScope,
  topic,
  onEvidenceOpen,
}: {
  market: Market;
  categorySelection: CategorySelection;
  score: number | null;
  sameCategoryCount: number;
  analysis: MarketAnalysis | null;
  analysisScope: AnalysisScope;
  topic: AnalysisTopic;
  onEvidenceOpen: () => void;
}) {
  const showsScore =
    categorySelection.coverage === "full" &&
    analysis !== null &&
    score !== null &&
    (topic === "overview" || topic === "competition");
  const showsCompetition =
    categorySelection.coverage !== "unavailable" &&
    (analysisScope === "radius" || analysis !== null) &&
    (topic === "overview" || topic === "competition");

  if (!showsScore && !showsCompetition) return null;

  return (
    <>
      {showsScore && analysis && (
        <section className="score-section">
          <div className="score-heading">
            <span>
              상권·업종 비교점수
              <TermHelp
                term="상권·업종 비교점수"
                description="선택한 업종을 기준으로 상권 전체의 수요, 경쟁, 매출 자료를 비교한 점수입니다. 선택한 개별 점포의 평가점수나 성공 확률이 아닙니다."
              />
            </span>
            <strong>{score}</strong>
            <small>/ 100</small>
          </div>
          <p className="score-caption">
            {formatQuarterPeriod(analysis.period)} 부분 자료로 계산했습니다. 빠진 지표는 중립값으로
            반영됩니다.
          </p>
          <div className="score-key-metrics" aria-label="점수 핵심 지표">
            <div>
              <UsersRound aria-hidden="true" />
              <span>선택 분기 길단위인구 추정치</span>
              <b>
                {analysis.raw.total_flow == null
                  ? "자료 없음"
                  : `${Math.round(analysis.raw.total_flow).toLocaleString("ko-KR")}명/분기`}
              </b>
            </div>
            <div>
              <Target aria-hidden="true" />
              <span>점포 위치 기준 동일 업종</span>
              <b>{sameCategoryCount.toLocaleString("ko-KR")}개</b>
              <small>2026.06 점포 스냅샷</small>
            </div>
            <div>
              <TrendingUp aria-hidden="true" />
              <span>선택 분기 상권·업종 추정매출</span>
              <b>
                {analysis.raw.monthly_sales_amount == null
                  ? "자료 없음"
                  : `${Math.round(analysis.raw.monthly_sales_amount).toLocaleString("ko-KR")}원/분기`}
              </b>
              <small>개별 점포 매출 아님</small>
            </div>
          </div>
          <button type="button" className="evidence-button" onClick={onEvidenceOpen}>
            포함된 자료와 빠진 자료 보기 <CircleHelp size={15} />
          </button>
        </section>
      )}
      {showsCompetition && (
        <section className="metric-section">
          <div className="section-title">
            <span>경쟁 현황</span>
            <small>점포 위치 2026.06 기준 · 서울시 상권 경계</small>
          </div>
          <div className="competition-chart">
            <div className="competition-stat">
              <span>{analysisScope === "radius" ? "선택 지점 반경 내" : `${market.name} 경계 내`}</span>
              <b>{sameCategoryCount.toLocaleString("ko-KR")}개</b>
              <small>동일 업종 점포</small>
            </div>
            <div className="legend-list">
              <span>
                <i className="green" /> {categorySelection.name} <b>{sameCategoryCount}</b>
              </span>
              <small>2026.06 점포 위치 스냅샷에서 같은 업종만 집계합니다.</small>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

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

function plainReasonMessage(reason: ScoreReason) {
  if (reason.tone === "info") {
    return reason.message
      .replaceAll("peer group", "비교 상권")
      .replaceAll("peer", "비교 상권")
      .replaceAll("cohort", "같은 시기 점포군");
  }

  const percentile = Math.round(reason.percentile);
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
  const verdict = summary?.verdict ??
    (analysis.score.decision_status === "insufficient_evidence"
      ? "insufficient"
      : analysis.score.score >= 65
        ? "suitable"
        : "caution");
  const strengths =
    summary?.strengths ?? analysis.score.reasons.filter((reason) => reason.tone === "positive").slice(0, 2);
  const risks =
    summary?.risks ?? analysis.score.reasons.filter((reason) => reason.tone === "caution").slice(0, 2);
  const missingEvidence = (summary?.missing_evidence ?? []).map(
    (label) => MISSING_EVIDENCE_LABELS[label] ?? label.replaceAll("cohort", "같은 시기 점포군"),
  );
  const blockerLabels = analysis.score.decision_blockers.map(
    (blocker) => BLOCKER_LABELS[blocker] ?? blocker,
  );
  const confidence = Math.round(analysis.score.confidence);
  const availableMetricCount = analysis.score.metric_evidence.length;
  const totalMetricCount = Math.max(availableMetricCount + missingEvidence.length, availableMetricCount);
  const verdictLabel =
    verdict === "suitable" ? "상대적으로 양호" : verdict === "caution" ? "추가 확인 필요" : "판단 보류";
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
        비교 표본을 합친 값입니다. 현재 지표 {availableMetricCount}/{totalMetricCount}개,
        점수 반영 범위 {Math.round(analysis.score.data_coverage)}%입니다.
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
          <b>비교 상권</b>: 같은 유형 또는 현재 서비스가 지원하는 상권 중 수치를 비교한 대상입니다.
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
