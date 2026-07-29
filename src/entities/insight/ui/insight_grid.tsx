import type { Insight } from '../model/insight';
import { InsightCard, type InsightCardProps } from './insight_card';
import './insight_grid.css';

export type InsightGridProps = {
  categories?: InsightCardProps['categories'];
  categorySelectionDisabled?: InsightCardProps['categorySelectionDisabled'];
  insights: Insight[];
  onDeleteInsight?: InsightCardProps['onDeleteInsight'];
  onDeletionFocusFallback?: InsightCardProps['onDeletionFocusFallback'];
  onEditFocusFallback?: InsightCardProps['onEditFocusFallback'];
  onRequestCategoryCreation?: InsightCardProps['onRequestCategoryCreation'];
  onToggleInsightSelection?: InsightCardProps['onToggleSelection'];
  onUpdateInsight?: InsightCardProps['onUpdateInsight'];
  selectedInsightIds?: ReadonlySet<string>;
  selectionMode?: boolean;
};

export function InsightGrid({
  categories,
  categorySelectionDisabled,
  insights,
  onDeleteInsight,
  onDeletionFocusFallback,
  onEditFocusFallback,
  onRequestCategoryCreation,
  onToggleInsightSelection,
  onUpdateInsight,
  selectedInsightIds = new Set<string>(),
  selectionMode = false,
}: InsightGridProps) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <InsightCard
          categories={categories}
          categorySelectionDisabled={categorySelectionDisabled}
          insight={insight}
          key={`${insight.id}:${selectionMode ? 'selection' : 'default'}`}
          onDeleteInsight={onDeleteInsight}
          onDeletionFocusFallback={onDeletionFocusFallback}
          onEditFocusFallback={onEditFocusFallback}
          onRequestCategoryCreation={onRequestCategoryCreation}
          onToggleSelection={onToggleInsightSelection}
          onUpdateInsight={onUpdateInsight}
          selected={selectedInsightIds.has(insight.id)}
          selectionMode={selectionMode}
        />
      ))}
    </div>
  );
}
