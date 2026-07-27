import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis, MarketStoreTrend } from "../../services/marketAnalysis";
import {
  InspectorFootfall,
  InspectorFlow,
  InspectorHeader,
  InspectorDecisionSummary,
  InspectorPopulation,
  InspectorRankings,
  InspectorScoreAndCompetition,
  InspectorStoreTrend,
  InspectorSummary,
  InspectorTurnoverAndSales,
} from "./MarketInspectorSections";
import type { AnalysisScope, AnalysisTopic, CategorySelection, Market, MarketStore } from "./types";
import type { AnalysisState } from "./useMarketAnalysis";

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
  analysisScope: AnalysisScope;
  topic: AnalysisTopic;
  onAnalysisRetry: () => void;
  onClosePanel: () => void;
  onClearSelection: () => void;
  onEvidenceOpen: () => void;
  onReportOpen: () => void;
  onActiveHourChange: (hour: number) => void;
};

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
