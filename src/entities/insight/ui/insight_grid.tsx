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
  onUpdateInsight?: InsightCardProps['onUpdateInsight'];
};

export function InsightGrid({
  categories,
  categorySelectionDisabled,
  insights,
  onDeleteInsight,
  onDeletionFocusFallback,
  onEditFocusFallback,
  onRequestCategoryCreation,
  onUpdateInsight,
}: InsightGridProps) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <InsightCard
          categories={categories}
          categorySelectionDisabled={categorySelectionDisabled}
          insight={insight}
          key={insight.id}
          onDeleteInsight={onDeleteInsight}
          onDeletionFocusFallback={onDeletionFocusFallback}
          onEditFocusFallback={onEditFocusFallback}
          onRequestCategoryCreation={onRequestCategoryCreation}
          onUpdateInsight={onUpdateInsight}
        />
      ))}
    </div>
  );
}
