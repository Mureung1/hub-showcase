import type { FormEvent } from 'react';

import { type RetrievedInsight } from '@/entities/insight';
import { ChoiceChip, EmptyState, LoadingState } from '@/shared/ui';

import {
  RetrieveSearchPanel,
  type SuggestedSituation,
} from './retrieve_search_panel';
import { RetrieveResults } from './retrieve_results';

import './home_page.css';

export type { SuggestedSituation } from './retrieve_search_panel';

export type HomeLibraryState = 'loading' | 'ready' | 'unavailable';

export type HomePageProps = {
  insightCount: number;
  libraryState: HomeLibraryState;
  onClearQuery: () => void;
  onOpenLibrary: () => void;
  onOpenSave: () => void;
  onQueryChange: (value: string) => void;
  onRetrieve: (event: FormEvent<HTMLFormElement>) => void;
  onRetryLoad: () => void;
  onSituationClick: (situation: SuggestedSituation) => void;
  query: string;
  results: RetrievedInsight[];
  selectedSituation: string;
  situations: SuggestedSituation[];
  submittedQuery: string;
};

export function HomePage({
  insightCount,
  libraryState,
  onClearQuery,
  onOpenLibrary,
  onOpenSave,
  onQueryChange,
  onRetrieve,
  onRetryLoad,
  onSituationClick,
  query,
  results,
  selectedSituation,
  situations,
  submittedQuery,
}: HomePageProps) {
  return (
    <section className="home-page" aria-labelledby="retrieve-title">
      <div className="home-page__stage">
        <header className="home-page__hero">
          <p className="home-page__kicker">꺼내보기</p>
          <h2 id="retrieve-title">지금 필요한 인사이트를 꺼내 보세요</h2>
          <RetrieveSearchPanel
            onClearQuery={onClearQuery}
            onQueryChange={onQueryChange}
            onRetrieve={onRetrieve}
            query={query}
          />
        </header>
      </div>

      <div className="home-page__body">
        <div
          className="home-page__suggestion-panel"
          aria-label="추천 상황"
          role="group"
        >
          <div className="home-page__suggestions">
            {situations.map((situation) => (
              <ChoiceChip
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
          <p className="home-page__summary">
            떠오르는 단어나 지금 하는 일을 짧게 적어 보세요.
          </p>
        </div>

        {libraryState === 'loading' ? (
          <LoadingState label="꺼내볼 인사이트를 불러오고 있어요" />
        ) : libraryState === 'unavailable' ? (
          <div className="home-page__no-results">
            <EmptyState
              actionLabel="다시 불러오기"
              description="네트워크와 로그인 상태를 확인한 뒤 다시 불러와 주세요."
              onAction={onRetryLoad}
              title="보관함을 불러오지 못해 꺼내볼 수 없어요"
            />
          </div>
        ) : insightCount === 0 ? (
          <div className="home-page__no-results">
            <EmptyState
              actionLabel="인사이트 저장하기"
              description="첫 인사이트를 저장하면 지금 상황에 맞는 자료를 다시 꺼낼 수 있어요."
              onAction={onOpenSave}
              title="아직 저장한 인사이트가 없어요"
            />
          </div>
        ) : (
          <RetrieveResults
            onOpenLibrary={onOpenLibrary}
            results={results}
            submittedQuery={submittedQuery}
          />
        )}
      </div>
    </section>
  );
}
