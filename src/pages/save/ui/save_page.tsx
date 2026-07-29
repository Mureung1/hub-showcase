import type { CSSProperties, FormEvent } from 'react';
import { ClipboardPaste, Link } from 'lucide-react';

import type { InsightCategoryOption } from '@/entities/insight';
import {
  categoryPalette,
  type CategoryColorKey,
} from '@/shared/config/design-system';
import {
  Button,
  Select,
  StatusMessage,
  TextArea,
  TextField,
  type SelectOption,
} from '@/shared/ui';

import './save_page.css';

export type SaveContextDraft = {
  categoryId: string | null;
  memo: string;
  title: string;
};

export type SavePageProps = {
  categories?: readonly InsightCategoryOption[];
  categorySelectionDisabled?: boolean;
  contextDraft: SaveContextDraft;
  contextErrorMessage?: string;
  contextSaveComplete: boolean;
  errorActionLabel?: string;
  errorMessage?: string;
  isContextSaving?: boolean;
  isSharedSave?: boolean;
  isSaving?: boolean;
  onContextDraftChange: (draft: SaveContextDraft) => void;
  onContextSave: (event: FormEvent<HTMLFormElement>) => void;
  onContextSkip: () => void;
  onErrorAction?: () => void;
  onPasteFromClipboard?: () => void | Promise<void>;
  onRequestCategoryCreation?: (
    selectCategory: (categoryId: string) => void
  ) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  saveComplete: boolean;
  saveTitle: string;
  saveUrl: string;
  storageReady?: boolean;
};

