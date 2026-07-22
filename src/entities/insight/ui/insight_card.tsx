import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { Button, CategoryTag, TextArea, TextField } from '@/shared/ui';

import type {
  Insight,
  InsightContextInput,
  InsightMutationResult,
} from '../model/insight';
import { normalizeInsightUrl } from '../model/normalize_insight_url';

export type InsightCardProps = {
  insight: Insight;
  onDeleteInsight?: (insightId: string) => Promise<InsightMutationResult>;
  onDeletionFocusFallback?: () => void;
  onEditFocusFallback?: () => void;
  onUpdateInsight?: (
    insightId: string,
    context: InsightContextInput
  ) => Promise<InsightMutationResult>;
};

export function InsightCard({
  insight,
  onDeleteInsight,
  onDeletionFocusFallback,
  onEditFocusFallback,
  onUpdateInsight,
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
    <article className="insight-card" ref={articleRef}>
      {cardMode === 'editing' ? (
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

          <label htmlFor={`${fieldId}-category`}>카테고리</label>
          <TextField
            id={`${fieldId}-category`}
            onChange={(event) =>
              handleDraftChange({
                ...draft,
                category: event.currentTarget.value,
              })
            }
            value={draft.category}
            width="100%"
          />

          {editFailed ? (
            <p className="insight-card__error" role="alert">
              수정 내용을 저장하지 못했어요. 입력은 유지했어요. 다시 시도하거나
              취소해주세요.
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
              {isUpdating ? '저장 중' : editFailed ? '다시 시도' : '변경 저장'}
            </Button>
            <Button
              disabled={isUpdating}
              hierarchy="secondary"
              onClick={cancelEditing}
              size="small"
              type="button"
            >
              취소
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
            {insight.category ? (
              <ul
                className="insight-card__categories"
                aria-label="카테고리 목록"
              >
                <li>
                  <CategoryTag
                    className="insight-card__category"
                    tone={getCategoryTone(insight.category)}
                  >
                    {insight.category}
                  </CategoryTag>
                </li>
              </ul>
            ) : null}
          </div>

          {cardMode === 'deleting' ? (
            <div className="insight-card__delete-confirmation">
              <p>
                <strong>{insight.title}</strong>을(를) 삭제할까요?
              </p>
              <p>삭제하면 보관함에서 사라집니다.</p>
              {deleteFailed ? (
                <p className="insight-card__error" role="alert">
                  삭제하지 못했어요. 카드는 그대로 두었어요. 다시 시도하거나
                  취소해주세요.
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
                    ? '삭제 중'
                    : deleteFailed
                      ? '삭제 다시 시도'
                      : '삭제 확정'}
                </Button>
                <Button
                  disabled={isDeleting}
                  hierarchy="secondary"
                  onClick={cancelDeleting}
                  size="small"
                  type="button"
                >
                  취소
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
        안전하지 않은 주소라 원문을 열 수 없어요.
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
    category: insight.category ?? '',
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

const CATEGORY_TONES = {
  개발: 'green',
  디자인: 'blue',
  팀프로젝트: 'amber',
  공부: 'slate',
  취업: 'coral',
} as const;

function getCategoryTone(category: string) {
  return CATEGORY_TONES[category as keyof typeof CATEGORY_TONES] ?? 'slate';
}
