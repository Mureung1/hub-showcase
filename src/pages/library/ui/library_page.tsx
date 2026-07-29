import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

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

import { InsightBatchDeleteDialog } from './insight_batch_delete_dialog';
import { LibrarySelectionToolbar } from './library_selection_toolbar';
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
  onDeleteInsights: (
    insightIds: readonly string[]
  ) => Promise<InsightMutationResult>;
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
  onDeleteInsights,
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedInsightIds, setSelectedInsightIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionAnnouncement, setDeletionAnnouncement] = useState('');
  const hasQuery = query.trim().length > 0;
  const hasLibraryInsights = totalInsightCount > 0;
  const visibleInsightIds = insights.map(({ id }) => id);
  const visibleInsightIdSet = new Set(visibleInsightIds);
  const visibleSelectedInsightIds = new Set(
    [...selectedInsightIds].filter((id) => visibleInsightIdSet.has(id))
  );
  const selectedCount = visibleSelectedInsightIds.size;
  const deletesEntireLibrary =
    activeCategory === 'all' &&
    !hasQuery &&
    totalInsightCount > 0 &&
    selectedCount === totalInsightCount;
  const activeCategoryLabel =
    categoryOptions.find((option) => option.value === activeCategory)?.label ??
    '전체';
  const resultCountLabel = hasQuery
    ? `검색 결과 ${insights.length}개`
    : activeCategory === 'all'
      ? `인사이트 ${insights.length}개`
      : `${activeCategoryLabel} ${insights.length}개`;

  const endSelection = useCallback((restoreFocus = true) => {
    setSelectionMode(false);
    setSelectedInsightIds(new Set());
    setSelectionAnchorId(null);
    setDeleteDialogOpen(false);
    setDeleteFailed(false);
    setDeleting(false);

    if (restoreFocus) {
      setTimeout(() => {
        const selectionTrigger = document
          .querySelector<HTMLButtonElement>(
            '[data-library-selection-trigger]'
          );

        if (selectionTrigger) {
          selectionTrigger.focus();
          return;
        }

        document
          .querySelector<HTMLButtonElement>('.library-page__content button')
          ?.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (!selectionMode || deleteDialogOpen || deleting) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      endSelection();
    }

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, [deleteDialogOpen, deleting, endSelection, selectionMode]);

  function beginSelection() {
    setDeletionAnnouncement('');
    setSelectedInsightIds(new Set());
    setSelectionAnchorId(null);
    setSelectionMode(true);
  }

  function handleCategoryChange(category: string) {
    if (selectionMode) {
      endSelection(false);
    }

    onCategoryChange(category);
  }

  function handleQueryChange(value: string) {
    if (selectionMode) {
      endSelection(false);
    }

    onQueryChange(value);
  }

  function clearSelectedInsights() {
    setSelectedInsightIds(new Set());
    setSelectionAnchorId(null);
    setDeleteFailed(false);
  }

  function toggleAllVisibleInsights() {
    if (selectedCount === insights.length) {
      clearSelectedInsights();
      return;
    }

    setSelectedInsightIds(new Set(visibleInsightIds));
    setSelectionAnchorId(null);
    setDeleteFailed(false);
  }

  function toggleInsightSelection(
    insightId: string,
    options: { range: boolean }
  ) {
    const nextSelectedIds = new Set(visibleSelectedInsightIds);

    if (options.range && selectionAnchorId) {
      const anchorIndex = visibleInsightIds.indexOf(selectionAnchorId);
      const targetIndex = visibleInsightIds.indexOf(insightId);

      if (anchorIndex >= 0 && targetIndex >= 0) {
        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);

        visibleInsightIds.slice(start, end + 1).forEach((id) => {
          nextSelectedIds.add(id);
        });
        setDeleteFailed(false);
        setSelectedInsightIds(nextSelectedIds);
        return;
      }
    }

    if (nextSelectedIds.has(insightId)) {
      nextSelectedIds.delete(insightId);
    } else {
      nextSelectedIds.add(insightId);
    }

    setSelectionAnchorId(insightId);
    setDeleteFailed(false);
    setSelectedInsightIds(nextSelectedIds);
  }

  function openDeleteDialog() {
    if (selectedCount === 0) {
      return;
    }

    setDeleteFailed(false);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (deleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setDeleteFailed(false);
    setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>('[data-library-selection-delete]')
        ?.focus();
    });
  }

  async function confirmBatchDeletion() {
    if (deleting || selectedCount === 0) {
      return;
    }

    const insightIds = visibleInsightIds.filter((id) =>
      visibleSelectedInsightIds.has(id)
    );
    setDeleting(true);
    let result: InsightMutationResult;

    try {
      result = await onDeleteInsights(insightIds);
    } catch {
      result = { ok: false, reason: 'write-failed' };
    } finally {
      setDeleting(false);
    }

    if (!result.ok) {
      setDeleteFailed(true);
      return;
    }

    setDeletionAnnouncement(`인사이트 ${insightIds.length}개를 삭제했어요.`);
    endSelection();
  }

  function clearFilters() {
    handleCategoryChange('all');
    handleQueryChange('');
    searchInputRef.current?.focus();
  }

  function clearQuery() {
    handleQueryChange('');
    searchInputRef.current?.focus();
  }

  return (
    <section
      className={clsx('library-page', {
        'library-page--selection': selectionMode,
      })}
      aria-labelledby="library-title"
    >
      <div className="library-page__stage">
        <header className="library-page__header">
          <div className="library-page__heading">
            <p className="library-page__kicker">보관함</p>
            <h2 id="library-title">
              {activeCategory === 'all' ? '전체 인사이트' : activeCategoryLabel}
            </h2>
            <p className="library-page__summary">
              카테고리와 검색으로 저장한 인사이트를 빠르게 찾아 보세요.
            </p>
          </div>

          <div className="library-page__search">
            <label htmlFor="global-search">보관함 검색</label>
            <SearchField
              id="global-search"
              onChange={(event) =>
                handleQueryChange(event.currentTarget.value)
              }
              onReset={() => handleQueryChange('')}
              placeholder="제목, 메모, 카테고리, 도메인이나 URL 검색"
              ref={searchInputRef}
              size="medium"
              value={query}
              width="100%"
            />
          </div>

          {hasLibraryInsights &&
          !loading &&
          !unavailable &&
          !selectionMode ? (
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
      </div>

      <div className="library-page__body">
        <div className="library-page__work-area">
          <div className="library-page__filter">
            <div className="library-page__filter-heading">
              <span className="library-page__label">카테고리</span>
              {onManageCategories ? (
                <Button
                  aria-label="카테고리 관리"
                  disabled={categoryManagementDisabled || selectionMode}
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
              onValueChange={handleCategoryChange}
              options={categoryOptions}
              value={activeCategory}
            />
          </div>
        </div>

        {!loading &&
        !(unavailable && totalInsightCount === 0) &&
        hasLibraryInsights ? (
          <div className="library-page__result-row">
            <p className="library-page__result-count" role="status">
              {resultCountLabel}
            </p>
            {insights.length > 0 ? (
              <Button
                data-library-selection-trigger
                hierarchy="secondary"
                onClick={
                  selectionMode ? () => endSelection() : beginSelection
                }
                size="small"
                type="button"
              >
                {selectionMode ? '선택 끝내기' : '선택'}
              </Button>
            ) : null}
          </div>
        ) : null}

        {selectionMode && insights.length > 0 ? (
          <LibrarySelectionToolbar
            currentResultCount={insights.length}
            deleting={deleting}
            onClear={clearSelectedInsights}
            onDelete={openDeleteDialog}
            onToggleAll={toggleAllVisibleInsights}
            selectedCount={selectedCount}
          />
        ) : null}

        <div className="library-page__content">
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
              onToggleInsightSelection={toggleInsightSelection}
              onUpdateInsight={onUpdateInsight}
              selectedInsightIds={visibleSelectedInsightIds}
              selectionMode={selectionMode}
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
      </div>

      {deleteDialogOpen ? (
        <InsightBatchDeleteDialog
          deleting={deleting}
          failed={deleteFailed}
          libraryWide={deletesEntireLibrary}
          onClose={closeDeleteDialog}
          onConfirm={confirmBatchDeletion}
          open
          selectedCount={selectedCount}
        />
      ) : null}

      {deletionAnnouncement ? (
        <p className="library-page__announcement" role="status">
          {deletionAnnouncement}
        </p>
      ) : null}
    </section>
  );
}
