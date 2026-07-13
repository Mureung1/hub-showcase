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

    const message = screen.getByRole('alert');
    const title = screen.getByText('저장하지 못했어요');
    const icon = message.querySelector('svg');

    expect(message.id).toBe('save-error');
    expect(message.classList.contains('status-message--error')).toBe(true);
    expect(title.tagName).toBe('STRONG');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(
      screen.getByText('링크를 확인한 뒤 다시 시도해 주세요.')
    ).not.toBeNull();
  });

  it('성공을 status로 안내한다', () => {
    render(
      <StatusMessage title="저장했어요" variant="success">
        보관함에서 다시 찾을 수 있어요.
      </StatusMessage>
    );

    const message = screen.getByRole('status');

    expect(message.classList.contains('status-message--success')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
