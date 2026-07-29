import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

import {
  categoryPalette,
  type CategoryColorKey,
} from '@/shared/config/design-system';
import {
  Button,
  CategoryTag,
  NeutralTag,
  Select,
  TextArea,
  TextField,
  type SelectOption,
} from '@/shared/ui';

import type {
  Insight,
  InsightContextInput,
  InsightMutationResult,
} from '../model/insight';
import { normalizeInsightUrl } from '../model/normalize_insight_url';

export type InsightCardProps = {
  categories?: readonly InsightCategoryOption[];
  categorySelectionDisabled?: boolean;
  insight: Insight;
  onRequestCategoryCreation?: (
    selectCategory: (categoryId: string) => void
  ) => void;
  onDeleteInsight?: (insightId: string) => Promise<InsightMutationResult>;
  onDeletionFocusFallback?: () => void;
  onEditFocusFallback?: () => void;
  onToggleSelection?: (
    insightId: string,
    options: { range: boolean }
  ) => void;
  onUpdateInsight?: (
    insightId: string,
    context: InsightContextInput
  ) => Promise<InsightMutationResult>;
  selected?: boolean;
  selectionMode?: boolean;
};

export type InsightCategoryOption = {
  colorKey: CategoryColorKey;
  id: string;
  name: string;
};

