import type { FormEvent } from 'react';

import { InsightGrid, type RetrievedInsight } from '@/entities/insight';
import { Button, ChoiceChip, EmptyState, TextField } from '@/shared/ui';

import './home_page.css';

export type SuggestedSituation = {
  label: string;
  query: string;
};

export type HomePageProps = {
  onOpenLibrary: () => void;
  onQueryChange: (value: string) => void;
  onRetrieve: (event: FormEvent<HTMLFormElement>) => void;
  onSituationClick: (situation: SuggestedSituation) => void;
  query: string;
  results: RetrievedInsight[];
  selectedSituation: string;
  situations: SuggestedSituation[];
  submittedQuery: string;
};

export function HomePage({
  onOpenLibrary,
  onQueryChange,
  onRetrieve,
  onSituationClick,
  query,
  results,
  selectedSituation,
  situations,
  submittedQuery,
}: HomePageProps) {
  return (
    <section className="home-page" aria-labelledby="retrieve-title">
      <header className="home-page__hero">
        <p className="home-page__kicker">꺼내보기</p>
        <h2 id="retrieve-title">지금 필요한 인사이트를 다시 꺼내보세요</h2>
        <p className="home-page__summary">
          아맞다는 저장해둔 링크와 메모를 현재 상황에 맞춰 다시 찾게 해주는 개인
          인사이트 저장소입니다.
        </p>

        <form className="home-page__search" onSubmit={onRetrieve}>
          <label htmlFor="retrieve-query">지금 꺼내보고 싶은 상황</label>
          <div className="home-page__search-row">
            <TextField
              height={52}
              id="retrieve-query"
              onChange={(event) => onQueryChange(event.currentTarget.value)}
              placeholder="예: 팀 프로젝트 앱 디자인 참고"
              value={query}
              width="100%"
            />
            <Button
              className="home-page__search-action"
              hierarchy="primary"
              size="large"
              type="submit"
            >
              꺼내보기
            </Button>
          </div>
        </form>

        <div className="home-page__suggestions" aria-label="추천 상황">
          {situations.map((situation) => (
            <ChoiceChip
              aria-label={`${situation.label} 상황으로 꺼내보기`}
              key={situation.query}
              onClick={() => onSituationClick(situation)}
              selected={selectedSituation === situation.query}
              size="medium"
              type="button"
            >
              {situation.label}
            </ChoiceChip>
          ))}
        </div>
      </header>

      {submittedQuery.trim().length === 0 ? (
        <section
          aria-labelledby="home-start-title"
          className="home-page__results"
        >
          <div className="home-page__results-heading">
            <div>
              <p className="home-page__kicker">상황 예시</p>
              <h2 id="home-start-title">이런 상황에서 시작해보세요</h2>
            </div>
          </div>
          <p className="home-page__summary">
            위 상황을 고르거나 지금 하는 일을 직접 입력하면 저장한 자료에서
            연결되는 단서를 찾습니다.
          </p>
        </section>
      ) : (
        <section
          className="home-page__results"
          aria-labelledby="home-results-title"
        >
          <div className="home-page__results-heading">
            <div>
              <p className="home-page__kicker">작업팩</p>
              <h2 id="home-results-title">현재 상황과 연결된 인사이트</h2>
            </div>
            <p
              aria-live="polite"
              className="home-page__results-status"
              role="status"
            >
              “{submittedQuery}” 작업팩 {results.length}개
            </p>
          </div>

          {results.length > 0 ? (
            <InsightGrid
              connectionClues={Object.fromEntries(
                results.map(({ connectionClue, insight }) => [
                  insight.id,
                  connectionClue,
                ])
              )}
              insights={results.map(({ insight }) => insight)}
            />
          ) : (
            <div className="home-page__no-results">
              <EmptyState
                actionLabel="보관함 보기"
                description={`“${submittedQuery}” 입력은 그대로 두었어요. 단어를 줄이거나 다른 상황 예시를 선택해보세요.`}
                onAction={onOpenLibrary}
                title={`“${submittedQuery}”과 연결된 인사이트가 없어요`}
              />
            </div>
          )}
        </section>
      )}
    </section>
  );
}
