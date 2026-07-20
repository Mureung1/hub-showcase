import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis } from "../../services/marketAnalysis";
import {
  InspectorFootfall,
  InspectorFlow,
  InspectorHeader,
  InspectorPopulation,
  InspectorRankings,
  InspectorScoreAndCompetition,
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
  radius: number;
  activeHour: number;
  sameCategoryCount: number;
  analysis: MarketAnalysis | null;
  background: AdminAreaBackground | null;
  backgroundState: "loading" | "ready" | "unavailable" | "error";
  analysisState: AnalysisState;
  analysisScope: AnalysisScope;
  topic: AnalysisTopic;
  onAnalysisRetry: () => void;
  onClosePanel: () => void;
  onClearSelection: () => void;
  onEvidenceOpen: () => void;
  onActiveHourChange: (hour: number) => void;
};

export function MarketInspector({
  market,
  selected,
  score,
  categorySelection,
  categoryCoverageReason,
  radius,
  activeHour,
  sameCategoryCount,
  analysis,
  background,
  backgroundState,
  analysisState,
  analysisScope,
  topic,
  onAnalysisRetry,
  onClosePanel,
  onClearSelection,
  onEvidenceOpen,
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
        radius={radius}
        sameCategoryCount={sameCategoryCount}
        analysis={analysis}
        analysisScope={analysisScope}
        topic={topic}
        onEvidenceOpen={onEvidenceOpen}
      />
      <InspectorTurnoverAndSales categorySelection={categorySelection} analysis={analysis} topic={topic} />
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
      <InspectorFootfall market={market} categorySelection={categorySelection} analysis={analysis} topic={topic} />
      <InspectorSummary market={market} categorySelection={categorySelection} analysis={analysis} topic={topic} />
    </aside>
  );
}
