import type { Insight } from '../model/insight';
import { InsightCard, type InsightCardProps } from './insight_card';
import './insight_grid.css';

export type InsightGridProps = {
  insights: Insight[];
  onDeleteInsight?: InsightCardProps['onDeleteInsight'];
  onDeletionFocusFallback?: InsightCardProps['onDeletionFocusFallback'];
  onEditFocusFallback?: InsightCardProps['onEditFocusFallback'];
  onUpdateInsight?: InsightCardProps['onUpdateInsight'];
};

export function InsightGrid({
  insights,
  onDeleteInsight,
  onDeletionFocusFallback,
  onEditFocusFallback,
  onUpdateInsight,
}: InsightGridProps) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <InsightCard
          insight={insight}
          key={insight.id}
          onDeleteInsight={onDeleteInsight}
          onDeletionFocusFallback={onDeletionFocusFallback}
          onEditFocusFallback={onEditFocusFallback}
          onUpdateInsight={onUpdateInsight}
        />
      ))}
    </div>
  );
}
