import { Filter, List, Plus } from 'lucide-react';

import { InsightGrid, type Insight } from '@/entities/insight';
import {
  CategoryFilter,
  EmptyState,
  LoadingState,
  SearchField,
  type CategoryFilterOption,
} from '@/shared/ui';

export type LibraryPageProps = {
  activeCategory: string;
  categoryOptions: CategoryFilterOption[];
  insights: Insight[];
  loading?: boolean;
  onCategoryChange: (category: string) => void;
  onOpenSave: () => void;
  onQueryChange: (value: string) => void;
  query: string;
};

export function LibraryPage({
  activeCategory,
  categoryOptions,
  insights,
  loading = false,
  onCategoryChange,
  onOpenSave,
  onQueryChange,
  query,
}: LibraryPageProps) {
  return (
    <>
      <nav className="category-rail" aria-label="카테고리 필터">
        <button
          aria-label="보기 방식"
          className="rail-icon-button"
          type="button"
        >
          <List aria-hidden="true" />
        </button>
        <div className="category-scroll">
          <CategoryFilter
            onValueChange={onCategoryChange}
            options={categoryOptions}
            value={activeCategory}
          />
        </div>
        <button
          aria-label="카테고리 추가"
          className="rail-icon-button"
          type="button"
        >
          <Plus aria-hidden="true" />
        </button>
      </nav>

      <section className="search-band" aria-label="검색">
        <label className="visually-hidden" htmlFor="global-search">
          검색
        </label>
        <SearchField
          aria-label="검색"
          className="search-field"
          id="global-search"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          onReset={() => onQueryChange('')}
          placeholder="제목, 메모, 카테고리 검색"
          size="medium"
          value={query}
          width="100%"
        />
        <button aria-label="필터 설정" className="filter-button" type="button">
          <Filter aria-hidden="true" />
        </button>
      </section>

      <section className="tip-banner" aria-label="화면 안내">
        <strong data-role="section-message-content-title">
          필터로 빠르게 찾기
        </strong>
        <p>
          {activeCategory} 필터와 검색으로 저장한 링크를 빠르게 찾을 수 있어요.
        </p>
      </section>

      <main className="board" aria-label="보관함 화면">
        <div className="board-action">
          <button className="share-button" type="button">
            공유
          </button>
        </div>

        <section className="board-content" aria-labelledby="library-title">
          <div className="board-heading">
            <div>
              <p className="eyebrow">최신 저장순</p>
              <h2 id="library-title">
                {activeCategory === 'All' ? '전체 인사이트' : activeCategory}
              </h2>
            </div>
            <span>{insights.length}개</span>
          </div>

          {loading ? (
            <LoadingState label="보관함을 불러오는 중" />
          ) : insights.length > 0 ? (
            <InsightGrid insights={insights} />
          ) : (
            <EmptyState
              actionLabel="전체 보기"
              description="저장한 링크가 없거나 조건에 맞는 인사이트가 없습니다. 다른 카테고리로 바꾸거나 새 링크를 저장해보세요."
              onAction={() => onCategoryChange('All')}
              onSecondaryAction={onOpenSave}
              secondaryActionLabel="링크 저장"
              title="저장된 링크가 없어요"
            />
          )}
        </section>
      </main>
    </>
  );
}
