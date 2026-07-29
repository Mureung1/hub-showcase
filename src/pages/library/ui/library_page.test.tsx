/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { LibraryPage, type LibraryPageProps } from './library_page';

const DEVELOPMENT_CATEGORY_ID = '10000000-0000-4000-8000-000000000001';
const SECOND_ID = '10000000-0000-4000-8000-000000000002';
const EXISTING_INSIGHT = {
  categoryId: null,
  createdAt: '2026-07-14T00:00:00.000Z',
  domain: 'example.com',
  id: '10000000-0000-4000-8000-000000000001',
  memo: null,
  normalizedUrl: 'https://example.com',
  originalUrl: 'https://example.com',
  title: '기존 인사이트',
  titleOrigin: 'fallback' as const,
  updatedAt: '2026-07-14T00:00:00.000Z',
};

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

afterEach(cleanup);

describe('LibraryPage', () => {
  it('centers the library header and work area while preserving result content width', () => {
    const styles = readFileSync(
      join(process.cwd(), 'src/pages/library/ui/library_page.css'),
      'utf8'
    );
    const stageRule = getCssRule(styles, '.library-page__stage');
    const headerRule = getCssRule(styles, '.library-page__header');
    const bodyRule = getCssRule(styles, '.library-page__body');
    const workAreaRule = getCssRule(styles, '.library-page__work-area');
    const filterRule = getCssRule(
      styles,
      '.library-page__filter > .category-filter'
    );
    const mobileStyles = styles.slice(
      styles.indexOf('@media (max-width: 767px)')
    );

    expect(stageRule).toContain('background: var(--color-library-coral);');
    expect(headerRule).toContain('width: min(820px, 100%);');
    expect(bodyRule).toContain(
      'width: min(var(--layout-content-width), calc(100% - var(--spacing-8)));'
    );
    expect(workAreaRule).toContain('display: grid;');
    expect(filterRule).toContain('justify-content: center;');
    expect(
      getCssRule(mobileStyles, '.library-page__filter > .category-filter')
    ).toContain('justify-content: flex-start;');
    expect(
      getCssRule(mobileStyles, 'button.library-page__import-action')
    ).toContain('width: 100%;');
  });

  it('distinguishes an unavailable remote library from an empty library', async () => {
    const user = userEvent.setup();
    const onRetryLoad = vi.fn();

    const { rerender } = render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="all"
          categoryOptions={[{ colorKey: null, label: '전체', value: 'all' }]}
          insights={[]}
          totalInsightCount={0}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenImport={vi.fn()}
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
      screen.queryByRole('heading', { name: '아직 저장한 인사이트가 없어요' })
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));

    expect(onRetryLoad).toHaveBeenCalledOnce();

    rerender(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="all"
          categoryOptions={[{ colorKey: null, label: '전체', value: 'all' }]}
          insights={[EXISTING_INSIGHT]}
          totalInsightCount={1}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenImport={vi.fn()}
          onOpenSave={vi.fn()}
          onQueryChange={vi.fn()}
          onRetryLoad={onRetryLoad}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query=""
          unavailable
        />
      </DesignSystemProvider>
    );

    expect(screen.getByText('기존 인사이트')).not.toBeNull();
    expect(screen.getByText('인사이트 1개')).not.toBeNull();
  });

  it('keeps a no-result query and offers clear and save actions', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    const onOpenSave = vi.fn();
    const onQueryChange = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory={DEVELOPMENT_CATEGORY_ID}
          categoryOptions={[
            { colorKey: null, label: '전체', value: 'all' },
            {
              colorKey: 'blue-2',
              label: '개발',
              value: DEVELOPMENT_CATEGORY_ID,
            },
          ]}
          insights={[]}
          totalInsightCount={1}
          onCategoryChange={onCategoryChange}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenImport={vi.fn()}
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
      screen.getByRole('heading', {
        name: '이 검색어로 찾은 인사이트가 없어요',
      })
    ).not.toBeNull();
    expect(screen.getByText('검색 결과 0개')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '검색어 지우기' }));

    expect(onQueryChange).toHaveBeenCalledWith('');
    expect(onCategoryChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(search);

    await user.click(screen.getByRole('button', { name: '인사이트 저장하기' }));

    expect(onOpenSave).toHaveBeenCalledOnce();
  });

  it('shows the actual empty library even when a query remains', () => {
    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="all"
          categoryOptions={[{ colorKey: null, label: '전체', value: 'all' }]}
          insights={[]}
          totalInsightCount={0}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenImport={vi.fn()}
          onOpenSave={vi.fn()}
          onQueryChange={vi.fn()}
          onRetryLoad={vi.fn()}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query="기억 단서"
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '아직 저장한 인사이트가 없어요' })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: '이 검색어로 찾은 인사이트가 없어요',
      })
    ).toBeNull();
  });

  it('distinguishes a category-only no-result state from an empty library', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    const onQueryChange = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory={DEVELOPMENT_CATEGORY_ID}
          categoryOptions={[
            { colorKey: null, label: '전체', value: 'all' },
            {
              colorKey: 'blue-2',
              label: '개발',
              value: DEVELOPMENT_CATEGORY_ID,
            },
          ]}
          insights={[]}
          totalInsightCount={1}
          onCategoryChange={onCategoryChange}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenImport={vi.fn()}
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
        name: '이 카테고리에 인사이트가 없어요',
      })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: '아직 저장한 인사이트가 없어요' })
    ).toBeNull();
    expect(screen.getByText('개발 0개')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '전체 보기' }));

    expect(onCategoryChange).toHaveBeenCalledWith('all');
    expect(onQueryChange).toHaveBeenCalledWith('');
  });

  it('explains an empty result and opens the save screen', async () => {
    const user = userEvent.setup();
    const onOpenImport = vi.fn();
    const onOpenSave = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          activeCategory="all"
          categoryOptions={[{ colorKey: null, label: '전체', value: 'all' }]}
          insights={[]}
          totalInsightCount={0}
          onCategoryChange={vi.fn()}
          onDeleteInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          onOpenImport={onOpenImport}
          onOpenSave={onOpenSave}
          onQueryChange={vi.fn()}
          onRetryLoad={vi.fn()}
          onUpdateInsight={vi.fn().mockResolvedValue({ ok: true } as const)}
          query=""
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '아직 저장한 인사이트가 없어요' })
    ).not.toBeNull();
    expect(screen.getByText(/첫 인사이트를 저장하면/)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '인사이트 저장하기' }));

    expect(onOpenSave).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: '인사이트 가져오기' }));
    expect(onOpenImport).toHaveBeenCalledOnce();
  });

  it('기존 보관함에는 가져오기 보조 액션을 유지하고 로딩 중에는 숨긴다', () => {
    const onOpenImport = vi.fn();
    const commonProps = {
      activeCategory: 'all',
      categoryOptions: [{ colorKey: null, label: '전체', value: 'all' }],
      onCategoryChange: vi.fn(),
      onDeleteInsight: vi.fn().mockResolvedValue({ ok: true } as const),
      onDeleteInsights: vi.fn().mockResolvedValue({ ok: true } as const),
      onOpenImport,
      onOpenSave: vi.fn(),
      onQueryChange: vi.fn(),
      onRetryLoad: vi.fn(),
      onUpdateInsight: vi.fn().mockResolvedValue({ ok: true } as const),
      query: '',
      totalInsightCount: 1,
    };
    const { rerender } = render(
      <DesignSystemProvider>
        <LibraryPage {...commonProps} insights={[EXISTING_INSIGHT]} />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('button', { name: '인사이트 가져오기' })
    ).not.toBeNull();
    expect(screen.getByText('인사이트 1개')).not.toBeNull();

    rerender(
      <DesignSystemProvider>
        <LibraryPage {...commonProps} insights={[EXISTING_INSIGHT]} loading />
      </DesignSystemProvider>
    );

    expect(
      screen.queryByRole('button', { name: '인사이트 가져오기' })
    ).toBeNull();
  });

  it('현재 목록을 선택하고 확인한 뒤에만 삭제하며 실패하면 선택을 유지한다', async () => {
    const user = userEvent.setup();
    const onDeleteInsights = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: 'write-failed' } as const)
      .mockResolvedValueOnce({ ok: true } as const);
    const insights = [
      EXISTING_INSIGHT,
      { ...EXISTING_INSIGHT, id: SECOND_ID, title: '둘째 인사이트' },
    ];

    render(
      <DesignSystemProvider>
        <LibraryPage
          {...createLibraryProps()}
          insights={insights}
          onDeleteInsights={onDeleteInsights}
          totalInsightCount={2}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '선택' }));
    expect(screen.getByText('0개 선택됨')).not.toBeNull();
    expect(screen.queryByRole('link', { name: '원문 열기' })).toBeNull();

    await user.click(
      screen.getByRole('button', { name: '현재 목록 2개 모두 선택' })
    );
    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(onDeleteInsights).not.toHaveBeenCalled();

    const confirmation = screen.getByRole('textbox', { name: '확인 문구' });
    await user.type(confirmation, '삭제');
    await user.click(
      screen.getByRole('button', {
        name: '인사이트 2개 모두 삭제하기',
      })
    );

    expect((await screen.findByRole('alert')).textContent).toContain(
      '인사이트와 선택은 그대로 두었어요.'
    );
    expect(screen.getByText('2개 선택됨')).not.toBeNull();

    await user.click(
      screen.getByRole('button', {
        name: '인사이트 2개 모두 다시 삭제하기',
      })
    );
    expect(onDeleteInsights).toHaveBeenCalledTimes(2);
  });

  it('검색 범위가 바뀌면 숨은 선택을 남기지 않는다', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();

    render(
      <DesignSystemProvider>
        <LibraryPage
          {...createLibraryProps()}
          insights={[EXISTING_INSIGHT]}
          onQueryChange={onQueryChange}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '선택' }));
    await user.click(
      screen.getByRole('button', { name: '기존 인사이트 선택' })
    );
    await user.type(
      screen.getByRole('searchbox', { name: '보관함 검색' }),
      '다른 범위'
    );

    expect(onQueryChange).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '선택' })).not.toBeNull();
    expect(screen.queryByText('1개 선택됨')).toBeNull();
  });
});

function createLibraryProps(
  overrides: Partial<LibraryPageProps> = {}
): LibraryPageProps {
  return {
    activeCategory: 'all',
    categoryOptions: [{ colorKey: null, label: '전체', value: 'all' }],
    insights: [EXISTING_INSIGHT],
    onCategoryChange: vi.fn(),
    onDeleteInsight: vi.fn().mockResolvedValue({ ok: true } as const),
    onDeleteInsights: vi.fn().mockResolvedValue({ ok: true } as const),
    onOpenImport: vi.fn(),
    onOpenSave: vi.fn(),
    onQueryChange: vi.fn(),
    onRetryLoad: vi.fn(),
    onUpdateInsight: vi.fn().mockResolvedValue({ ok: true } as const),
    query: '',
    totalInsightCount: 1,
    ...overrides,
  };
}

function getCssRule(styles: string, selector: string) {
  const ruleStart = styles.indexOf(`${selector} {`);

  if (ruleStart < 0) {
    throw new Error(`Missing CSS rule for ${selector}`);
  }

  const ruleEnd = styles.indexOf('}', ruleStart);

  return styles.slice(ruleStart, ruleEnd + 1);
}
