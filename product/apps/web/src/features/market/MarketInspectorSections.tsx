import { useState } from "react";
import { CircleHelp, FileText, Target, TrendingUp, UsersRound, X } from "lucide-react";

import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis, MarketStoreTrend } from "../../services/marketAnalysis";
import { MetricGuide } from "./MetricGuide";
import { TermHelp } from "./TermHelp";
import type { AnalysisScope, AnalysisTopic, CategorySelection, Market, MarketStore } from "./types";
import type { FlowState } from "./useMarketAnalysis";
import type { AnalysisState } from "./useMarketAnalysis";

function formatQuarterPeriod(period: string) {
  const match = /^(\d{4})([1-4])$/.exec(period);
  return match ? `${match[1]}년 ${match[2]}분기` : period;
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
  const topicLabel =
    topic === "overview"
      ? "종합 분석"
      : topic === "stores"
        ? "점포·개폐업"
        : topic === "competition"
          ? "경쟁 현황"
          : topic === "sales"
            ? "매출·소비"
            : topic === "population"
              ? "주거·직장인구"
              : "유동인구";

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
        <span>
          {categorySelection.coverage === "full"
            ? "전체 분석 지원"
            : categorySelection.coverage === "partial"
              ? "점포·경쟁 지표만 제공"
              : "이 상권에 점포 없음"}
        </span>
        <p>{categoryCoverageReason}</p>
      </div>
      <p className="inspector-topic" aria-live="polite">
        {topicLabel}
      </p>
      {topic === "overview" && <MetricGuide selection={categorySelection} />}
      {analysisState === "error" && categorySelection.coverage === "full" && (
        <div className="nearby-state is-error" role="alert">
          <b>상권 분석 데이터를 불러오지 못했습니다.</b>
          <span>
            오류를 정적 예시 값으로 바꾸지 않았습니다. 연결을 확인한 뒤 다시 시도해 주세요.
          </span>
          <button type="button" onClick={onAnalysisRetry}>
            다시 시도
          </button>
        </div>
      )}
    </>
  );
}

const DECISION_LABELS = {
  suitable: "검토 가능",
  caution: "주의",
  insufficient: "근거 부족",
} as const;
type DecisionVerdict = keyof typeof DECISION_LABELS;