export function InsightCard({
  categories = [],
  categorySelectionDisabled = false,
  insight,
  onDeleteInsight,
  onDeletionFocusFallback,
  onEditFocusFallback,
  onRequestCategoryCreation,
  onToggleSelection,
  onUpdateInsight,
  selected = false,
  selectionMode = false,
}: InsightCardProps) {
  const fieldId = useId();
  const articleRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [cardMode, setCardMode] = useState<'idle' | 'editing' | 'deleting'>(
    'idle'
  );
  const previousCardMode = useRef(cardMode);
  const [draft, setDraft] = useState<InsightContextInput>(() =>
    createEditDraft(insight)
  );
  const [editFailed, setEditFailed] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedCategory = categories.find(
    (category) => category.id === insight.categoryId
  );

  useEffect(() => {
    const previousMode = previousCardMode.current;

    if (cardMode === 'editing') {
      titleInputRef.current?.focus();
    } else if (cardMode === 'deleting') {
      getCardButton(articleRef.current, 'delete-confirm')?.focus();
    } else if (previousMode === 'editing') {
      getCardButton(articleRef.current, 'edit')?.focus();
    } else if (previousMode === 'deleting') {
      getCardButton(articleRef.current, 'delete')?.focus();
    }

    previousCardMode.current = cardMode;
  }, [cardMode]);

  function beginEditing() {
    setDraft(createEditDraft(insight));
    setEditFailed(false);
    setDeleteFailed(false);
    setCardMode('editing');
  }

  function cancelEditing() {
    setDraft(createEditDraft(insight));
    setEditFailed(false);
    setCardMode('idle');
  }

  function handleDraftChange(nextDraft: InsightContextInput) {
    setDraft(nextDraft);
    setEditFailed(false);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onUpdateInsight || isUpdating) {
      return;
    }

    const currentCard = articleRef.current;
    const nextManageTrigger = getNextManageTrigger(currentCard);
    setIsUpdating(true);
    let updateResult: InsightMutationResult;

    try {
      updateResult = await onUpdateInsight(insight.id, draft);
    } catch {
      updateResult = { ok: false, reason: 'write-failed' };
    } finally {
      setIsUpdating(false);
    }

    if (!updateResult.ok) {
      setEditFailed(true);
      return;
    }

    setEditFailed(false);
    setCardMode('idle');
    setTimeout(() => {
      const currentEditTrigger = currentCard?.isConnected
        ? getCardButton(currentCard, 'edit')
        : null;

      if (currentEditTrigger) {
        currentEditTrigger.focus();
        return;
      }

      if (nextManageTrigger?.isConnected) {
        nextManageTrigger.focus();
        return;
      }

      onEditFocusFallback?.();
    });
  }

  function beginDeleting() {
    setEditFailed(false);
    setDeleteFailed(false);
    setCardMode('deleting');
  }

  function cancelDeleting() {
    setDeleteFailed(false);
    setCardMode('idle');
  }

  async function confirmDeletion() {
    if (!onDeleteInsight || isDeleting) {
      return;
    }

    const nextManageTrigger = getNextManageTrigger(articleRef.current);
    setIsDeleting(true);
    let deleteResult: InsightMutationResult;

    try {
      deleteResult = await onDeleteInsight(insight.id);
    } catch {
      deleteResult = { ok: false, reason: 'write-failed' };
    } finally {
      setIsDeleting(false);
    }

    if (!deleteResult.ok) {
      setDeleteFailed(true);
      return;
    }

    setDeleteFailed(false);
    setTimeout(() => {
      if (nextManageTrigger?.isConnected) {
        nextManageTrigger.focus();
        return;
      }

      onDeletionFocusFallback?.();
    });
  }

  return (
    <article
      className={clsx('insight-card', {
        'insight-card--selected': selected,
        'insight-card--selection': selectionMode,
      })}
      ref={articleRef}
    >
      {cardMode === 'editing' && !selectionMode ? (
        <form
          aria-label={`${insight.title} 수정`}
          className="insight-card__edit-form"
          noValidate
          onSubmit={handleUpdate}
        >
          <div className="insight-card__locked-url">
            <span>URL (수정할 수 없음)</span>
            <p>{insight.originalUrl}</p>
            <SourceAction insight={insight} />
          </div>

          <label htmlFor={`${fieldId}-title`}>제목</label>
          <TextField
            id={`${fieldId}-title`}
            onChange={(event) =>
              handleDraftChange({ ...draft, title: event.currentTarget.value })
            }
            ref={titleInputRef}
            value={draft.title}
            width="100%"
          />

          <label htmlFor={`${fieldId}-memo`}>한 줄 메모</label>
          <TextArea
            id={`${fieldId}-memo`}
            onChange={(event) =>
              handleDraftChange({ ...draft, memo: event.currentTarget.value })
            }
            value={draft.memo}
            width="100%"
          />

          <label id={`${fieldId}-category-label`}>카테고리</label>
          <Select
            aria-labelledby={`${fieldId}-category-label`}
            disabled={categorySelectionDisabled}
            onValueChange={(value) => {
              if (value === CREATE_CATEGORY_VALUE) {
                onRequestCategoryCreation?.((categoryId) =>
                  handleDraftChange({ ...draft, categoryId })
                );
                return;
              }

              handleDraftChange({
                ...draft,
                categoryId:
                  value === UNCATEGORIZED_CATEGORY_VALUE ? null : value,
              });
            }}
            options={createCategorySelectOptions(
              categories,
              Boolean(onRequestCategoryCreation)
            )}
            renderValue={(option) => renderCategorySelectValue(option)}
            value={draft.categoryId ?? UNCATEGORIZED_CATEGORY_VALUE}
          />

          {editFailed ? (
            <p className="insight-card__error" role="alert">
              수정 내용을 저장하지 못했어요. 입력한 내용은 그대로 두었어요. 다시
              시도하거나 닫아 주세요.
            </p>
          ) : null}

          <div className="insight-card__actions">
            <Button
              disabled={isUpdating}
              hierarchy="primary"
              loading={isUpdating}
              size="small"
              type="submit"
            >
              {isUpdating
                ? '변경 내용을 저장하고 있어요'
                : editFailed
                  ? '변경 내용 다시 저장하기'
                  : '변경 내용 저장하기'}
            </Button>
            <Button
              disabled={isUpdating}
              hierarchy="secondary"
              onClick={cancelEditing}
              size="small"
              type="button"
            >
              닫기
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="insight-card__body">
            <p className="insight-card__domain">{insight.domain}</p>
            <h3 className="insight-card__title">{insight.title}</h3>
            {insight.memo ? (
              <p className="insight-card__memo">{insight.memo}</p>
            ) : null}
            <ul className="insight-card__categories" aria-label="카테고리 목록">
              <li>
                {selectedCategory ? (
                  <CategoryTag
                    className="insight-card__category"
                    colorKey={selectedCategory.colorKey}
                  >
                    {selectedCategory.name}
                  </CategoryTag>
                ) : (
                  <NeutralTag className="insight-card__category">
                    미분류
                  </NeutralTag>
                )}
              </li>
            </ul>
          </div>

          {selectionMode ? (
            <button
              aria-label={`${insight.title} ${
                selected ? '선택 해제' : '선택'
              }`}
              aria-pressed={selected}
              className="insight-card__selection-button"
              onClick={(event) =>
                onToggleSelection?.(insight.id, { range: event.shiftKey })
              }
              type="button"
            >
              <span
                aria-hidden="true"
                className="insight-card__selection-mark"
              >
                {selected ? <Check size={18} strokeWidth={3} /> : null}
              </span>
            </button>
          ) : cardMode === 'deleting' ? (
            <div className="insight-card__delete-confirmation">
              <p>“{insight.title}” 인사이트를 삭제할까요?</p>
              <p>삭제하면 보관함에서 사라지고 되돌릴 수 없어요.</p>
              {deleteFailed ? (
                <p className="insight-card__error" role="alert">
                  인사이트를 삭제하지 못했어요. 카드는 그대로 두었어요. 다시
                  시도하거나 닫아 주세요.
                </p>
              ) : null}
              <div className="insight-card__actions">
                <Button
                  data-insight-card-action="delete-confirm"
                  disabled={isDeleting}
                  hierarchy="primary"
                  loading={isDeleting}
                  onClick={confirmDeletion}
                  size="small"
                  type="button"
                >
                  {isDeleting
                    ? '인사이트를 삭제하고 있어요'
                    : deleteFailed
                      ? '다시 삭제하기'
                      : '인사이트 삭제하기'}
                </Button>
                <Button
                  disabled={isDeleting}
                  hierarchy="secondary"
                  onClick={cancelDeleting}
                  size="small"
                  type="button"
                >
                  닫기
                </Button>
              </div>
            </div>
          ) : (
            <div className="insight-card__footer">
              <SourceAction insight={insight} />
              {onUpdateInsight || onDeleteInsight ? (
                <div className="insight-card__manage-actions">
                  {onUpdateInsight ? (
                    <Button
                      data-insight-card-action="edit"
                      data-insight-manage-trigger
                      hierarchy="ghost"
                      onClick={beginEditing}
                      size="small"
                      type="button"
                    >
                      수정
                    </Button>
                  ) : null}
                  {onDeleteInsight ? (
                    <Button
                      data-insight-card-action="delete"
                      hierarchy="ghost"
                      onClick={beginDeleting}
                      size="small"
                      type="button"
                    >
                      삭제
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </article>
  );
}

function SourceAction({ insight }: { insight: Insight }) {
  const normalizedUrl = normalizeInsightUrl(insight.originalUrl);

  if (!normalizedUrl.ok) {
    return (
      <p className="insight-card__unsafe-source" role="status">
        안전하지 않은 링크라 원문을 열 수 없어요.
      </p>
    );
  }

  return (
    <a
      className="insight-card__source"
      href={normalizedUrl.originalUrl}
      rel="noreferrer"
      target="_blank"
    >
      원문 열기
    </a>
  );
}

function createEditDraft(insight: Insight): InsightContextInput {
  return {
    categoryId: insight.categoryId,
    memo: insight.memo ?? '',
    title: insight.title,
  };
}

function getCardButton(article: HTMLElement | null, action: string) {
  return article?.querySelector<HTMLButtonElement>(
    `[data-insight-card-action="${action}"]`
  );
}

function getNextManageTrigger(article: HTMLElement | null) {
  return article?.nextElementSibling?.querySelector<HTMLButtonElement>(
    '[data-insight-manage-trigger]'
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
    <span className="insight-card__category-select-value">
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
      className="insight-card__category-select-mark"
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
