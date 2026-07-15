/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { LibraryPage } from './library_page';

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

describe('LibraryPage', () => {
  it('keeps a no-result query and offers clear and save actions', async () => {
    const user = userEvent.setup();
    const onOpenSave = vi.fn();
    const onQueryChange = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="All"
          categoryOptions={[{ label: '전체', tone: 'slate', value: 'All' }]}
          insights={[]}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenSave={onOpenSave}
          onQueryChange={onQueryChange}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query="기억 단서"
        />
      </DesignSystemProvider>
    );

    const search = screen.getByRole('searchbox', { name: '보관함 검색' });

    expect((search as HTMLInputElement).value).toBe('기억 단서');
    expect(
      screen.getByRole('heading', { name: '검색 결과가 없어요' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '검색어 지우기' }));

    expect(onQueryChange).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(search);

    await user.click(screen.getByRole('button', { name: '링크 저장' }));

    expect(onOpenSave).toHaveBeenCalledOnce();
  });

  it('explains an empty result and opens the save screen', async () => {
    const user = userEvent.setup();
    const onOpenSave = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="All"
          categoryOptions={[{ label: '전체', tone: 'slate', value: 'All' }]}
          insights={[]}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenSave={onOpenSave}
          onQueryChange={vi.fn()}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query=""
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '저장된 링크가 없어요' })
    ).not.toBeNull();
    expect(screen.getByText(/조건에 맞는 인사이트가 없습니다/)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '링크 저장' }));

    expect(onOpenSave).toHaveBeenCalledOnce();
  });
});