function fallbackDecision(analysis: MarketAnalysis) {
  const insufficient = analysis.score.decision_status === "insufficient_evidence";
  const verdict: DecisionVerdict = insufficient
    ? "insufficient"
    : analysis.score.score >= 65
      ? "suitable"
      : "caution";
  return {
    verdict,
    headline: insufficient
      ? "현재 자료만으로 운영 적합성을 판단하기 어렵습니다. 누락된 근거를 먼저 확인해 주세요."
      : verdict === "suitable"
        ? "현재 비교 근거에서 검토할 만한 조건이 확인됩니다."
        : "현재 비교 근거에서 경쟁과 변화 지표를 더 확인할 필요가 있습니다.",
    strengths: analysis.score.reasons.filter((reason) => reason.tone === "positive").slice(0, 2),
    risks: analysis.score.reasons.filter((reason) => reason.tone === "caution").slice(0, 2),
    missingEvidence: [],
  };
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
  if (categorySelection.coverage !== "full" || analysis === null || topic !== "overview")
    return null;

  const summary = analysis.score.decision_summary;
  const fallback = fallbackDecision(analysis);
  const verdict = summary?.verdict ?? fallback.verdict;
  const headline = summary?.headline ?? fallback.headline;
  const strengths = summary?.strengths ?? fallback.strengths;
  const risks = summary?.risks ?? fallback.risks;
  const missingEvidence = summary?.missing_evidence ?? fallback.missingEvidence;
  const availableData = [
    "점포·개폐업",
    ...(analysis.raw.monthly_sales_amount === null ? [] : ["추정매출"]),
    ...(analysis.raw.total_flow === null ? [] : ["유동인구"]),
  ];

  return (
    <section className={`decision-summary is-${verdict}`} aria-label="업종 운영 판단">
      <div className="decision-summary-heading">
        <div>
          <span>{categorySelection.name} 운영 판단</span>
          <strong>{DECISION_LABELS[verdict]}</strong>
        </div>
        <small>근거 신뢰도 {analysis.score.confidence}%</small>
      </div>
      <p>{headline}</p>
      <div className="decision-reasons">
        <div>
          <b>좋은 점</b>
          {strengths.length > 0 ? (
            <ul>
              {strengths.map((reason) => (
                <li key={`positive-${reason.label}`}>{reason.message}</li>
              ))}
            </ul>
          ) : (
            <small>현재 기준에서 뚜렷한 긍정 근거를 확인하지 못했습니다.</small>
          )}
        </div>
        <div>
          <b>주의할 점</b>
          {risks.length > 0 ? (
            <ul>
              {risks.map((reason) => (
                <li key={`caution-${reason.label}`}>{reason.message}</li>
              ))}
            </ul>
          ) : (
            <small>현재 기준에서 뚜렷한 위험 근거를 확인하지 못했습니다.</small>
          )}
        </div>
      </div>
      <div className="decision-data-status">
        <span>선택 분기 확인 자료</span>
        <b>{availableData.join(" · ")}</b>
        {missingEvidence.length > 0 && <small>누락: {missingEvidence.join(", ")}</small>}
      </div>
      <small className="decision-scope-note">
        {selected
          ? "입지 점수는 상권 전체 기준입니다. 선택 점포 주변 경쟁은 아래 점포 목록과 지도에서 따로 확인합니다."
          : "입지 점수는 상권 전체 기준입니다. 지도에서 위치를 선택하면 주변 경쟁을 따로 확인할 수 있습니다."}
      </small>
    </section>
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
      {showsScore && (
        <section className="score-section">
          <div className="score-heading">
            <span>
              상권 입지 점수
              <TermHelp
                term="상권 입지 점수"
                description="선택 업종 기준으로 수요, 경쟁, 매출 등 여러 지표를 합쳐 이 상권을 비교한 점수입니다. 실제 개별 점포의 매출이나 성공을 보장하지는 않습니다."
              />
            </span>
            <strong>{score}</strong>
            <small>/ 100</small>
          </div>
          <b>{market.grade}</b>
          <p className="score-caption">선택 업종 기준으로 이 상권을 비교한 결과입니다.</p>
          <div className="score-key-metrics" aria-label="점수 핵심 지표">
            <div>
              <UsersRound aria-hidden="true" />
              <span>유동인구</span>
              <b>
                {analysis.raw.total_flow == null
                  ? "자료 없음"
                  : `${Math.round(analysis.raw.total_flow).toLocaleString("ko-KR")}명`}
              </b>
            </div>
            <div>
              <Target aria-hidden="true" />
              <span>현재 동일 업종 점포</span>
              <b>{sameCategoryCount}개</b>
            </div>
            <div>
              <TrendingUp aria-hidden="true" />
              <span>추정매출</span>
              <b>
                {analysis.raw.monthly_sales_amount == null
                  ? "자료 없음"
                  : `${Math.round(analysis.raw.monthly_sales_amount).toLocaleString("ko-KR")}원`}
              </b>
            </div>
          </div>
          <button type="button" className="evidence-button" onClick={onEvidenceOpen}>
            점수 산정 근거를 확인해 보세요 <CircleHelp size={15} />
          </button>
        </section>
      )}
      {showsCompetition && (
        <section className="metric-section">
          <div className="section-title">
            <span>경쟁 현황</span>
            <small>최신 점포 위치 · 서울시 상권 경계</small>
          </div>
          <div className="competition-chart">
            <div className="competition-stat">
              <span>현재 범위 내</span>
              <b>{sameCategoryCount}개</b>
              <small>동일 업종 점포</small>
            </div>
            <div className="legend-list">
              <span>
                <i className="green" /> {categorySelection.name} <b>{sameCategoryCount}</b>
              </span>
              <small>선택 업종과 같은 점포만 집계합니다.</small>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export function InspectorTurnoverAndSales({
  categorySelection,
  analysis,
  topic,
}: {
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  topic: AnalysisTopic;
}) {
  if (categorySelection.coverage !== "full" || analysis === null) return null;

  const openingCount = analysis.raw.opening_count;
  const closureCount = analysis.raw.closure_count;
  const turnoverMaximum = Math.max(openingCount ?? 0, closureCount ?? 0, 1);

  return (
    <>
      {(topic === "overview" || topic === "stores") && (
        <section className="metric-section">
          <div className="section-title">
            <span>개·폐업 현황</span>
            <small>{formatQuarterPeriod(analysis.period)}</small>
          </div>
          {openingCount !== null && closureCount !== null ? (
            <>
              <div
                className="turnover-bars"
                role="img"
                aria-label={`개업 ${openingCount}개, 폐업 ${closureCount}개`}
              >
                <div>
                  <span>개업</span>
                  <i>
                    <b
                      className="positive"
                      style={{ width: `${(openingCount / turnoverMaximum) * 100}%` }}
                    />
                  </i>
                  <strong>{openingCount}개</strong>
                </div>
                <div>
                  <span>폐업</span>
                  <i>
                    <b
                      className="negative"
                      style={{ width: `${(closureCount / turnoverMaximum) * 100}%` }}
                    />
                  </i>
                  <strong>{closureCount}개</strong>
                </div>
              </div>
              <div className="turnover-summary">
                <span>선택 분기의 업종별 집계</span>
                <b>
                  순증 {openingCount - closureCount > 0 ? "+" : ""}
                  {openingCount - closureCount}개
                </b>
              </div>
            </>
          ) : (
            <p className="population-boundary-note">개·폐업 집계 데이터를 불러오지 못했습니다.</p>
          )}
          <p className="turnover-note">
            월별 변화가 아닌 선택 분기 합계입니다. 기간별 추이는 후속 분석에서 제공합니다.
          </p>
        </section>
      )}
      {topic === "sales" && (
        <section className="metric-section">
          <div className="section-title">
            <span>추정매출</span>
            <small>{analysis.period}</small>
          </div>
          <div className="sales-metric-grid">
            <div>
              <span>분기 매출</span>
              <b>
                {analysis.raw.monthly_sales_amount == null
                  ? "근거 없음"
                  : `${Math.round(analysis.raw.monthly_sales_amount).toLocaleString("ko-KR")}원`}
              </b>
            </div>
            <div>
              <span>분기 결제 건수</span>
              <b>
                {analysis.raw.monthly_sales_count == null
                  ? "근거 없음"
                  : `${Math.round(analysis.raw.monthly_sales_count).toLocaleString("ko-KR")}건`}
              </b>
            </div>
          </div>
          <p className="population-boundary-note">
            서울시 추정매출 집계이며 실제 개별 점포 매출이 아닙니다.
          </p>
        </section>
      )}
    </>
  );
}

export function InspectorStoreTrend({
  categorySelection,
  trend,
  trendState,
  topic,
}: {
  categorySelection: CategorySelection;
  trend: MarketStoreTrend | null;
  trendState: "loading" | "ready" | "unavailable" | "error";
  topic: AnalysisTopic;
}) {
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  if (
    categorySelection.coverage !== "full" ||
    (topic !== "overview" && topic !== "stores") ||
    trendState === "loading"
  ) {
    return null;
  }
  if (!trend || trend.points.length === 0) {
    return (
      <section className="metric-section">
        <div className="section-title">
          <span>분기별 개·폐업 변화</span>
          <small>공식 분기 자료</small>
        </div>
        <p className="population-boundary-note">여러 분기를 비교할 개·폐업 자료가 없습니다.</p>
      </section>
    );
  }
  const availableTrend = trend;

  const selected = availableTrend.points.filter(
    (point) => selectedPeriods.length === 0 || selectedPeriods.includes(point.period),
  );
  const opening = selected.reduce((total, point) => total + point.opening_count, 0);
  const closure = selected.reduce((total, point) => total + point.closure_count, 0);
  const net = opening - closure;

  function togglePeriod(period: string) {
    setSelectedPeriods((current) => {
      const currentSelection =
        current.length === 0 ? availableTrend.points.map((point) => point.period) : current;
      const next = currentSelection.includes(period)
        ? currentSelection.filter((value) => value !== period)
        : [...currentSelection, period].sort();
      return next.length === 0 ? currentSelection : next;
    });
  }

  return (
    <section className="trend-section">
      <div className="section-title">
        <span>분기별 개·폐업 변화</span>
        <small>선택한 분기만 합산</small>
      </div>
      <div className="trend-periods" aria-label="비교할 분기 선택">
        {availableTrend.points.map((point) => {
          const isSelected = selectedPeriods.length === 0 || selectedPeriods.includes(point.period);
          return (
            <button
              key={point.period}
              type="button"
              aria-pressed={isSelected}
              onClick={() => togglePeriod(point.period)}
            >
              {formatQuarterPeriod(point.period)}
            </button>
          );
        })}
      </div>
      <div className="trend-summary" role="status">
        <span>개업 {opening}개</span>
        <span>폐업 {closure}개</span>
        <b>
          순증 {net > 0 ? "+" : ""}
          {net}개
        </b>
      </div>
      <div className="trend-list">
        {trend.points.map((point) => (
          <div key={point.period}>
            <b>{formatQuarterPeriod(point.period)}</b>
            <span>
              개업 {point.opening_count} · 폐업 {point.closure_count}
            </span>
            <strong>
              순증 {point.net_opening_count > 0 ? "+" : ""}
              {point.net_opening_count}
            </strong>
          </div>
        ))}
      </div>
      <p className="metric-note">
        여러 분기를 고르면 개업·폐업·순증만 합산합니다. 분기별 점포 수와 매출·유동인구는 서로 다른
        시점의 값이므로 합산하지 않습니다.
      </p>
    </section>
  );
}

const rankingKeys: Record<AnalysisTopic, string[]> = {
  overview: ["category_store_count", "sales_per_store", "total_flow"],
  stores: ["category_store_count", "opening_count", "closure_count", "net_opening_count"],
  sales: ["monthly_sales_amount", "sales_per_store"],
  competition: ["category_store_count", "same_category_density"],
  flow: ["total_flow", "flow_density"],
  population: [],
  amenities: [],
};

export function InspectorRankings({
  categorySelection,
  analysis,
  topic,
}: {
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  topic: AnalysisTopic;
}) {
  const [rankingGroupId, setRankingGroupId] = useState<"same_type" | "supported">("same_type");
  const rankingGroup = analysis?.rankings?.find((group) => group.id === rankingGroupId);
  const visibleRankings =
    rankingGroup?.metrics.filter((metric) => rankingKeys[topic].includes(metric.key)) ?? [];

  if (
    categorySelection.coverage !== "full" ||
    analysis === null ||
    rankingKeys[topic].length === 0
  ) {
    return null;
  }

  return (
    <section className="ranking-section">
      <div className="section-title">
        <span>지표별 순위</span>
        <small>높은 값 순 · 성공 순위 아님</small>
      </div>
      <div className="ranking-group-toggle" aria-label="순위 비교집단">
        <button
          type="button"
          aria-pressed={rankingGroupId === "same_type"}
          onClick={() => setRankingGroupId("same_type")}
        >
          같은 상권 유형
        </button>
        <button
          type="button"
          aria-pressed={rankingGroupId === "supported"}
          onClick={() => setRankingGroupId("supported")}
        >
          지원 상권
        </button>
      </div>
      {visibleRankings.length > 0 ? (
        <div className="ranking-list">
          {visibleRankings.map((metric) => (
            <div key={metric.key}>
              <span>{metric.label}</span>
              {metric.available && metric.rank !== null && metric.percentile !== null ? (
                <>
                  <b>
                    {metric.rank}/{metric.peer_count}위
                  </b>
                  <small>
                    상위 {metric.percentile}% · {metric.value?.toLocaleString("ko-KR")}
                    {metric.unit} · {metric.period}
                  </small>
                </>
              ) : (
                <small>{metric.reason ?? "순위 근거가 없습니다."}</small>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="population-boundary-note">
          API 순위 근거가 없습니다. 정적 fallback 값으로 순위를 만들지 않습니다.
        </p>
      )}
    </section>
  );
}

export function InspectorFlow({
  market,
  categorySelection,
  analysis,
  flowState,
  topic,
  activeHour,
  onActiveHourChange,
}: {
  market: Market;
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  flowState: FlowState;
  topic: AnalysisTopic;
  activeHour: number;
  onActiveHourChange: (hour: number) => void;
}) {
  if (categorySelection.coverage !== "full" || (topic !== "overview" && topic !== "flow")) {
    return null;
  }

  if (flowState === "loading") {
    return (
      <section className="metric-section">
        <div className="section-title">
          <span>시간대별 활동성</span>
        </div>
        <p className="metric-note" role="status">
          시간대별 유동인구를 불러오는 중입니다.
        </p>
      </section>
    );
  }

  if (flowState === "error") {
    return (
      <section className="metric-section">
        <div className="section-title">
          <span>시간대별 활동성</span>
        </div>
        <p className="metric-note" role="alert">
          시간대별 유동인구를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  if (flowState === "unavailable" || analysis === null) {
    return (
      <section className="metric-section">
        <div className="section-title">
          <span>시간대별 활동성</span>
        </div>
        <p className="metric-note" role="status">
          선택한 분기에는 시간대별 유동인구 자료가 없습니다. 다른 분기를 선택하면 확인할 수
          있습니다.
        </p>
      </section>
    );
  }

  const activeBucket = analysis.raw.flow_time_buckets[activeHour];
  const activeFlow = activeBucket?.value ?? null;

  return (
    <>
      <section className="metric-section">
        <div className="section-title">
          <span>시간대별 활동성</span>
          <small>{market.demandLabels[activeHour] ?? "시간 구간 미확인"}</small>
        </div>
        <div className="hour-chart">
          {market.demand.map((value, index) => (
            <button
              key={market.demandLabels[index] ?? index}
              type="button"
              title={
                value === null
                  ? `${market.demandLabels[index]} 데이터 없음`
                  : `${market.demandLabels[index]} 유동인구 상대값 ${value}`
              }
              aria-label={
                value === null
                  ? `${market.demandLabels[index]} 데이터 없음`
                  : `${market.demandLabels[index]} 유동인구 상대값 ${value}`
              }
              className={activeHour === index ? "active" : ""}
              style={{ height: `${value === null ? 10 : Math.max(10, value)}%` }}
              disabled={value === null}
              onClick={() => onActiveHourChange(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="hour-labels">
          {market.demandLabels.map((label) => (
            <span key={label}>{label.replaceAll(":00", "")}</span>
          ))}
        </div>
        <div className="hour-chart-value" role="status">
          <span>{activeBucket?.label ?? "시간 구간 미확인"}</span>
          <strong>
            {activeFlow === null
              ? "데이터 없음"
              : `${Math.round(activeFlow).toLocaleString("ko-KR")}명/분기`}
          </strong>
        </div>
        <p className="metric-note">
          서울 길단위인구의 선택 분기 집계입니다. 막대 높이는 이 상권 안에서 시간대끼리 비교한
          상대값입니다.
          {flowState === "partial" ? " 일부 시간대 자료는 아직 없습니다." : ""}
        </p>
      </section>
    </>
  );
}

export function InspectorFootfall({
  market,
  categorySelection,
  analysis,
  topic,
}: {
  market: Market;
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  topic: AnalysisTopic;
}) {
  if (
    categorySelection.coverage !== "full" ||
    analysis === null ||
    (topic !== "overview" && topic !== "flow")
  ) {
    return null;
  }

  return (
    <section className="population-section single-metric">
      <div>
        <span>유동 인구</span>
        <b>{market.footfall}</b>
      </div>
    </section>
  );
}

export function InspectorPopulation({
  market,
  categorySelection,
  background,
  backgroundState,
  topic,
}: {
  market: Market;
  categorySelection: CategorySelection;
  background: AdminAreaBackground | null;
  backgroundState: "loading" | "ready" | "unavailable" | "error";
  topic: AnalysisTopic;
}) {
  if (categorySelection.coverage !== "full" || (topic !== "overview" && topic !== "population"))
    return null;

  return (
    <section className="population-metric-section">
      <div className="section-title">
        <span>
          상권·행정동 인구
          <TermHelp
            term="상권·행정동 인구"
            description="상권은 사람들이 가게를 이용하는 범위이고, 행정동은 주민센터가 관리하는 동네 범위입니다. 경계가 달라서 사람·일자리 정보를 따로 보여드립니다."
          />
        </span>
        <small>
          공간 단위 분리
          <TermHelp
            term="공간 단위 분리"
            description="상권은 사람들이 가게를 이용하는 범위이고, 행정동은 주민센터가 관리하는 동네 범위입니다. 두 경계가 달라서 숫자를 따로 보여드립니다."
          />
        </small>
      </div>
      {background ? (
        <>
          <p className="population-space-label">
            서울시 상권 경계 · {background.market_resident_population.period}
          </p>
          <div className="population-section population-section-primary">
            <div>
              <span>
                상권 상주인구
                <TermHelp
                  term="상주인구"
                  description="이 상권 범위 안에 거주하는 사람 수입니다. 가게를 이용할 수 있는 주변 생활 고객을 가늠할 때 봅니다."
                />
              </span>
              <b>{market.residentPopulation}</b>
              <small>
                {background.market_resident_population.rank}/
                {background.market_resident_population.peer_count}위 · 상위{" "}
                {background.market_resident_population.percentile}%
              </small>
            </div>
            <div>
              <span>
                상권 직장인구
                <TermHelp
                  term="직장인구"
                  description="이 상권 범위 안에서 일하는 사람 수입니다. 평일 점심이나 퇴근 시간 수요를 가늠할 때 봅니다."
                />
              </span>
              <b>{market.workPopulation}</b>
              <small>
                {background.market_workers.rank}/{background.market_workers.peer_count}위 · 상위{" "}
                {background.market_workers.percentile}%
              </small>
            </div>
          </div>
          <div className="population-density-row">
            <span>
              상주 밀도{" "}
              {Math.round(background.market_resident_density.value).toLocaleString("ko-KR")}명/km² ·{" "}
              {background.market_resident_density.rank}/
              {background.market_resident_density.peer_count}위
            </span>
            <span>
              직장 밀도 {Math.round(background.market_worker_density.value).toLocaleString("ko-KR")}
              명/km² · {background.market_worker_density.rank}/
              {background.market_worker_density.peer_count}위
            </span>
          </div>
          <details className="population-details">
            <summary>
              행정동 배후통계 자세히 보기 · {background.admin_area_name}
              <TermHelp
                term="행정동 배후통계"
                description="행정동은 주민센터가 관리하는 동네 단위입니다. 배후통계는 그 동네에 사는 사람, 일하는 사람, 사업체 수처럼 가게 주변 환경을 이해하는 데 쓰는 정보입니다."
              />
            </summary>
            <div className="population-section">
              <div>
                <span>
                  이 동네에 사는 사람
                  <TermHelp
                    term="행정동 주민"
                    description="현재 선택한 상권이 포함된 행정동 전체에 사는 사람 수입니다. 상권 안의 인구와 같은 숫자는 아닙니다."
                  />
                </span>
                <b>{background.resident_population.value.toLocaleString("ko-KR")}명</b>
                <small>
                  {background.resident_population.rank}/{background.resident_population.peer_count}
                  위
                </small>
              </div>
              <div>
                <span>
                  이 동네에서 일하는 사람
                  <TermHelp
                    term="행정동 종사자"
                    description="현재 선택한 상권이 포함된 행정동 전체에서 일하는 사람 수입니다. 상권 안의 직장인구와 같은 숫자는 아닙니다."
                  />
                </span>
                <b>{background.workers.value.toLocaleString("ko-KR")}명</b>
                <small>
                  {background.workers.rank}/{background.workers.peer_count}위
                </small>
              </div>
              <div>
                <span>사업체</span>
                <b>{background.businesses.value.toLocaleString("ko-KR")}개</b>
                <small>
                  {background.businesses.peer_count}개 동 중 {background.businesses.rank}위
                </small>
              </div>
            </div>
          </details>
          <p className="population-boundary-note">
            상권과 동네의 경계가 서로 달라요. 그래서 {background.admin_area_name} 전체 인구를 이
            상권의 인구라고 계산하지 않고, 상권 숫자와 동네 숫자를 따로 보여드립니다.
          </p>
          <div className="population-evidence-list">
            {background.evidence
              .filter(
                (item, index, items) =>
                  items.findIndex(
                    (candidate) =>
                      candidate.source_name === item.source_name &&
                      candidate.period === item.period,
                  ) === index,
              )
              .map((item) => (
                <a
                  key={`${item.source_name}-${item.period}`}
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{item.source_name}</span>
                  <small>
                    {item.period} · 과거 기준 · {item.geography === "market" ? "상권" : "행정동"}
                  </small>
                </a>
              ))}
          </div>
        </>
      ) : (
        <p className="population-boundary-note" role="status">
          {backgroundState === "error"
            ? "배후 인구 통계를 불러오지 못했습니다."
            : "배후 인구 통계를 불러오는 중입니다."}
        </p>
      )}
    </section>
  );
}

export function InspectorSummary({
  market,
  categorySelection,
  analysis,
  topic,
  onReportOpen,
}: {
  market: Market;
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  topic: AnalysisTopic;
  onReportOpen: () => void;
}) {
  if (categorySelection.coverage !== "full" || analysis === null || topic !== "overview")
    return null;

  return (
    <section className="insight-section">
      <span>분석 요약</span>
      <p>{market.insight}</p>
      <button type="button" onClick={onReportOpen}>
        <FileText size={15} /> 보고서로 보기
      </button>
    </section>
  );
}
