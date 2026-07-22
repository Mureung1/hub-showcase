/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  it('centers the library header and work area while preserving result content width', () => {
    const styles = readFileSync(
      join(process.cwd(), 'src/pages/library/ui/library_page.css'),
      'utf8'
    );
    const headerRule = getCssRule(styles, '.library-page__header');
    const workAreaRule = getCssRule(styles, '.library-page__work-area');
    const filterRule = getCssRule(
      styles,
      '.library-page__filter > .category-filter'
    );
    const mobileStyles = styles.slice(
      styles.indexOf('@media (max-width: 767px)')
    );

    expect(headerRule).toContain('width: min(820px, 100%);');
    expect(headerRule).toContain('margin-inline: auto;');
    expect(headerRule).toContain('text-align: center;');
    expect(workAreaRule).toContain('width: min(820px, 100%);');
    expect(workAreaRule).toContain('margin-inline: auto;');
    expect(filterRule).toContain('justify-content: center;');
    expect(
      getCssRule(mobileStyles, '.library-page__filter > .category-filter')
    ).toContain('justify-content: flex-start;');
  });

  it('distinguishes an unavailable remote library from an empty library', async () => {
    const user = userEvent.setup();
    const onRetryLoad = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="All"
          categoryOptions={[{ label: '전체', tone: 'slate', value: 'All' }]}
          insights={[]}
          totalInsightCount={0}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenSave={vi.fn()}
          onQueryChange={vi.fn()}
          onRetryLoad={onRetryLoad}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query=""
          unavailable
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '보관함을 불러오지 못했어요' })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: '저장된 링크가 없어요' })
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));

    expect(onRetryLoad).toHaveBeenCalledOnce();
  });

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
          totalInsightCount={1}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenSave={onOpenSave}
          onQueryChange={onQueryChange}
          onRetryLoad={vi.fn()}
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

  it('shows the actual empty library even when a query remains', () => {
    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="All"
          categoryOptions={[{ label: '전체', tone: 'slate', value: 'All' }]}
          insights={[]}
          totalInsightCount={0}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenSave={vi.fn()}
          onQueryChange={vi.fn()}
          onRetryLoad={vi.fn()}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query="기억 단서"
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '저장된 링크가 없어요' })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: '검색 결과가 없어요' })
    ).toBeNull();
  });

  it('distinguishes a category-only no-result state from an empty library', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    const onQueryChange = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="개발"
          categoryOptions={[
            { label: '전체', tone: 'slate', value: 'All' },
            { label: '개발', tone: 'blue', value: '개발' },
          ]}
          insights={[]}
          totalInsightCount={1}
          onCategoryChange={onCategoryChange}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenSave={vi.fn()}
          onQueryChange={onQueryChange}
          onRetryLoad={vi.fn()}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query=""
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', {
        name: '조건에 맞는 인사이트가 없어요',
      })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: '저장된 링크가 없어요' })
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: '전체 보기' }));

    expect(onCategoryChange).toHaveBeenCalledWith('All');
    expect(onQueryChange).toHaveBeenCalledWith('');
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
          totalInsightCount={0}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenSave={onOpenSave}
          onQueryChange={vi.fn()}
          onRetryLoad={vi.fn()}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query=""
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '저장된 링크가 없어요' })
    ).not.toBeNull();
    expect(screen.getByText(/아직 저장한 링크가 없습니다/)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '링크 저장' }));

    expect(onOpenSave).toHaveBeenCalledOnce();
  });
});

function getCssRule(styles: string, selector: string) {
  const ruleStart = styles.indexOf(`${selector} {`);

  if (ruleStart < 0) {
    throw new Error(`Missing CSS rule for ${selector}`);
  }

  const ruleEnd = styles.indexOf('}', ruleStart);

  return styles.slice(ruleStart, ruleEnd + 1);
}
