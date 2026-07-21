import { applyDesignTokens } from '../../src/shared/config/design-system';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MemoRuntime = {
  sendMessage(message: unknown): Promise<unknown>;
};

type MemoPageDependencies = {
  closeWindow: () => void;
  document: Document;
  location: Pick<URL, 'search'>;
  runtime: MemoRuntime;
  schedule?: (callback: () => void, delay: number) => unknown;
};

export function mountMemoPage({
  closeWindow,
  document: pageDocument,
  location,
  runtime,
  schedule = setTimeout,
}: MemoPageDependencies) {
  applyDesignTokens(pageDocument.documentElement);

  const form = requireElement<HTMLFormElement>(
    pageDocument,
    '[data-memo-form]'
  );
  const input = requireElement<HTMLTextAreaElement>(
    pageDocument,
    '[data-memo-input]'
  );
  const status = requireElement<HTMLElement>(
    pageDocument,
    '[data-memo-status]'
  );
  const title = requireElement<HTMLElement>(pageDocument, '[data-memo-title]');
  const saveButton = requireElement<HTMLButtonElement>(
    pageDocument,
    'button[type="submit"]'
  );
  const closeButton = requireElement<HTMLButtonElement>(
    pageDocument,
    '[data-close]'
  );
  const parameters = new URLSearchParams(location.search);
  const insightId = parameters.get('insightId') ?? '';

  title.textContent = parameters.get('title') || '저장한 링크';
  closeButton.addEventListener('click', closeWindow);

  if (!UUID_PATTERN.test(insightId)) {
    saveButton.disabled = true;
    showStatus(status, '메모 대상을 확인할 수 없습니다.', 'error');
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const memo = input.value.trim();

    if (!memo) {
      showStatus(status, '메모를 입력하거나 닫기를 선택해 주세요.', 'error');
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = '저장 중';
    clearStatus(status);

    void runtime
      .sendMessage({ insightId, memo, type: 'save-insight-memo' })
      .then((result) => {
        if (isSuccessfulMemoResult(result)) {
          showStatus(status, '메모 저장됨', 'success');
          schedule(closeWindow, 350);
          return;
        }

        showStatus(status, getFailureMessage(result), 'error');
        saveButton.disabled = false;
        saveButton.textContent = '다시 시도';
      })
      .catch(() => {
        showStatus(
          status,
          '메모를 저장하지 못했습니다. 다시 시도해 주세요.',
          'error'
        );
        saveButton.disabled = false;
        saveButton.textContent = '다시 시도';
      });
  });
}

function showStatus(
  status: HTMLElement,
  message: string,
  state: 'error' | 'success'
) {
  status.className = `memo-status memo-status--${state}`;
  status.setAttribute('role', state === 'error' ? 'alert' : 'status');
  status.textContent = message;
}

function clearStatus(status: HTMLElement) {
  status.className = 'memo-status';
  status.removeAttribute('role');
  status.textContent = '';
}

function getFailureMessage(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    'reason' in value &&
    value.reason === 'permission-denied'
  ) {
    return '로그인이 만료되었습니다. 확장 아이콘에서 다시 로그인해 주세요.';
  }

  return '메모를 저장하지 못했습니다. 다시 시도해 주세요.';
}

function isSuccessfulMemoResult(value: unknown): value is { ok: true } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    value.ok === true
  );
}

function requireElement<TElement extends Element>(
  pageDocument: Document,
  selector: string
) {
  const element = pageDocument.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`확장 메모 UI 요소가 없습니다: ${selector}`);
  }

  return element;
}

if (
  typeof document !== 'undefined' &&
  document.querySelector('[data-memo-form]') &&
  typeof chrome !== 'undefined'
) {
  mountMemoPage({
    closeWindow: () => window.close(),
    document,
    location: window.location,
    runtime: chrome.runtime,
  });
}
