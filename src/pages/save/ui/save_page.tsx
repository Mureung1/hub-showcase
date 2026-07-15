import type { FormEvent } from 'react';
import { Link } from 'lucide-react';

import { Button, StatusMessage, TextArea, TextField } from '@/shared/ui';

import './save_page.css';

export type SaveContextDraft = {
  category: string;
  memo: string;
  title: string;
};

export type SavePageProps = {
  contextDraft: SaveContextDraft;
  contextErrorMessage?: string;
  contextSaveComplete: boolean;
  errorActionLabel?: string;
  errorMessage?: string;
  isContextSaving?: boolean;
  isSaving?: boolean;
  onContextDraftChange: (draft: SaveContextDraft) => void;
  onContextSave: (event: FormEvent<HTMLFormElement>) => void;
  onContextSkip: () => void;
  onErrorAction?: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveCompleteChange: (value: boolean) => void;
  onUrlChange: (value: string) => void;
  saveComplete: boolean;
  saveUrl: string;
  storageReady?: boolean;
};

export function SavePage({
  contextDraft,
  contextErrorMessage,
  contextSaveComplete,
  errorActionLabel,
  errorMessage,
  isContextSaving = false,
  isSaving = false,
  onContextDraftChange,
  onContextSave,
  onContextSkip,
  onErrorAction,
  onSave,
  onSaveCompleteChange,
  onUrlChange,
  saveComplete,
  saveUrl,
  storageReady = true,
}: SavePageProps) {
  return (
    <section className="save-page" aria-labelledby="save-title">
      <header className="save-page__header">
        <p className="save-page__kicker">링크 저장</p>
        <h2 id="save-title">URL만 넣고 바로 보관해요</h2>
        <p>
          저장 전 미리보기 없이 먼저 보관하고, 카테고리와 메모는 선택적으로
          남깁니다.
        </p>
      </header>

      <form className="save-page__form" noValidate onSubmit={onSave}>
        <label htmlFor="save-url">링크 URL</label>
        <TextField
          aria-describedby={errorMessage ? 'save-url-error' : undefined}
          aria-invalid={Boolean(errorMessage)}
          id="save-url"
          invalid={Boolean(errorMessage)}
          onChange={(event) => {
            onUrlChange(event.currentTarget.value);
            onSaveCompleteChange(false);
          }}
          placeholder="https://example.com/article"
          type="url"
          value={saveUrl}
          width="100%"
        />
        {errorMessage ? (
          <StatusMessage
            id="save-url-error"
            title="URL을 확인해주세요"
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
          {isSaving ? '저장 중' : '저장하기'}
        </Button>
      </form>

      {saveComplete ? (
        <div className="save-page__followup">
          <StatusMessage title="저장 완료" variant="success">
            <p>링크를 보관함에 저장했습니다. 정리는 지금 하지 않아도 됩니다.</p>
          </StatusMessage>
          <form
            className="save-page__context-form"
            noValidate
            onSubmit={onContextSave}
          >
            <div className="save-page__context-header">
              <h3>언제 다시 쓰고 싶은 자료인가요?</h3>
              <p>필요할 때 떠올릴 단서를 선택해서 남겨보세요.</p>
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

            <label htmlFor="save-context-category">카테고리 (선택)</label>
            <TextField
              id="save-context-category"
              onChange={(event) =>
                onContextDraftChange({
                  ...contextDraft,
                  category: event.currentTarget.value,
                })
              }
              placeholder="예: 디자인 리서치"
              value={contextDraft.category}
              width="100%"
            />

            {contextErrorMessage ? (
              <StatusMessage
                title="개인 맥락을 저장하지 못했어요"
                variant="error"
              >
                <p>{contextErrorMessage}</p>
              </StatusMessage>
            ) : null}

            {contextSaveComplete ? (
              <StatusMessage title="맥락 저장 완료" variant="success">
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
                  ? '저장 중'
                  : contextErrorMessage
                    ? '다시 시도'
                    : contextSaveComplete
                      ? '수정 저장하기'
                      : '맥락 저장하기'}
              </Button>
              <Button
                disabled={isContextSaving}
                hierarchy="secondary"
                onClick={onContextSkip}
                size="medium"
                type="button"
              >
                건너뛰기
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
