// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { getByLabelText, getByRole } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mountMemoPage } from './memo';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';

describe('mountMemoPage', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <p data-memo-title></p>
        <form data-memo-form>
          <label for="memo">한 줄 메모</label>
          <textarea id="memo" maxlength="200" data-memo-input></textarea>
          <p aria-live="polite" data-memo-status></p>
          <button type="submit">메모 저장</button>
          <button type="button" data-close>닫기</button>
        </form>
      </main>
    `;
  });

  it('shows the captured title without rendering markup', () => {
    mountPage({
      location: new URL(
        `chrome-extension://extension/memo.html?insightId=${INSIGHT_ID}&title=%3Cstrong%3EArticle%3C%2Fstrong%3E`
      ),
    });

    const title = document.querySelector('[data-memo-title]');
    expect(title?.textContent).toBe('<strong>Article</strong>');
    expect(title?.querySelector('strong')).toBeNull();
  });

  it('saves the memo through the background and closes after success', async () => {
    const user = userEvent.setup();
    const closeWindow = vi.fn();
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    mountPage({ closeWindow, sendMessage });

    await user.type(getByLabelText(document.body, '한 줄 메모'), '회의 참고');
    await user.click(getByRole(document.body, 'button', { name: '메모 저장' }));

    expect(sendMessage).toHaveBeenCalledWith({
      insightId: INSIGHT_ID,
      memo: '회의 참고',
      type: 'save-insight-memo',
    });
    expect(getByRole(document.body, 'status')).toHaveTextContent('메모 저장됨');
    expect(closeWindow).toHaveBeenCalledOnce();
  });

  it('preserves the memo and offers retry after a save failure', async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn()
      .mockResolvedValue({ ok: false, reason: 'write-failed' });
    mountPage({ sendMessage });
    const input = getByLabelText(document.body, '한 줄 메모');

    await user.type(input, '보존할 메모');
    await user.click(getByRole(document.body, 'button', { name: '메모 저장' }));

    expect(input).toHaveValue('보존할 메모');
    expect(getByRole(document.body, 'alert')).toHaveTextContent(
      '메모를 저장하지 못했습니다. 다시 시도해 주세요.'
    );
    expect(
      getByRole(document.body, 'button', { name: '다시 시도' })
    ).toBeEnabled();
  });

  it('does not send an empty memo', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();
    mountPage({ sendMessage });

    await user.click(getByRole(document.body, 'button', { name: '메모 저장' }));

    expect(sendMessage).not.toHaveBeenCalled();
    expect(getByRole(document.body, 'alert')).toHaveTextContent(
      '메모를 입력하거나 닫기를 선택해 주세요.'
    );
  });

  it('disables saving for an invalid insight target', () => {
    mountPage({
      location: new URL(
        'chrome-extension://extension/memo.html?insightId=invalid&title=Article'
      ),
    });

    expect(
      getByRole(document.body, 'button', { name: '메모 저장' })
    ).toBeDisabled();
    expect(getByRole(document.body, 'alert')).toHaveTextContent(
      '메모 대상을 확인할 수 없습니다.'
    );
  });

  it('closes without saving', async () => {
    const user = userEvent.setup();
    const closeWindow = vi.fn();
    const sendMessage = vi.fn();
    mountPage({ closeWindow, sendMessage });

    await user.click(getByRole(document.body, 'button', { name: '닫기' }));

    expect(closeWindow).toHaveBeenCalledOnce();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

function mountPage({
  closeWindow = vi.fn(),
  location = new URL(
    `chrome-extension://extension/memo.html?insightId=${INSIGHT_ID}&title=Article`
  ),
  sendMessage = vi.fn().mockResolvedValue({ ok: true }),
}: {
  closeWindow?: () => void;
  location?: URL;
  sendMessage?: (message: unknown) => Promise<unknown>;
} = {}) {
  mountMemoPage({
    closeWindow,
    document,
    location,
    runtime: { sendMessage },
    schedule: (callback) => {
      callback();
      return 0;
    },
  });
}
