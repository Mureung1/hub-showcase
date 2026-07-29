import { Button } from '@/shared/ui';

import './library_selection_toolbar.css';

export type LibrarySelectionToolbarProps = {
  currentResultCount: number;
  deleting: boolean;
  onClear: () => void;
  onDelete: () => void;
  onToggleAll: () => void;
  selectedCount: number;
};

export function LibrarySelectionToolbar({
  currentResultCount,
  deleting,
  onClear,
  onDelete,
  onToggleAll,
  selectedCount,
}: LibrarySelectionToolbarProps) {
  return (
    <div
      aria-label="인사이트 선택 도구"
      className="library-selection-toolbar"
      role="toolbar"
    >
      <strong>{selectedCount}개 선택됨</strong>
      <Button
        disabled={deleting}
        hierarchy="secondary"
        onClick={onToggleAll}
        size="small"
        type="button"
      >
        {selectedCount === currentResultCount
          ? '현재 목록 선택 해제'
          : `현재 목록 ${currentResultCount}개 모두 선택`}
      </Button>
      <Button
        disabled={deleting || selectedCount === 0}
        hierarchy="ghost"
        onClick={onClear}
        size="small"
        type="button"
      >
        선택 해제
      </Button>
      <Button
        disabled={deleting || selectedCount === 0}
        hierarchy="primary"
        onClick={onDelete}
        size="small"
        type="button"
      >
        삭제
      </Button>
    </div>
  );
}
