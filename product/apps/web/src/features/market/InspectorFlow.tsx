import type { MarketAnalysis } from "../../services/marketAnalysis";
import { flowBucketHourlyAverage } from "./model";
import type { AnalysisTopic, CategorySelection, Market } from "./types";
import type { FlowState } from "./useMarketAnalysis";

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
        <div className="section-title"><span>시간대별 활동성</span></div>
        <p className="metric-note" role="status">시간대별 유동인구를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (flowState === "error") {
    return (
      <section className="metric-section">
        <div className="section-title"><span>시간대별 활동성</span></div>
        <p className="metric-note" role="alert">시간대별 유동인구를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      </section>
    );
  }

  if (flowState === "unavailable" || analysis === null) {
    return (
      <section className="metric-section">
        <div className="section-title"><span>시간대별 활동성</span></div>
        <p className="metric-note" role="status">
          선택한 분기에는 시간대별 유동인구 자료가 없습니다. 다른 분기를 선택하면 확인할 수 있습니다.
        </p>
      </section>
    );
  }

  const activeBucket = analysis.raw.flow_time_buckets[activeHour];
  const activeFlow = activeBucket?.value ?? null;
  const activeHourlyAverage = flowBucketHourlyAverage(activeBucket);

  return (
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
                : `${market.demandLabels[index]} 시간당 평균 유동인구 상대값 ${value}`
            }
            aria-label={
              value === null
                ? `${market.demandLabels[index]} 데이터 없음`
                : `${market.demandLabels[index]} 시간당 평균 유동인구 상대값 ${value}`
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
          {activeHourlyAverage === null
            ? "데이터 없음"
            : `시간당 약 ${Math.round(activeHourlyAverage).toLocaleString("ko-KR")}명`}
        </strong>
        {activeFlow !== null && (
          <small>
            원본 분기 누적 <span>{Math.round(activeFlow).toLocaleString("ko-KR")}명/분기</span>
          </small>
        )}
      </div>
      <p className="metric-note">
        시간 구간 길이가 서로 달라 막대 높이와 대표 수요는 시간당 평균으로 비교합니다. 원본 누적값은
        함께 표시하며 변경하지 않습니다. 서울시 추정 길단위인구의 선택 분기 집계입니다.
        {flowState === "partial" ? " 일부 시간대 자료는 아직 없습니다." : ""}
      </p>
    </section>
  );
}
