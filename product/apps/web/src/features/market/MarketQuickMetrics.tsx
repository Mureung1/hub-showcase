import { Coffee, DoorOpen, Target, UsersRound } from "lucide-react";

import type { MarketAnalysis } from "../../services/marketAnalysis";
import type { AnalysisState } from "./useMarketAnalysis";
import type { CategorySelection, Market } from "./types";

function formatCount(value: number | null, suffix: string) {
  return value === null ? null : `${new Intl.NumberFormat("ko-KR").format(value)}${suffix}`;
}

function formatCompactPeople(value: number | null) {
  if (value === null) return null;
  if (value < 10_000) return `${new Intl.NumberFormat("ko-KR").format(value)}명`;
  const compact = value / 10_000;
  const digits = compact >= 100 || Number.isInteger(compact) ? 0 : 1;
  return `${compact.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}만 명`;
}

function metricValue(value: string | number | null, analysisState: AnalysisState) {
  if (value !== null) return value;
  return analysisState === "loading" ? "불러오는 중" : "자료 없음";
}

export function MarketQuickMetrics({
  market,
  categorySelection,
  analysis,
  analysisState,
}: {
  market: Market;
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
  analysisState: AnalysisState;
}) {
  const netTurnover =
    analysis === null || analysis.raw.opening_count === null || analysis.raw.closure_count === null
      ? null
      : analysis.raw.opening_count - analysis.raw.closure_count;
  const flow = formatCompactPeople(analysis?.raw.total_flow ?? null);
  const categoryStoreCount = formatCount(analysis?.raw.category_store_count ?? null, "곳");

  return (
    <section className="market-quick-metrics" aria-label="이 지역 한눈에 보기">
      <div className="quick-metrics-heading">
        <b>이 지역 한눈에 보기</b>
        <small>
          {analysis
            ? `${analysis.period.slice(0, 4)}년 ${analysis.period.slice(4)}분기 기준`
            : analysisState === "loading"
              ? "분석 자료 불러오는 중"
              : "분석 자료 확인 필요"}
        </small>
      </div>
      <div className="quick-metrics-list">
        <div>
          <span className="quick-metric-icon green"><UsersRound size={17} /></span>
          <span>유동인구</span>
          <b>{metricValue(flow ?? (market.footfall === "조회 중" ? null : market.footfall), analysisState)}</b>
        </div>
        <div>
          <span className="quick-metric-icon amber"><Coffee size={17} /></span>
          <span>{categorySelection.name} 점포 수</span>
          <b>{metricValue(categoryStoreCount, analysisState)}</b>
        </div>
        <div>
          <span className="quick-metric-icon coral"><Target size={17} /></span>
          <span>경쟁 강도</span>
          <b>
            {analysis
              ? analysis.raw.category_store_count >= 20
                ? "높음"
                : "보통"
              : metricValue(null, analysisState)}
          </b>
        </div>
        <div>
          <span className="quick-metric-icon green"><DoorOpen size={17} /></span>
          <span>개·폐업</span>
          <b>{netTurnover === null ? metricValue(null, analysisState) : `순증 ${netTurnover > 0 ? "+" : ""}${netTurnover}곳`}</b>
        </div>
      </div>
    </section>
  );
}