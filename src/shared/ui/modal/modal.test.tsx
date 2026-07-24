/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { Modal } from './modal';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: vi.fn(() => []),
  });

  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      disconnect() {}

      observe() {}

      unobserve() {}
    }
  );

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

describe('Modal', () => {
  it('제목과 내용을 안내하고 닫기 요청을 전달한다', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <DesignSystemProvider>
        <Modal
          description="카테고리를 만들고 수정합니다."
          onOpenChange={onOpenChange}
          open
          title="카테고리 관리"
        >
          관리 내용
        </Modal>
      </DesignSystemProvider>
    );

    expect(screen.getByRole('dialog', { name: /카테고리 관리/ })).toBeTruthy();
    expect(screen.getByText('관리 내용')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
