import type { FormEvent } from 'react';

import { Button, ClearableTextField } from '@/shared/ui';

export type SuggestedSituation = {
  label: string;
  query: string;
};

export type RetrieveSearchPanelProps = {
  onClearQuery: () => void;
  onQueryChange: (value: string) => void;
  onRetrieve: (event: FormEvent<HTMLFormElement>) => void;
  query: string;
};

export function RetrieveSearchPanel({
  onClearQuery,
  onQueryChange,
  onRetrieve,
  query,
}: RetrieveSearchPanelProps) {
  return (
    <form className="home-page__search" onSubmit={onRetrieve}>
      <label htmlFor="retrieve-query">지금 꺼내 보고 싶은 상황</label>
      <div className="home-page__search-row">
        <ClearableTextField
          clearLabel="입력 지우기"
          height={52}
          id="retrieve-query"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          onClear={onClearQuery}
          placeholder="예: 과제 참고자료 다시 찾기"
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
  );
}