export function SavePage({
  categories = [],
  categorySelectionDisabled = false,
  contextDraft,
  contextErrorMessage,
  contextSaveComplete,
  errorActionLabel,
  errorMessage,
  isContextSaving = false,
  isSharedSave = false,
  isSaving = false,
  onContextDraftChange,
  onContextSave,
  onContextSkip,
  onErrorAction,
  onPasteFromClipboard,
  onRequestCategoryCreation,
  onSave,
  onTitleChange,
  onUrlChange,
  saveComplete,
  saveTitle,
  saveUrl,
  storageReady = true,
}: SavePageProps) {
  return (
    <section className="save-page" aria-labelledby="save-title">
      <div className="save-page__stage">
        <div className="save-page__primary">
          <header className="save-page__header">
            <p className="save-page__kicker">저장</p>
            <h2 id="save-title">
              {isSharedSave
                ? '공유한 링크를 저장할까요?'
                : 'URL을 입력하면 바로 저장해요'}
            </h2>
            <p>
              먼저 인사이트를 저장하고 제목, 메모와 카테고리는 나중에 추가해도
              돼요.
            </p>
          </header>

          <form
            aria-busy={isSaving}
            className="save-page__form"
            noValidate
            onSubmit={onSave}
          >
            <Button
              className="save-page__clipboard-action"
              disabled={isSaving}
              hierarchy="secondary"
              leadingContent={<ClipboardPaste aria-hidden="true" />}
              onClick={() => void onPasteFromClipboard?.()}
              size="medium"
              type="button"
            >
              클립보드에서 붙여넣기
            </Button>
            <label htmlFor="save-url">URL</label>
            <TextField
              aria-describedby={errorMessage ? 'save-url-error' : undefined}
              aria-invalid={Boolean(errorMessage)}
              disabled={isSaving}
              id="save-url"
              invalid={Boolean(errorMessage)}
              onChange={(event) => onUrlChange(event.currentTarget.value)}
              placeholder="https://example.com/article"
              type="url"
              value={saveUrl}
              width="100%"
            />
            {isSharedSave ? (
              <>
                <label htmlFor="save-shared-title">공유 제목 (선택)</label>
                <TextField
                  disabled={isSaving}
                  id="save-shared-title"
                  onChange={(event) => onTitleChange(event.currentTarget.value)}
                  placeholder="예: 다시 읽고 싶은 글"
                  value={saveTitle}
                  width="100%"
                />
              </>
            ) : null}
            {errorMessage ? (
              <StatusMessage
                id="save-url-error"
                title="URL을 확인해 주세요"
                variant="error"
              >
                <p>{errorMessage}</p>
                {errorActionLabel && onErrorAction ? (
                  <Button
                    className="save-page__error-action"
                    hierarchy="secondary"
                    onClick={onErrorAction}
                    size="small"
                    type="button"
                  >
                    {errorActionLabel}
                  </Button>
                ) : null}
              </StatusMessage>
            ) : null}
            <Button
              disabled={!storageReady || isSaving}
              fullWidth
              hierarchy="primary"
              leadingContent={<Link aria-hidden="true" />}
              loading={isSaving}
              size="medium"
              type="submit"
            >
              {isSaving ? '저장하고 있어요' : '저장하기'}
            </Button>
          </form>
        </div>
      </div>

      {saveComplete ? (
        <div className="save-page__body">
          <div className="save-page__followup">
            <StatusMessage title="인사이트를 저장했어요" variant="success">
              <p>보관함에 추가했어요. 지금 정리하지 않아도 돼요.</p>
            </StatusMessage>
            <form
              className="save-page__context-form"
              noValidate
              onSubmit={onContextSave}
            >
              <div className="save-page__context-header">
                <h3>언제 다시 쓰고 싶은가요?</h3>
                <p>필요할 때 떠올릴 제목, 메모나 카테고리를 남겨 보세요.</p>
              </div>

              <label htmlFor="save-context-title">제목 (선택)</label>
              <TextField
                id="save-context-title"
                onChange={(event) =>
                  onContextDraftChange({
                    ...contextDraft,
                    title: event.currentTarget.value,
                  })
                }
                placeholder="비워두면 사이트 이름을 사용해요"
                value={contextDraft.title}
                width="100%"
              />

              <label htmlFor="save-context-memo">한 줄 메모 (선택)</label>
              <TextArea
                id="save-context-memo"
                onChange={(event) =>
                  onContextDraftChange({
                    ...contextDraft,
                    memo: event.currentTarget.value,
                  })
                }
                placeholder="어떤 순간에 다시 보고 싶은가요?"
                value={contextDraft.memo}
                width="100%"
              />

              <label id="save-context-category-label">카테고리 (선택)</label>
              <Select
                aria-labelledby="save-context-category-label"
                disabled={categorySelectionDisabled}
                onValueChange={(value) => {
                  if (value === CREATE_CATEGORY_VALUE) {
                    onRequestCategoryCreation?.((categoryId) =>
                      onContextDraftChange({ ...contextDraft, categoryId })
                    );
                    return;
                  }

                  onContextDraftChange({
                    ...contextDraft,
                    categoryId:
                      value === UNCATEGORIZED_CATEGORY_VALUE ? null : value,
                  });
                }}
                options={createCategorySelectOptions(
                  categories,
                  Boolean(onRequestCategoryCreation)
                )}
                renderValue={(option) => renderCategorySelectValue(option)}
                value={contextDraft.categoryId ?? UNCATEGORIZED_CATEGORY_VALUE}
              />

              {contextErrorMessage ? (
                <StatusMessage
                  title="인사이트 정보를 저장하지 못했어요"
                  variant="error"
                >
                  <p>{contextErrorMessage}</p>
                </StatusMessage>
              ) : null}

              {contextSaveComplete ? (
                <StatusMessage
                  title="인사이트 정보를 저장했어요"
                  variant="success"
                >
                  <p>보관함과 검색 결과에 바로 반영했어요.</p>
                </StatusMessage>
              ) : null}

              <div className="save-page__context-actions">
                <Button
                  disabled={isContextSaving}
                  hierarchy="primary"
                  loading={isContextSaving}
                  size="medium"
                  type="submit"
                >
                  {isContextSaving
                    ? '인사이트 정보를 저장하고 있어요'
                    : contextErrorMessage
                      ? '인사이트 정보 다시 저장하기'
                      : contextSaveComplete
                        ? '변경 내용 저장하기'
                        : '인사이트 정보 저장하기'}
                </Button>
                <Button
                  disabled={isContextSaving}
                  hierarchy="secondary"
                  onClick={onContextSkip}
                  size="medium"
                  type="button"
                >
                  지금은 건너뛰기
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const UNCATEGORIZED_CATEGORY_VALUE = '__uncategorized__';
const CREATE_CATEGORY_VALUE = '__create_category__';

function createCategorySelectOptions(
  categories: readonly InsightCategoryOption[],
  includeCreateAction: boolean
): SelectOption[] {
  const options: SelectOption[] = [
    {
      label: '미분류',
      leadingContent: <CategorySelectMark colorKey={null} />,
      value: UNCATEGORIZED_CATEGORY_VALUE,
    },
    ...categories.map((category) => ({
      label: category.name,
      leadingContent: <CategorySelectMark colorKey={category.colorKey} />,
      value: category.id,
    })),
  ];

  if (includeCreateAction) {
    options.push({
      label: '새 카테고리 만들기',
      leadingContent: <span aria-hidden="true">＋</span>,
      value: CREATE_CATEGORY_VALUE,
    });
  }

  return options;
}

function renderCategorySelectValue(option: SelectOption) {
  return (
    <span className="save-page__category-select-value">
      {option.leadingContent}
      <span>{option.label}</span>
    </span>
  );
}

function CategorySelectMark({
  colorKey,
}: {
  colorKey: CategoryColorKey | null;
}) {
  return (
    <span
      aria-hidden="true"
      className="save-page__category-select-mark"
      style={
        {
          '--category-color': colorKey
            ? categoryPalette[colorKey].cssVariable
            : 'var(--color-graphite)',
        } as CSSProperties
      }
    />
  );
}
