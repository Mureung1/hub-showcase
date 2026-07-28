import { useRef } from 'react';

import {
  InsightGrid,
  type Insight,
  type InsightCategoryOption,
  type InsightContextInput,
  type InsightMutationResult,
} from '@/entities/insight';
import {
  Button,
  CategoryFilter,
  EmptyState,
  LoadingState,
  SearchField,
  type CategoryFilterOption,
} from '@/shared/ui';

import './library_page.css';

export type LibraryPageProps = {
  activeCategory: string;
  categories?: readonly InsightCategoryOption[];
  categoryManagementDisabled?: boolean;
  categoryOptions: CategoryFilterOption[];
  insights: Insight[];
  loading?: boolean;
  onCategoryChange: (category: string) => void;
  onDeleteInsight: (insightId: string) => Promise<InsightMutationResult>;
  onManageCategories?: () => void;
  onOpenImport: () => void;
  onOpenSave: () => void;
  onQueryChange: (value: string) => void;
  onRetryLoad: () => void;
  onRequestCategoryCreation?: (
    selectCategory: (categoryId: string) => void
  ) => void;
  onUpdateInsight: (
    insightId: string,
    context: InsightContextInput
  ) => Promise<InsightMutationResult>;
  query: string;
  totalInsightCount: number;
  unavailable?: boolean;
};

export function LibraryPage({
  activeCategory,
  categories = [],
  categoryManagementDisabled = false,
  categoryOptions,
  insights,
  loading = false,
  onCategoryChange,
  onDeleteInsight,
  onManageCategories,
  onOpenImport,
  onOpenSave,
  onQueryChange,
  onRetryLoad,
  onRequestCategoryCreation,
  onUpdateInsight,
  query,
  totalInsightCount,
  unavailable = false,
}: LibraryPageProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasQuery = query.trim().length > 0;
  const hasLibraryInsights = totalInsightCount > 0;
  const activeCategoryLabel =
    categoryOptions.find((option) => option.value === activeCategory)?.label ??
    '전체';

  function clearFilters() {
    onCategoryChange('all');
    onQueryChange('');
    searchInputRef.current?.focus();
  }

  function clearQuery() {
    onQueryChange('');
    searchInputRef.current?.focus();
  }

  return (
    <section className="library-page" aria-labelledby="library-title">
      <header className="library-page__header">
        <div>
          <p className="library-page__kicker">보관함</p>
          <h2 id="library-title">
            {activeCategory === 'all' ? '전체 인사이트' : activeCategoryLabel}
          </h2>
          <p className="library-page__summary">
            카테고리와 검색으로 저장한 인사이트를 빠르게 찾아 보세요.
          </p>
        </div>
        <span className="library-page__count">{insights.length}개</span>
        {hasLibraryInsights && !loading && !unavailable ? (
          <Button
            className="library-page__import-action"
            hierarchy="secondary"
            onClick={onOpenImport}
            size="small"
            type="button"
          >
            인사이트 가져오기
          </Button>
        ) : null}
      </header>

      <div className="library-page__work-area">
        <div className="library-page__filter">
          <div className="library-page__filter-heading">
            <span className="library-page__label">카테고리</span>
            {onManageCategories ? (
              <Button
                aria-label="카테고리 관리"
                disabled={categoryManagementDisabled}
                hierarchy="ghost"
                onClick={onManageCategories}
                size="small"
                type="button"
              >
                관리
              </Button>
            ) : null}
          </div>
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
            placeholder="제목, 메모, 카테고리, 도메인이나 URL 검색"
            ref={searchInputRef}
            size="medium"
            value={query}
            width="100%"
          />
        </div>
      </div>

      <div className="library-page__content">
        {hasLibraryInsights && hasQuery && !loading ? (
          <p className="visually-hidden" role="status">
            {insights.length > 0
              ? `검색 결과 ${insights.length}개`
              : '검색 결과 없음'}
          </p>
        ) : null}
        {loading ? (
          <LoadingState label="보관함을 불러오고 있어요" />
        ) : unavailable && totalInsightCount === 0 ? (
          <EmptyState
            actionLabel="다시 불러오기"
            description="네트워크와 로그인 상태를 확인한 뒤 다시 불러와 주세요."
            onAction={onRetryLoad}
            title="보관함을 불러오지 못했어요"
          />
        ) : !hasLibraryInsights ? (
          <EmptyState
            actionLabel="인사이트 저장하기"
            description="첫 인사이트를 저장하면 여기에서 다시 찾을 수 있어요."
            onAction={onOpenSave}
            onSecondaryAction={onOpenImport}
            secondaryActionLabel="인사이트 가져오기"
            title="아직 저장한 인사이트가 없어요"
          />
        ) : insights.length > 0 ? (
          <InsightGrid
            categories={categories}
            categorySelectionDisabled={categoryManagementDisabled}
            insights={insights}
            onDeleteInsight={onDeleteInsight}
            onDeletionFocusFallback={() => searchInputRef.current?.focus()}
            onEditFocusFallback={() => searchInputRef.current?.focus()}
            onRequestCategoryCreation={onRequestCategoryCreation}
            onUpdateInsight={onUpdateInsight}
          />
        ) : hasQuery ? (
          <EmptyState
            actionLabel="검색어 지우기"
            description="검색어를 줄이거나 다른 단서를 입력해 보세요."
            onAction={clearQuery}
            onSecondaryAction={onOpenSave}
            secondaryActionLabel="인사이트 저장하기"
            title="이 검색어로 찾은 인사이트가 없어요"
          />
        ) : (
          <EmptyState
            actionLabel="전체 보기"
            description="전체 보관함을 확인해 보세요."
            onAction={clearFilters}
            onSecondaryAction={onOpenSave}
            secondaryActionLabel="인사이트 저장하기"
            title="이 카테고리에 인사이트가 없어요"
          />
        )}
      </div>
    </section>
  );
}
