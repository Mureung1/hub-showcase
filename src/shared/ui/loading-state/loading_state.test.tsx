/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LoadingState } from './loading_state';

afterEach(cleanup);

describe('LoadingState', () => {
  it('기본 라벨과 세 개의 정적 스켈레톤 카드를 노출한다', () => {
    render(<LoadingState />);

    const status = screen.getByRole('status', { name: '불러오는 중' });
    const grid = status.querySelector('.loading-state__grid');
    const cards = status.querySelectorAll('.loading-state__card');
    const label = screen.getByText('불러오는 중');

    expect(grid?.getAttribute('aria-hidden')).toBe('true');
    expect(label.classList.contains('loading-state__label')).toBe(true);
    expect(grid?.contains(label)).toBe(false);
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      expect(card.querySelectorAll('.loading-state__placeholder')).toHaveLength(
        3
      );
      expect(card.querySelectorAll('.loading-state__line')).toHaveLength(2);
    });
  });

  it('라벨이 바뀌면 live status의 실제 텍스트도 바뀐다', () => {
    const { rerender } = render(<LoadingState />);

    const initialStatus = screen.getByRole('status', { name: '불러오는 중' });

    expect(initialStatus.textContent).toContain('불러오는 중');

    rerender(<LoadingState label="보관함 불러오는 중" />);

    const updatedStatus = screen.getByRole('status', {
      name: '보관함 불러오는 중',
    });

    expect(updatedStatus.textContent).toContain('보관함 불러오는 중');
    expect(updatedStatus.textContent).not.toBe('불러오는 중');
  });
});
