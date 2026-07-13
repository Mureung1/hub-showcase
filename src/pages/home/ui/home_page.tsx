import type { FormEvent } from 'react';

import { InsightGrid, type Insight } from '@/entities/insight';
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
  results: Insight[];
  selectedSituation: string;
  situations: SuggestedSituation[];
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

      <section
        className="home-page__results"
        aria-labelledby="home-results-title"
      >
        <div className="home-page__results-heading">
          <div>
            <p className="home-page__kicker">추천 결과</p>
            <h2 id="home-results-title">지금 다시 볼 만한 인사이트</h2>
          </div>
          <span>{results.length}개</span>
        </div>

        {results.length > 0 ? (
          <InsightGrid insights={results} />
        ) : (
          <EmptyState
            actionLabel="보관함 보기"
            description="먼저 인사이트를 저장하면 현재 상황에 맞춰 다시 꺼내볼 수 있습니다."
            onAction={onOpenLibrary}
            title="꺼내볼 인사이트가 아직 없어요"
          />
        )}
      </section>
    </section>
  );
}
