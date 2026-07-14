/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { InsightGrid } from './insight_grid';

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

describe('InsightGrid', () => {
  it('renders the saved insight metadata and source action', () => {
    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[
            {
              id: '1',
              originalUrl: 'https://example.com/article#details',
              normalizedUrl: 'https://example.com/article',
              domain: 'example.com',
              title: '선택 부담을 줄이는 패턴',
              memo: '모바일 화면을 만들 때 참고하기',
              category: '디자인',
              createdAt: '2026-07-14T00:00:00.000Z',
              updatedAt: '2026-07-14T00:00:00.000Z',
            },
          ]}
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('article').textContent).toContain(
      '선택 부담을 줄이는 패턴'
    );
    expect(screen.getByRole('list', { name: '카테고리 목록' })).not.toBeNull();
    expect(
      screen.getByRole('link', { name: '원문 열기' }).getAttribute('href')
    ).toBe('https://example.com/article#details');
  });
});
