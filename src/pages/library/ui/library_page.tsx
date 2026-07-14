import { useRef } from 'react';

import {
  InsightGrid,
  type Insight,
  type InsightContextInput,
  type InsightMutationResult,
} from '@/entities/insight';
import {
  CategoryFilter,
  EmptyState,
  LoadingState,
  SearchField,
  type CategoryFilterOption,
} from '@/shared/ui';

import './library_page.css';

export type LibraryPageProps = {
  activeCategory: string;
  categoryOptions: CategoryFilterOption[];
  insights: Insight[];
  loading?: boolean;
  onCategoryChange: (category: string) => void;
  onDeleteInsight: (insightId: string) => InsightMutationResult;
  onOpenSave: () => void;
  onQueryChange: (value: string) => void;
  onUpdateInsight: (
    insightId: string,
    context: InsightContextInput
  ) => InsightMutationResult;
  query: string;
};

export function LibraryPage({
  activeCategory,
  categoryOptions,
  insights,
  loading = false,
  onCategoryChange,
  onDeleteInsight,
  onOpenSave,
  onQueryChange,
  onUpdateInsight,
  query,
}: LibraryPageProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasQuery = query.trim().length > 0;

  function clearQuery() {
    onCategoryChange('All');
    onQueryChange('');
    searchInputRef.current?.focus();
  }

  return (
    <section className="library-page" aria-labelledby="library-title">
      <header className="library-page__header">
        <div>
          <p className="library-page__kicker">보관함</p>
          <h2 id="library-title">
            {activeCategory === 'All' ? '전체 인사이트' : activeCategory}
          </h2>
          <p className="library-page__summary">
            카테고리와 검색으로 저장한 링크를 빠르게 찾아보세요.
          </p>
        </div>
        <span className="library-page__count">{insights.length}개</span>
      </header>

      <div className="library-page__work-area">
        <div className="library-page__filter">
          <span className="library-page__label">카테고리</span>
          <CategoryFilter
            onValueChange={onCategoryChange}
            options={categoryOptions}
            value={activeCategory}
          />
        </div>
        <div className="library-page__search">
          <label htmlFor="global-search">보관함 검색</label>
          <SearchField
            id="global-search"
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            onReset={() => onQueryChange('')}
            placeholder="제목, 메모, 카테고리, 도메인, URL 검색"
            ref={searchInputRef}
            size="medium"
            value={query}
            width="100%"
          />
        </div>
      </div>

      <div className="library-page__content">
        {loading ? (
          <LoadingState label="보관함을 불러오는 중" />
        ) : insights.length > 0 ? (
          <InsightGrid
            insights={insights}
            onDeleteInsight={onDeleteInsight}
            onDeletionFocusFallback={() => searchInputRef.current?.focus()}
            onEditFocusFallback={() => searchInputRef.current?.focus()}
            onUpdateInsight={onUpdateInsight}
          />
        ) : hasQuery ? (
          <EmptyState
            actionLabel="검색어 지우기"
            description="입력한 검색어와 맞는 링크가 없어요. 검색어를 줄이거나 다른 단서로 바꿔보세요."
            onAction={clearQuery}
            onSecondaryAction={onOpenSave}
            secondaryActionLabel="링크 저장"
            title="검색 결과가 없어요"
          />
        ) : (
          <EmptyState
            actionLabel="링크 저장"
            description="저장한 링크가 없거나 조건에 맞는 인사이트가 없습니다. 새 링크를 저장하면 이곳에서 다시 찾을 수 있어요."
            onAction={onOpenSave}
            title="저장된 링크가 없어요"
          />
        )}
      </div>
    </section>
  );
}
