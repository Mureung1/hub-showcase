import { useState } from "react";
import { CircleHelp, FileText, X } from "lucide-react";

import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis } from "../../services/marketAnalysis";
import { MetricGuide } from "./MetricGuide";
import type { AnalysisScope, AnalysisTopic, CategorySelection, Market, MarketStore } from "./types";
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
              : "분석 근거 없음"}
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
          <span>오류를 정적 예시 값으로 바꾸지 않았습니다. 연결을 확인한 뒤 다시 시도해 주세요.</span>
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
  radius,
  sameCategoryCount,
  analysis,
  analysisScope,
  topic,
  onEvidenceOpen,
}: {
  market: Market;
  categorySelection: CategorySelection;
  score: number | null;
  radius: number;
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
          <div>
            <span>입지 점수</span>
            <strong>{score}</strong>
            <small>/ 100</small>
          </div>
          <b>{market.grade}</b>
          <button type="button" className="evidence-button" onClick={onEvidenceOpen}>
            점수 산정 근거 <CircleHelp size={15} />
          </button>
        </section>
      )}
      {showsCompetition && (
        <section className="metric-section">
          <div className="section-title">
            <span>경쟁 현황</span>
            <small>{analysis ? "서울시 상권 경계" : `반경 ${radius}m`}</small>
          </div>
          <div className="competition-chart">
            <div className="donut">
              <i />
              <b>{sameCategoryCount}</b>
              <small>동일 업종</small>
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
                    <b className="positive" style={{ width: `${(openingCount / turnoverMaximum) * 100}%` }} />
                  </i>
                  <strong>{openingCount}개</strong>
                </div>
                <div>
                  <span>폐업</span>
                  <i>
                    <b className="negative" style={{ width: `${(closureCount / turnoverMaximum) * 100}%` }} />
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
          <p className="turnover-note">월별 변화가 아닌 선택 분기 합계입니다. 기간별 추이는 후속 분석에서 제공합니다.</p>
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
          <p className="population-boundary-note">서울시 추정매출 집계이며 실제 개별 점포 매출이 아닙니다.</p>
        </section>
      )}
    </>
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
  const visibleRankings = rankingGroup?.metrics.filter((metric) => rankingKeys[topic].includes(metric.key)) ?? [];

  if (categorySelection.coverage !== "full" || analysis === null || rankingKeys[topic].length === 0) {
    return null;
  }

  return (
    <section className="ranking-section">
      <div className="section-title">
        <span>지표별 순위</span>
        <small>높은 값 순 · 성공 순위 아님</small>
      </div>
      <div className="ranking-group-toggle" aria-label="순위 비교집단">
        <button type="button" aria-pressed={rankingGroupId === "same_type"} onClick={() => setRankingGroupId("same_type")}>
          같은 상권 유형
        </button>
        <button type="button" aria-pressed={rankingGroupId === "supported"} onClick={() => setRankingGroupId("supported")}>
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
        <p className="population-boundary-note">API 순위 근거가 없습니다. 정적 fallback 값으로 순위를 만들지 않습니다.</p>
      )}
    </section>
  );
}

export function InspectorFlow({
  market,
  categorySelection,
  analysis,
  topic,
  activeHour,
  onActiveHourChange,
}: {
  market: Market;
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  topic: AnalysisTopic;
  activeHour: number;
  onActiveHourChange: (hour: number) => void;
}) {
  if (categorySelection.coverage !== "full" || analysis === null || (topic !== "overview" && topic !== "flow")) {
    return null;
  }

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
              title={value === null ? `${market.demandLabels[index]} 데이터 없음` : `${market.demandLabels[index]} 유동인구 상대값 ${value}`}
              aria-label={value === null ? `${market.demandLabels[index]} 데이터 없음` : `${market.demandLabels[index]} 유동인구 상대값 ${value}`}
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
        <p className="metric-note">서울 길단위인구가 제공하는 6개 시간 구간입니다.</p>
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
  if (categorySelection.coverage !== "full" || analysis === null || (topic !== "overview" && topic !== "flow")) {
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
  if (categorySelection.coverage !== "full" || (topic !== "overview" && topic !== "population")) return null;

  return (
    <section className="population-metric-section">
      <div className="section-title">
        <span>상권·행정동 인구</span>
        <small>공간 단위 분리</small>
      </div>
      {background ? (
        <>
          <p className="population-space-label">서울시 상권 경계 · {background.market_resident_population.period}</p>
          <div className="population-section">
            <div>
              <span>상권 상주인구</span>
              <b>{market.residentPopulation}</b>
              <small>
                {background.market_resident_population.rank}/{background.market_resident_population.peer_count}위 · 상위 {background.market_resident_population.percentile}%
              </small>
            </div>
            <div>
              <span>상권 직장인구</span>
              <b>{market.workPopulation}</b>
              <small>
                {background.market_workers.rank}/{background.market_workers.peer_count}위 · 상위 {background.market_workers.percentile}%
              </small>
            </div>
          </div>
          <div className="population-density-row">
            <span>
              상주 밀도 {Math.round(background.market_resident_density.value).toLocaleString("ko-KR")}명/km² · {background.market_resident_density.rank}/{background.market_resident_density.peer_count}위
            </span>
            <span>
              직장 밀도 {Math.round(background.market_worker_density.value).toLocaleString("ko-KR")}명/km² · {background.market_worker_density.rank}/{background.market_worker_density.peer_count}위
            </span>
          </div>
          <p className="population-space-label">행정동 배후통계 · {background.admin_area_name}</p>
          <div className="population-section">
            <div>
              <span>행정동 주민</span>
              <b>{background.resident_population.value.toLocaleString("ko-KR")}명</b>
              <small>{background.resident_population.rank}/{background.resident_population.peer_count}위</small>
            </div>
            <div>
              <span>행정동 종사자</span>
              <b>{background.workers.value.toLocaleString("ko-KR")}명</b>
              <small>{background.workers.rank}/{background.workers.peer_count}위</small>
            </div>
            <div>
              <span>사업체</span>
              <b>{background.businesses.value.toLocaleString("ko-KR")}개</b>
              <small>{background.businesses.peer_count}개 동 중 {background.businesses.rank}위</small>
            </div>
          </div>
          <p className="population-boundary-note">{background.boundary_note}</p>
          <div className="population-evidence-list">
            {background.evidence
              .filter(
                (item, index, items) =>
                  items.findIndex(
                    (candidate) => candidate.source_name === item.source_name && candidate.period === item.period,
                  ) === index,
              )
              .map((item) => (
                <a key={`${item.source_name}-${item.period}`} href={item.source_url}>
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
          {backgroundState === "error" ? "배후 인구 통계를 불러오지 못했습니다." : "배후 인구 통계를 불러오는 중입니다."}
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
}: {
  market: Market;
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  topic: AnalysisTopic;
}) {
  if (categorySelection.coverage !== "full" || analysis === null || topic !== "overview") return null;

  return (
    <section className="insight-section">
      <span>분석 요약</span>
      <p>{market.insight}</p>
      <button type="button" onClick={() => window.print()}>
        <FileText size={15} /> 보고서로 보기
      </button>
    </section>
  );
}
