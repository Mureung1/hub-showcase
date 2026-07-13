/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { EmptyState } from './empty_state';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(cleanup);

describe('EmptyState', () => {
  it('제목과 이유, 하나의 주 행동을 보여주고 행동을 전달한다', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <DesignSystemProvider>
        <EmptyState
          actionLabel="링크 저장하기"
          description="첫 링크를 저장하면 여기에 보여요."
          onAction={onAction}
          title="저장한 링크가 없어요"
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '저장한 링크가 없어요' })
    ).not.toBeNull();
    expect(
      screen.getByText('첫 링크를 저장하면 여기에 보여요.')
    ).not.toBeNull();

    const action = screen.getByRole('button', { name: '링크 저장하기' });

    expect(screen.getAllByRole('button')).toHaveLength(1);

    await user.click(action);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('여러 인스턴스의 aria-labelledby id를 고유하게 유지한다', () => {
    render(
      <DesignSystemProvider>
        <EmptyState
          actionLabel="첫 번째 행동"
          description="첫 번째 이유"
          onAction={vi.fn()}
          title="같은 제목"
        />
        <EmptyState
          actionLabel="두 번째 행동"
          description="두 번째 이유"
          onAction={vi.fn()}
          title="같은 제목"
        />
      </DesignSystemProvider>
    );

    const regions = screen.getAllByRole('region', { name: '같은 제목' });
    const titleIds = regions.map((region) =>
      region.getAttribute('aria-labelledby')
    );

    expect(regions).toHaveLength(2);
    expect(new Set(titleIds).size).toBe(2);
    titleIds.forEach((titleId, index) => {
      expect(titleId).not.toBeNull();
      expect(
        regions[index]?.contains(document.getElementById(titleId ?? ''))
      ).toBe(true);
    });
  });

  it('키보드 행동이 부모 form을 제출하지 않는다', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onSubmit = vi.fn();

    render(
      <DesignSystemProvider>
        <form onSubmit={onSubmit}>
          <EmptyState
            actionLabel="다시 불러오기"
            description="잠시 후 다시 시도해 주세요."
            onAction={onAction}
            title="결과를 찾지 못했어요"
          />
        </form>
      </DesignSystemProvider>
    );

    const action = screen.getByRole('button', { name: '다시 불러오기' });

    expect(action.getAttribute('type')).toBe('button');

    action.focus();
    await user.keyboard('{Enter}');

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
