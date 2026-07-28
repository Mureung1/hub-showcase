import { InsightGrid, type RetrievedInsight } from '@/entities/insight';
import { EmptyState } from '@/shared/ui';

export type RetrieveResultsProps = {
  onOpenLibrary: () => void;
  results: RetrievedInsight[];
  submittedQuery: string;
};

export function RetrieveResults({
  onOpenLibrary,
  results,
  submittedQuery,
}: RetrieveResultsProps) {
  if (submittedQuery.length === 0) {
    return null;
  }

  return (
    <section
      className="home-page__results"
      aria-labelledby="home-results-title"
    >
      <div className="home-page__results-heading">
        <div>
          <h2 id="home-results-title">지금 상황에 맞는 인사이트</h2>
        </div>
        <p
          aria-live="polite"
          className="home-page__results-status"
          role="status"
        >
          “{submittedQuery}” 결과 {results.length}개
        </p>
      </div>

      {results.length > 0 ? (
        <InsightGrid insights={results.map(({ insight }) => insight)} />
      ) : (
        <div className="home-page__no-results">
          <EmptyState
            actionLabel="보관함 보기"
            description="검색어를 줄이거나 다른 상황을 입력해 보세요."
            onAction={onOpenLibrary}
            title={`“${submittedQuery}”로 찾은 인사이트가 없어요`}
          />
        </div>
      )}
    </section>
  );
}
