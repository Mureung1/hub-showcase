/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatusMessage } from './status_message';

afterEach(cleanup);

describe('StatusMessage', () => {
  it('오류를 alert로 즉시 알린다', () => {
    render(
      <StatusMessage id="save-error" title="저장하지 못했어요" variant="error">
        링크를 확인한 뒤 다시 시도해 주세요.
      </StatusMessage>
    );

    const message = screen.getByRole('alert', { name: '저장하지 못했어요' });
    const title = screen.getByText('저장하지 못했어요');
    const description = screen.getByText(
      '링크를 확인한 뒤 다시 시도해 주세요.'
    );
    const icon = message.querySelector('svg');

    expect(message.id).toBe('save-error');
    expect(message.classList.contains('status-message--error')).toBe(true);
    expect(message.getAttribute('aria-describedby')).toBe(description.id);
    expect(title.tagName).toBe('STRONG');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(description).not.toBeNull();
  });

  it('성공을 status로 안내한다', () => {
    render(
      <StatusMessage title="저장했어요" variant="success">
        보관함에서 다시 찾을 수 있어요.
      </StatusMessage>
    );

    const message = screen.getByRole('status', { name: '저장했어요' });

    expect(message.classList.contains('status-message--success')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('여러 인스턴스의 제목과 설명 id 관계를 고유하게 유지한다', () => {
    render(
      <>
        <StatusMessage title="첫 번째 상태" variant="success">
          첫 번째 설명
        </StatusMessage>
        <StatusMessage title="두 번째 상태" variant="success">
          두 번째 설명
        </StatusMessage>
      </>
    );

    const messages = [
      screen.getByRole('status', { name: '첫 번째 상태' }),
      screen.getByRole('status', { name: '두 번째 상태' }),
    ];
    const titleIds = messages.map((message) =>
      message.getAttribute('aria-labelledby')
    );
    const descriptionIds = messages.map((message) =>
      message.getAttribute('aria-describedby')
    );

    expect(new Set(titleIds).size).toBe(2);
    expect(new Set(descriptionIds).size).toBe(2);
    messages.forEach((message, index) => {
      expect(
        message.contains(document.getElementById(titleIds[index] ?? ''))
      ).toBe(true);
      expect(
        message.contains(document.getElementById(descriptionIds[index] ?? ''))
      ).toBe(true);
    });
  });
});
