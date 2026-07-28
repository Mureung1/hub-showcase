/* @vitest-environment jsdom */
import { useRef, useState } from 'react';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Insight } from '../model/insight';
import { DesignSystemProvider } from '@/shared/ui';

import { InsightGrid } from './insight_grid';

const DEVELOPMENT_CATEGORY_ID = '10000000-0000-4000-8000-000000000001';
const DESIGN_CATEGORY_ID = '10000000-0000-4000-8000-000000000002';
const DESIGN_SYSTEMS_CATEGORY_ID = '10000000-0000-4000-8000-000000000003';
const CATEGORIES = [
  {
    colorKey: 'blue-2' as const,
    id: DEVELOPMENT_CATEGORY_ID,
    name: '개발',
  },
  {
    colorKey: 'coral-2' as const,
    id: DESIGN_CATEGORY_ID,
    name: '디자인',
  },
  {
    colorKey: 'violet-2' as const,
    id: DESIGN_SYSTEMS_CATEGORY_ID,
    name: 'Design Systems',
  },
];

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

  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: vi.fn(() => []),
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
              titleOrigin: 'capture',
              title: '선택 부담을 줄이는 패턴',
              memo: '모바일 화면을 만들 때 참고하기',
              categoryId: DESIGN_CATEGORY_ID,
              createdAt: '2026-07-14T00:00:00.000Z',
              updatedAt: '2026-07-14T00:00:00.000Z',
            },
          ]}
          categories={CATEGORIES}
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('article').textContent).toContain(
      '선택 부담을 줄이는 패턴'
    );
    expect(screen.getByRole('list', { name: '카테고리 목록' })).not.toBeNull();
    const sourceLink = screen.getByRole('link', { name: '원문 열기' });

    expect(sourceLink.getAttribute('href')).toBe(
      'https://example.com/article#details'
    );
    expect(sourceLink.getAttribute('target')).toBe('_blank');
    expect(sourceLink.getAttribute('rel')).toBe('noreferrer');
    expect(document.querySelector('.insight-card__thumbnail')).toBeNull();
    expect(document.querySelector('.insight-card__connection-clue')).toBeNull();
  });

  it('shows uncategorized when an insight has no category', () => {
    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[
            {
              id: '1',
              originalUrl: 'https://example.com/article',
              normalizedUrl: 'https://example.com/article',
              domain: 'example.com',
              titleOrigin: 'fallback',
              title: '맥락 없이 저장한 링크',
              memo: null,
              categoryId: null,
              createdAt: '2026-07-14T00:00:00.000Z',
              updatedAt: '2026-07-14T00:00:00.000Z',
            },
          ]}
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('list', { name: '카테고리 목록' })).not.toBeNull();
    expect(document.querySelector('.insight-card__memo')).toBeNull();
    expect(screen.getByText('미분류')).not.toBeNull();
    expect(screen.queryByText('카테고리 없음')).toBeNull();
  });

  it('shows uncategorized when the linked category no longer exists', () => {
    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[
            createInsight({
              categoryId: '10000000-0000-4000-8000-000000000099',
              title: '삭제된 카테고리의 링크',
            }),
          ]}
          categories={CATEGORIES}
        />
      </DesignSystemProvider>
    );

    expect(screen.getByText('미분류')).not.toBeNull();
  });

  it('edits title, memo, and category without offering URL editing', async () => {
    const user = userEvent.setup();
    const onUpdateInsight = vi.fn().mockResolvedValue({ ok: true } as const);

    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[
            createInsight({
              title: '기존 제목',
              memo: '기존 메모',
              categoryId: DEVELOPMENT_CATEGORY_ID,
            }),
          ]}
          categories={CATEGORIES}
          onUpdateInsight={onUpdateInsight}
        />
      </DesignSystemProvider>
    );

    expect(document.activeElement).toBe(document.body);
    const editButton = screen.getByRole('button', { name: '수정' });
    editButton.focus();
    await user.keyboard('{Enter}');

    const titleInput = screen.getByRole('textbox', { name: '제목' });
    const memoInput = screen.getByRole('textbox', { name: '한 줄 메모' });
    const categoryInput = screen.getByRole('combobox', { name: '카테고리' });

    expect(document.activeElement).toBe(titleInput);
    expect(screen.queryByRole('textbox', { name: /URL/ })).toBeNull();
    expect(screen.getByText('https://example.com/article')).not.toBeNull();
    expect(screen.getByRole('link', { name: '원문 열기' })).not.toBeNull();

    await user.clear(titleInput);
    await user.type(titleInput, '새 제목');
    await user.clear(memoInput);
    await user.type(memoInput, '새 메모');
    await user.click(categoryInput);
    await user.click(screen.getByRole('option', { name: 'Design Systems' }));
    await user.click(
      screen.getByRole('button', { name: '변경 내용 저장하기' })
    );

    expect(onUpdateInsight).toHaveBeenCalledWith('insight-1', {
      title: '새 제목',
      memo: '새 메모',
      categoryId: DESIGN_SYSTEMS_CATEGORY_ID,
    });
    expect(
      screen.queryByRole('button', { name: '변경 내용 저장하기' })
    ).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '수정' })
    );
  });

  it('selects a category created from the card selector immediately', async () => {
    const user = userEvent.setup();
    const onUpdateInsight = vi.fn().mockResolvedValue({ ok: true } as const);
    const onRequestCategoryCreation = vi.fn(
      (selectCategory: (categoryId: string) => void) => {
        selectCategory(DESIGN_SYSTEMS_CATEGORY_ID);
      }
    );

    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[createInsight({ title: '분류할 인사이트' })]}
          onRequestCategoryCreation={onRequestCategoryCreation}
          onUpdateInsight={onUpdateInsight}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '수정' }));
    await user.click(screen.getByRole('combobox', { name: '카테고리' }));
    await user.click(
      screen.getByRole('option', { name: '새 카테고리 만들기' })
    );
    await user.click(
      screen.getByRole('button', { name: '변경 내용 저장하기' })
    );

    expect(onRequestCategoryCreation).toHaveBeenCalledOnce();
    expect(onUpdateInsight).toHaveBeenCalledWith(
      'insight-1',
      expect.objectContaining({
        categoryId: DESIGN_SYSTEMS_CATEGORY_ID,
      })
    );
  });

  it('returns focus to the edit trigger when editing is canceled', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[createInsight({ title: '취소할 편집' })]}
          onUpdateInsight={async () => ({ ok: true })}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '수정' }));
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: '제목' })
    );

    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '수정' })
    );
  });

  it('keeps edit inputs after a write failure and retries without stale feedback', async () => {
    const user = userEvent.setup();
    const onUpdateInsight = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: 'write-failed' } as const)
      .mockResolvedValueOnce({ ok: true } as const);

    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[createInsight({ title: '기존 제목' })]}
          onUpdateInsight={onUpdateInsight}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '수정' }));
    const titleInput = screen.getByRole('textbox', { name: '제목' });
    await user.clear(titleInput);
    await user.type(titleInput, '실패해도 남을 제목');
    await user.click(
      screen.getByRole('button', { name: '변경 내용 저장하기' })
    );

    expect(screen.getByRole('alert').textContent).toContain(
      '입력한 내용은 그대로 두었어요.'
    );
    expect((titleInput as HTMLInputElement).value).toBe('실패해도 남을 제목');

    await user.type(titleInput, '!');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: '변경 내용 저장하기' })
    );

    expect(onUpdateInsight).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.queryByRole('button', { name: '변경 내용 다시 저장하기' })
    ).toBeNull();
  });

  it('keeps editing state isolated to the selected card', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[
            createInsight({ id: 'first', title: '첫 카드' }),
            createInsight({ id: 'second', title: '둘째 카드' }),
          ]}
          onUpdateInsight={async () => ({ ok: true })}
        />
      </DesignSystemProvider>
    );

    const cards = screen.getAllByRole('article');
    await user.click(within(cards[0]!).getByRole('button', { name: '수정' }));

    expect(
      within(cards[0]!).getByRole('textbox', { name: '제목' })
    ).not.toBeNull();
    expect(document.activeElement).toBe(
      within(cards[0]!).getByRole('textbox', { name: '제목' })
    );
    expect(
      within(cards[1]!).queryByRole('textbox', { name: '제목' })
    ).toBeNull();
    expect(
      within(cards[1]!).getByRole('heading', { name: '둘째 카드' })
    ).not.toBeNull();
  });

  it('cancels deletion, then keeps the card on failure and allows retry', async () => {
    const user = userEvent.setup();
    const onDeleteInsight = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: 'write-failed' } as const)
      .mockResolvedValueOnce({ ok: true } as const);

    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[createInsight({ title: '삭제 후보' })]}
          onDeleteInsight={onDeleteInsight}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(screen.getByText(/삭제할까요/)).not.toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '인사이트 삭제하기' })
    );
    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(onDeleteInsight).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: '삭제 후보' })).not.toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '삭제' })
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '인사이트 삭제하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '카드는 그대로 두었어요.'
    );
    expect(screen.getByRole('heading', { name: '삭제 후보' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '다시 삭제하기' }));

    expect(onDeleteInsight).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('moves focus to the next card, then the library search after deletion', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <DeletionFocusHarness />
      </DesignSystemProvider>
    );

    const firstCard = screen.getAllByRole('article')[0]!;
    await user.click(within(firstCard).getByRole('button', { name: '삭제' }));
    await user.click(
      within(firstCard).getByRole('button', { name: '인사이트 삭제하기' })
    );

    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(1);
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: '수정' })
      );
    });

    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '인사이트 삭제하기' }));

    await waitFor(() => {
      expect(screen.queryByRole('article')).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole('searchbox', { name: '보관함 검색' })
      );
    });
  });

  it('renders guidance instead of a link for an unsafe original URL', () => {
    render(
      <DesignSystemProvider>
        <InsightGrid
          insights={[
            createInsight({
              originalUrl: 'javascript:alert(1)',
              normalizedUrl: 'javascript:alert(1)',
            }),
          ]}
        />
      </DesignSystemProvider>
    );

    expect(screen.queryByRole('link', { name: '원문 열기' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(
      '안전하지 않은 링크'
    );
  });
});

function DeletionFocusHarness() {
  const [insights, setInsights] = useState([
    createInsight({ id: 'first', title: '첫 카드' }),
    createInsight({ id: 'second', title: '둘째 카드' }),
  ]);
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input aria-label="보관함 검색" ref={searchRef} type="search" />
      <InsightGrid
        insights={insights}
        onDeleteInsight={async (insightId) => {
          setInsights((currentInsights) =>
            currentInsights.filter((insight) => insight.id !== insightId)
          );
          return { ok: true };
        }}
        onDeletionFocusFallback={() => searchRef.current?.focus()}
        onUpdateInsight={async () => ({ ok: true })}
      />
    </>
  );
}

function createInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    originalUrl: 'https://example.com/article',
    normalizedUrl: 'https://example.com/article',
    domain: 'example.com',
    titleOrigin: 'fallback',
    title: 'example.com',
    memo: null,
    categoryId: null,
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides,
  };
}
