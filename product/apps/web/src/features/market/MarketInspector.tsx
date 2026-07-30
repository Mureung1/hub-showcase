import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis, MarketStoreTrend } from "../../services/marketAnalysis";
import { EvidenceCoverageSummary } from "./EvidenceCoverageSummary";
import { InspectorFlow } from "./InspectorFlow";
import { InspectorDecisionSummary } from "./MarketDecisionSummary";
import { InspectorHeader } from "./MarketInspectorHeader";
import { InspectorScoreAndCompetition } from "./MarketScoreAndCompetition";
import {
  InspectorFootfall,
  InspectorPopulation,
  InspectorRankings,
  InspectorStoreTrend,
  InspectorSummary,
  InspectorTurnoverAndSales,
} from "./MarketInspectorSections";
import type { AnalysisScope, AnalysisTopic, CategorySelection, Market, MarketStore } from "./types";
import type { AnalysisState, FlowState } from "./useMarketAnalysis";
import "./MarketInspector.css";

type MarketInspectorProps = {
  market: Market;
  selected: MarketStore | null;
  score: number | null;
  categorySelection: CategorySelection;
  categoryCoverageReason: string;
  activeHour: number;
  sameCategoryCount: number;
  analysis: MarketAnalysis | null;
  storeTrend?: MarketStoreTrend | null;
  storeTrendState?: "loading" | "ready" | "unavailable" | "error";
  background: AdminAreaBackground | null;
  backgroundState: "loading" | "ready" | "unavailable" | "error";
  analysisState: AnalysisState;
  flowState: FlowState;
  analysisScope: AnalysisScope;
  topic: AnalysisTopic;
  onAnalysisRetry: () => void;
  onClosePanel: () => void;
  onClearSelection: () => void;
  onEvidenceOpen: () => void;
  onReportOpen: () => void;
  onActiveHourChange: (hour: number) => void;
};

function PartialCompetitionSummary({
  categorySelection,
  sameCategoryCount,
  topic,
}: {
  categorySelection: CategorySelection;
  sameCategoryCount: number;
  topic: AnalysisTopic;
}) {
  if (
    categorySelection.coverage !== "partial" ||
    (topic !== "overview" && topic !== "competition")
  ) {
    return null;
  }

  return (
    <section className="metric-section partial-competition-summary" aria-label="경쟁 현황">
      <div className="section-title">
        <span>경쟁 현황</span>
        <small>점포 위치 2026.06 기준</small>
      </div>
      <div className="competition-chart">
        <div className="competition-stat">
          <span>선택 상권 경계 내</span>
          <b>{sameCategoryCount.toLocaleString("ko-KR")}곳</b>
          <small>동일 업종 점포</small>
        </div>
        <div className="legend-list">
          <span>
            <i className="green" /> {categorySelection.name} <b>{sameCategoryCount}</b>
          </span>
          <small>2026.06 점포 위치 스냅샷에서 같은 세부 업종만 집계합니다.</small>
        </div>
      </div>
    </section>
  );
}

export function MarketInspector({
  market,
  selected,
  score,
  categorySelection,
  categoryCoverageReason,
  activeHour,
  sameCategoryCount,
  analysis,
  storeTrend = null,
  storeTrendState = "unavailable",
  background,
  backgroundState,
  analysisState,
  flowState,
  analysisScope,
  topic,
  onAnalysisRetry,
  onClosePanel,
  onClearSelection,
  onEvidenceOpen,
  onReportOpen,
  onActiveHourChange,
}: MarketInspectorProps) {
  return (
    <aside className="inspector-panel">
      <InspectorHeader
        market={market}
        selected={selected}
        categorySelection={categorySelection}
        categoryCoverageReason={categoryCoverageReason}
        topic={topic}
        analysisState={analysisState}
        onAnalysisRetry={onAnalysisRetry}
        onClosePanel={onClosePanel}
        onClearSelection={onClearSelection}
      />
      <PartialCompetitionSummary
        categorySelection={categorySelection}
        sameCategoryCount={sameCategoryCount}
        topic={topic}
      />
      <EvidenceCoverageSummary categorySelection={categorySelection} analysis={analysis} />
      <InspectorScoreAndCompetition
        market={market}
        categorySelection={categorySelection}
        score={score}
        sameCategoryCount={sameCategoryCount}
        analysis={analysis}
        analysisScope={analysisScope}
        topic={topic}
        onEvidenceOpen={onEvidenceOpen}
      />
      <InspectorDecisionSummary
        categorySelection={categorySelection}
        analysis={analysis}
        selected={selected}
        topic={topic}
      />
      <InspectorTurnoverAndSales
        categorySelection={categorySelection}
        analysis={analysis}
        topic={topic}
      />
      <InspectorStoreTrend
        categorySelection={categorySelection}
        trend={storeTrend}
        trendState={storeTrendState}
        topic={topic}
      />
      <InspectorRankings categorySelection={categorySelection} analysis={analysis} topic={topic} />
      <InspectorFlow
        market={market}
        categorySelection={categorySelection}
        analysis={analysis}
        flowState={flowState}
        topic={topic}
        activeHour={activeHour}
        onActiveHourChange={onActiveHourChange}
      />
      <InspectorPopulation
        market={market}
        categorySelection={categorySelection}
        background={background}
        backgroundState={backgroundState}
        topic={topic}
      />
      <InspectorFootfall
        market={market}
        categorySelection={categorySelection}
        analysis={analysis}
        topic={topic}
      />
      <InspectorSummary
        market={market}
        categorySelection={categorySelection}
        analysis={analysis}
        topic={topic}
        onReportOpen={onReportOpen}
      />
    </aside>
  );
}
