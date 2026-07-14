import type { FormEvent } from 'react';
import { Link } from 'lucide-react';

import { Button, StatusMessage, TextField } from '@/shared/ui';

import './save_page.css';

export type SavePageProps = {
  errorActionLabel?: string;
  errorMessage?: string;
  onErrorAction?: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveCompleteChange: (value: boolean) => void;
  onUrlChange: (value: string) => void;
  saveComplete: boolean;
  saveUrl: string;
};

export function SavePage({
  errorActionLabel,
  errorMessage,
  onErrorAction,
  onSave,
  onSaveCompleteChange,
  onUrlChange,
  saveComplete,
  saveUrl,
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
          fullWidth
          hierarchy="primary"
          leadingContent={<Link aria-hidden="true" />}
          size="medium"
          type="submit"
        >
          저장하기
        </Button>
      </form>

      {saveComplete ? (
        <div className="save-page__followup">
          <StatusMessage title="저장 완료" variant="success">
            <p>링크를 보관함에 저장했습니다. 정리는 지금 하지 않아도 됩니다.</p>
          </StatusMessage>
        </div>
      ) : null}
    </section>
  );
}
