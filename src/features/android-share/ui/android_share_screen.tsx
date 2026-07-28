import { Button, LoadingState, TextField } from '@/shared/ui';

import type { AndroidShareController } from '../model/use_android_share';
import './android_share_screen.css';

export type AndroidShareScreenProps = {
  controller: AndroidShareController;
};

function getLoadingLabel(status: 'authenticating' | 'received' | 'saving') {
  if (status === 'authenticating') {
    return 'Google 로그인을 기다리고 있어요';
  }

  return status === 'saving'
    ? '인사이트를 저장하고 있어요'
    : '공유한 링크를 확인하고 있어요';
}

export function AndroidShareScreen({ controller }: AndroidShareScreenProps) {
  const { state } = controller;

  if (
    state.status === 'received' ||
    state.status === 'authenticating' ||
    state.status === 'saving'
  ) {
    return (
      <main className="android-share-shell">
        <LoadingState label={getLoadingLabel(state.status)} />
      </main>
    );
  }

  if (state.status === 'completed') {
    return (
      <main className="android-share-shell">
        <LoadingState label="원래 앱으로 돌아가고 있어요" />
      </main>
    );
  }

  if (state.status === 'error') {
    const canRetry = state.retry !== 'share';

    return (
      <main className="android-share-shell" aria-labelledby="share-error-title">
        <section className="android-share-panel android-share-panel--error">
          <span aria-hidden="true" className="android-share-status-icon">
            !
          </span>
          <h1 id="share-error-title">{state.message}</h1>
          <p>다시 시도하거나 원래 앱으로 돌아갈 수 있어요.</p>
          <div className="android-share-actions">
            {canRetry ? (
              <Button
                disabled={controller.isCompleting}
                hierarchy="primary"
                onClick={controller.retry}
                type="button"
              >
                {state.retry === 'auth'
                  ? '로그인 다시 시도하기'
                  : '인사이트 다시 저장하기'}
              </Button>
            ) : null}
            <Button
              disabled={controller.isCompleting}
              hierarchy={canRetry ? 'secondary' : 'primary'}
              loading={controller.isCompleting}
              onClick={() => void controller.dismiss()}
              type="button"
            >
              원래 앱으로 돌아가기
            </Button>
          </div>
          {controller.completionError ? (
            <p className="android-share-error" role="alert">
              {controller.completionError}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  if (
    state.status === 'saved' ||
    state.status === 'duplicate' ||
    state.status === 'editing-memo'
  ) {
    const insight = state.insight;
    const isEditingMemo = state.status === 'editing-memo';
    const resultLabel =
      state.status === 'duplicate' ||
      (state.status === 'editing-memo' && state.result === 'duplicate')
        ? '이미 저장한 인사이트예요'
        : '인사이트를 저장했어요';

    return (
      <main
        className="android-share-shell"
        aria-labelledby="share-result-title"
      >
        <section className="android-share-panel">
          <span aria-hidden="true" className="android-share-status-icon">
            ✓
          </span>
          <p className="android-share-result-label">{resultLabel}</p>
          <h1 id="share-result-title">{insight.title}</h1>
          <p className="android-share-domain">{insight.domain}</p>

          {isEditingMemo ? (
            <div className="android-share-memo-field">
              <label htmlFor="android-share-memo">한 줄 메모 (선택)</label>
              <TextField
                aria-describedby={
                  controller.memoError
                    ? 'android-share-memo-count android-share-memo-error'
                    : 'android-share-memo-count'
                }
                aria-invalid={controller.memoError ? true : undefined}
                autoFocus
                id="android-share-memo"
                onChange={(event) =>
                  controller.changeMemo(event.currentTarget.value)
                }
                value={state.memo}
                width="100%"
              />
              <p id="android-share-memo-count">
                {[...state.memo].length}/200자
              </p>
            </div>
          ) : null}

          {controller.memoError ? (
            <p
              className="android-share-error"
              id="android-share-memo-error"
              role="alert"
            >
              {controller.memoError}
            </p>
          ) : null}
          {controller.completionError ? (
            <p className="android-share-error" role="alert">
              {controller.completionError}
            </p>
          ) : null}

          <div className="android-share-actions">
            {!isEditingMemo ? (
              <Button
                fullWidth
                hierarchy="secondary"
                onClick={controller.startMemoEditing}
                type="button"
              >
                {insight.memo ? '메모 수정하기' : '메모 추가하기'}
              </Button>
            ) : null}

            <Button
              disabled={controller.isCompleting}
              fullWidth
              hierarchy="primary"
              loading={controller.isCompleting}
              onClick={() => void controller.complete()}
              size="large"
              type="button"
            >
              {controller.isCompleting
                ? '원래 앱으로 돌아가고 있어요'
                : '원래 앱으로 돌아가기'}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return null;
}
