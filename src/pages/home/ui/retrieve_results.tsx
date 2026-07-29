import { InsightGrid, type Insight } from '@/entities/insight';
import { EmptyState, StatusMessage } from '@/shared/ui';

export type RetrieveResultsProps = {
  errorMessage?: string;
  onOpenLibrary: () => void;
  pendingCount: number;
  results: Insight[];
  submittedQuery: string;
};

export function RetrieveResults({
  errorMessage,
  onOpenLibrary,
  pendingCount,
  results,
  submittedQuery,
}: RetrieveResultsProps) {
  if (submittedQuery.length === 0 && !errorMessage) {
    return null;
  }

  return (
    <section
      className="home-page__results"
      aria-label={submittedQuery.length === 0 ? '꺼내보기 안내' : undefined}
      aria-labelledby={
        submittedQuery.length > 0 ? 'home-results-title' : undefined
      }
    >
      {errorMessage ? (
        <StatusMessage title="꺼내보지 못했어요" variant="error">
          <p>{errorMessage}</p>
        </StatusMessage>
      ) : null}

      {pendingCount > 0 ? (
        <p className="home-page__pending" role="status">
          최근 저장한 일부 인사이트는 검색 준비 중이에요.
        </p>
      ) : null}

      {submittedQuery.length > 0 ? (
        <>
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
            <InsightGrid insights={results} />
          ) : (
            <div className="home-page__no-results">
              <EmptyState
                actionLabel="보관함 보기"
                description="검색어를 줄이거나 다른 상황을 입력해 보세요."
                onAction={onOpenLibrary}
                title={`“${submittedQuery}”${getRoParticle(submittedQuery)} 찾은 인사이트가 없어요`}
              />
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function getRoParticle(value: string) {
  const lastCharacter = value
    .trim()
    .replace(/[\p{P}\p{S}\s]+$/gu, '')
    .at(-1);
  if (!lastCharacter) {
    return '로';
  }

  const codePoint = lastCharacter.codePointAt(0);
  if (codePoint === undefined || codePoint < 0xac00 || codePoint > 0xd7a3) {
    return '로';
  }

  const finalConsonantIndex = (codePoint - 0xac00) % 28;
  return finalConsonantIndex === 0 || finalConsonantIndex === 8 ? '로' : '으로';
}
