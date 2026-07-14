/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { AuthenticatedWorkspace } from './authenticated_workspace';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserverMock {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
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

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete (navigator as Navigator & { onLine?: boolean }).onLine;
  vi.unstubAllGlobals();
});

describe('AuthenticatedWorkspace offline acceptance', () => {
  it('completes the local save, search, and retrieval flow without fetch', async () => {
    const fetchMock = vi.fn(() =>
      Promise.reject(new TypeError('Network request blocked by offline test'))
    );
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );

    expect(navigator.onLine).toBe(false);

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.type(
      screen.getByRole('textbox', { name: '링크 URL' }),
      'https://offline.example/react-local-flow'
    );
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    await user.type(
      screen.getByRole('textbox', { name: '제목 (선택)' }),
      '오프라인 React 자료'
    );
    await user.type(
      screen.getByRole('textbox', { name: '한 줄 메모 (선택)' }),
      '네트워크 없이 로컬 작업팩 찾기'
    );
    await user.type(
      screen.getByRole('textbox', { name: '카테고리 (선택)' }),
      '오프라인 QA'
    );
    await user.click(screen.getByRole('button', { name: '맥락 저장하기' }));

    await user.click(screen.getByRole('button', { name: '보관함' }));
    await user.type(
      screen.getByRole('searchbox', { name: '보관함 검색' }),
      '네트워크 없이'
    );
    expect(
      screen.getByRole('heading', { name: '오프라인 React 자료' })
    ).not.toBeNull();
    expect(screen.getByRole('status').textContent).toContain('검색 결과 1개');

    await user.click(screen.getByRole('button', { name: '홈' }));
    await user.type(
      screen.getByRole('textbox', {
        name: '지금 꺼내보고 싶은 상황',
      }),
      '오프라인 React 작업팩'
    );
    await user.keyboard('{Enter}');

    expect(screen.getByRole('status').textContent).toContain(
      '“오프라인 React 작업팩” 작업팩 1개'
    );
    expect(
      screen.getByRole('heading', { name: '오프라인 React 자료' })
    ).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  }, 10_000);
});
