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

    expect(grid?.getAttribute('aria-hidden')).toBe('true');
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      expect(Array.from(card.children).map((child) => child.tagName)).toEqual([
        'SPAN',
        'I',
        'I',
      ]);
    });
  });

  it('상황에 맞는 접근 가능한 라벨로 바꿀 수 있다', () => {
    render(<LoadingState label="보관함 불러오는 중" />);

    expect(
      screen.getByRole('status', { name: '보관함 불러오는 중' })
    ).not.toBeNull();
  });
});
