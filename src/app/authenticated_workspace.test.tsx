/* @vitest-environment jsdom */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Insight, InsightRepository } from '@/entities/insight';
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
});

describe('AuthenticatedWorkspace', () => {
  it('starts with examples and immediately retrieves when a suggested situation is selected', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [
          createInsight({
            id: 'project-design',
            title: '앱 화면 설계',
            memo: '팀 프로젝트 앱 디자인 참고',
          }),
          createInsight({ id: 'unrelated', title: '여행 준비' }),
        ],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '이런 상황에서 시작해보세요' })
    ).not.toBeNull();
    expect(screen.queryByRole('article')).toBeNull();

    const suggestion = screen.getByRole('button', { name: '팀 프로젝트' });
    await user.click(suggestion);

    expect(suggestion.getAttribute('aria-pressed')).toBe('true');
    expect(
      (
        screen.getByRole('textbox', {
          name: '지금 꺼내보고 싶은 상황',
        }) as HTMLInputElement
      ).value
    ).toBe('팀 프로젝트 앱 디자인 참고');
    expect(screen.getByRole('status').textContent).toContain(
      '“팀 프로젝트 앱 디자인 참고” 작업팩 1개'
    );
    expect(
      screen.getByRole('heading', { name: '앱 화면 설계' })
    ).not.toBeNull();
    expect(screen.getByText(/메모의 “팀” 단서/)).not.toBeNull();
  });

  it('keeps the submitted workpack while a blank draft is unsubmitted, then returns to examples on submit', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [
          createInsight({
            title: '팀 프로젝트 자료',
            memo: '팀 프로젝트 앱 디자인 참고 수정',
          }),
        ],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    const suggestion = screen.getByRole('button', { name: '팀 프로젝트' });
    await user.click(suggestion);
    const input = screen.getByRole('textbox', {
      name: '지금 꺼내보고 싶은 상황',
    });

    await user.type(input, ' 수정');

    expect(suggestion.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('status').textContent).toContain(
      '“팀 프로젝트 앱 디자인 참고” 작업팩'
    );
    expect(screen.getByRole('status').textContent).not.toContain('참고 수정”');

    await user.keyboard('{Enter}');

    expect(screen.getByRole('status').textContent).toContain(
      '“팀 프로젝트 앱 디자인 참고 수정” 작업팩'
    );

    await user.clear(input);

    expect((input as HTMLInputElement).value).toBe('');
    expect(suggestion.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('status').textContent).toContain(
      '“팀 프로젝트 앱 디자인 참고 수정” 작업팩 1개'
    );
    expect(screen.getByRole('article')).not.toBeNull();

    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('heading', { name: '이런 상황에서 시작해보세요' })
    ).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('waits for free-input submission before presenting a workpack', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [createInsight({ title: 'React 폼 검증' })],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.type(
      screen.getByRole('textbox', {
        name: '지금 꺼내보고 싶은 상황',
      }),
      'React'
    );

    expect(
      screen.getByRole('heading', { name: '이런 상황에서 시작해보세요' })
    ).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('article')).toBeNull();

    await user.keyboard('{Enter}');

    expect(screen.getByRole('status').textContent).toContain(
      '“React” 작업팩 1개'
    );
    expect(
      screen.getByRole('heading', { name: 'React 폼 검증' })
    ).not.toBeNull();
  });

  it('recomputes the same submitted workpack after edits, saves, and deletions', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [createInsight({ title: 'signal 자료' })],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    const retrieveInput = screen.getByRole('textbox', {
      name: '지금 꺼내보고 싶은 상황',
    });
    await user.type(retrieveInput, 'signal');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status').textContent).toContain(
      '“signal” 작업팩 1개'
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    await user.click(screen.getByRole('button', { name: '수정' }));
    const titleInput = screen.getByRole('textbox', { name: '제목' });
    await user.clear(titleInput);
    await user.type(titleInput, '다른 자료');
    await user.click(screen.getByRole('button', { name: '변경 저장' }));
    await user.click(screen.getByRole('button', { name: '홈' }));

    expect(screen.getByRole('status').textContent).toContain(
      '“signal” 작업팩 0개'
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.type(
      screen.getByRole('textbox', { name: '링크 URL' }),
      'https://signal.example/article'
    );
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    await user.click(screen.getByRole('button', { name: '건너뛰기' }));
    await user.click(screen.getByRole('button', { name: '홈' }));

    expect(screen.getByRole('status').textContent).toContain(
      '“signal” 작업팩 1개'
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    const savedCard = screen
      .getByRole('heading', { name: 'signal.example' })
      .closest('article');

    expect(savedCard).not.toBeNull();
    await user.click(within(savedCard!).getByRole('button', { name: '삭제' }));
    await user.click(
      within(savedCard!).getByRole('button', { name: '삭제 확정' })
    );
    await user.click(screen.getByRole('button', { name: '홈' }));

    expect(screen.getByRole('status').textContent).toContain(
      '“signal” 작업팩 0개'
    );
  });

  it('combines category filtering with deterministic all-result ranking', async () => {
    const user = userEvent.setup();
    const titleMatch = createInsight({
      id: 'title-match',
      originalUrl: 'https://title.example/signal',
      normalizedUrl: 'https://title.example/signal',
      domain: 'title.example',
      title: 'signal 제목',
      category: '개발',
      createdAt: '2026-07-14T00:00:00.000Z',
    });
    const memoMatch = createInsight({
      id: 'memo-match',
      originalUrl: 'https://memo.example/article',
      normalizedUrl: 'https://memo.example/article',
      domain: 'memo.example',
      title: '메모로 찾은 자료',
      memo: 'signal',
      category: '개발',
      createdAt: '2026-07-13T00:00:00.000Z',
    });
    const moreMatches = Array.from({ length: 6 }, (_, index) =>
      createInsight({
        id: `more-${index}`,
        originalUrl: `https://more${index}.example/article`,
        normalizedUrl: `https://more${index}.example/article`,
        domain: `more${index}.example`,
        title: `signal 추가 자료 ${index}`,
        category: '개발',
      })
    );
    const otherCategory = createInsight({
      id: 'other-category',
      title: 'signal 디자인 자료',
      category: '디자인',
    });
    const repository: InsightRepository = {
      load: () => ({
        insights: [titleMatch, memoMatch, ...moreMatches, otherCategory],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    await user.click(screen.getByRole('button', { name: '개발' }));
    const search = screen.getByRole('searchbox', { name: '보관함 검색' });
    await user.type(search, 'signal');

    expect((search as HTMLInputElement).value).toBe('signal');
    expect(screen.getByRole('status').textContent).toBe('검색 결과 8개');
    expect(
      screen
        .getAllByRole('article')
        .map((article) => article.querySelector('h3')?.textContent)
    ).toEqual([
      '메모로 찾은 자료',
      'signal 제목',
      ...moreMatches.map(({ title }) => title),
    ]);
    expect(screen.queryByText('signal 디자인 자료')).toBeNull();
  });

  it('returns to the full library when recovering from no search results', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [
          createInsight({
            id: 'development',
            title: '개발 자료',
            category: '개발',
          }),
          createInsight({
            id: 'design',
            title: '디자인 자료',
            category: '디자인',
          }),
        ],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    await user.click(screen.getByRole('button', { name: '개발' }));
    const search = screen.getByRole('searchbox', { name: '보관함 검색' });
    await user.type(search, '없는 검색어');

    expect(
      screen.getByRole('heading', { name: '검색 결과가 없어요' })
    ).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('검색 결과 없음');

    await user.click(screen.getByRole('button', { name: '검색어 지우기' }));

    expect((search as HTMLInputElement).value).toBe('');
    expect(
      screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.activeElement).toBe(search);
  });

  it('moves focus to the next card when an edited category leaves the active filter', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [
          createInsight({
            id: 'category-change',
            title: '카테고리로 찾은 카드',
            category: '개발',
          }),
          createInsight({
            id: 'next-card',
            originalUrl: 'https://next.example/article',
            normalizedUrl: 'https://next.example/article',
            domain: 'next.example',
            title: '다음 개발 카드',
            category: '개발',
          }),
        ],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    await user.click(screen.getByRole('button', { name: '개발' }));
    await user.click(screen.getAllByRole('button', { name: '수정' })[0]!);
    const categoryInput = screen.getByRole('textbox', { name: '카테고리' });
    await user.clear(categoryInput);
    await user.type(categoryInput, '디자인');
    await user.click(screen.getByRole('button', { name: '변경 저장' }));

    await waitFor(() => {
      expect(screen.queryByText('카테고리로 찾은 카드')).toBeNull();
      expect(screen.getByText('다음 개발 카드')).not.toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: '수정' })
      );
    });
  });

  it('returns focus to library search when edited content leaves the search result', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [
          createInsight({
            title: '집중력 키워드 자료',
            memo: '집중력 키워드 메모',
          }),
        ],
        warnings: [],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    const search = screen.getByRole('searchbox', { name: '보관함 검색' });
    await user.type(search, '집중력 키워드');
    await user.click(screen.getByRole('button', { name: '수정' }));
    const titleInput = screen.getByRole('textbox', { name: '제목' });
    const memoInput = screen.getByRole('textbox', { name: '한 줄 메모' });
    await user.clear(titleInput);
    await user.type(titleInput, '새 제목');
    await user.clear(memoInput);
    await user.type(memoInput, '새 메모');
    await user.click(screen.getByRole('button', { name: '변경 저장' }));

    await waitFor(() => {
      expect(screen.queryByText('새 제목')).toBeNull();
      expect(document.activeElement).toBe(search);
    });
  });

  it('updates search data immediately and persists edit and deletion across remounts', async () => {
    const user = userEvent.setup();
    let persistedInsights = [
      createInsight({
        title: '편집할 링크',
        memo: '기존 메모',
        category: '개발',
      }),
    ];
    const repository: InsightRepository = {
      load: () => ({ insights: persistedInsights, warnings: [] }),
      save: (insights) => {
        persistedInsights = insights;
        return { ok: true };
      },
    };
    const firstRender = render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    await user.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '검색에 바로 잡힐 제목' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '한 줄 메모' }), {
      target: { value: '  새 검색 단서  ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '카테고리' }), {
      target: { value: '  Design   Systems  ' },
    });
    await user.click(screen.getByRole('button', { name: '변경 저장' }));

    expect(persistedInsights[0]).toEqual(
      expect.objectContaining({
        title: '검색에 바로 잡힐 제목',
        memo: '새 검색 단서',
        category: 'Design Systems',
      })
    );

    const search = screen.getByRole('searchbox', { name: '보관함 검색' });
    await user.type(search, '새 검색 단서');
    expect(
      screen.getByRole('heading', { name: '검색에 바로 잡힐 제목' })
    ).not.toBeNull();

    firstRender.unmount();
    const editReload = render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );
    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(
      screen.getByRole('heading', { name: '검색에 바로 잡힐 제목' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(
      screen.getByRole('heading', { name: '검색에 바로 잡힐 제목' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '삭제 확정' }));
    expect(
      screen.queryByRole('heading', { name: '검색에 바로 잡힐 제목' })
    ).toBeNull();
    expect(persistedInsights).toEqual([]);
    expect(document.activeElement).toBe(
      screen.getByRole('searchbox', { name: '보관함 검색' })
    );

    editReload.unmount();
    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );
    await user.click(screen.getByRole('button', { name: '보관함' }));

    expect(
      screen.getByRole('heading', { name: '저장된 링크가 없어요' })
    ).not.toBeNull();
  });

  it('saves optional personal context and shows it in the library immediately', async () => {
    const user = userEvent.setup();
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.change(screen.getByRole('textbox', { name: '링크 URL' }), {
      target: { value: 'https://context.example/article' },
    });
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(
      screen.getByRole('heading', {
        name: '언제 다시 쓰고 싶은 자료인가요?',
      })
    ).not.toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: '제목 (선택)' }), {
      target: { value: '다시 쓰는 디자인 패턴' },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: '한 줄 메모 (선택)' }),
      { target: { value: '모바일 설계 때 참고하기' } }
    );
    fireEvent.change(screen.getByRole('textbox', { name: '카테고리 (선택)' }), {
      target: { value: '  Design   Systems  ' },
    });
    await user.click(screen.getByRole('button', { name: '맥락 저장하기' }));

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.[0][0]).toEqual(
      expect.objectContaining({
        category: 'Design Systems',
        memo: '모바일 설계 때 참고하기',
        title: '다시 쓰는 디자인 패턴',
      })
    );

    const titleInput = screen.getByRole('textbox', { name: '제목 (선택)' });
    fireEvent.change(titleInput, {
      target: { value: '수정한 디자인 패턴' },
    });
    expect(screen.queryByRole('status', { name: '맥락 저장 완료' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '맥락 저장하기' }));

    expect(save).toHaveBeenCalledTimes(3);
    expect(save.mock.calls[2]?.[0][0]?.title).toBe('수정한 디자인 패턴');
    expect(
      screen.getByRole('status', { name: '맥락 저장 완료' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '보관함' }));

    expect(screen.getByText('수정한 디자인 패턴')).not.toBeNull();
    expect(screen.getByText('모바일 설계 때 참고하기')).not.toBeNull();
    expect(screen.getByText('Design Systems')).not.toBeNull();

    fireEvent.change(screen.getByRole('searchbox', { name: '보관함 검색' }), {
      target: { value: 'Design Systems' },
    });
    expect(screen.getByText('수정한 디자인 패턴')).not.toBeNull();
  });

  it('keeps the saved URL when personal context is skipped', async () => {
    const user = userEvent.setup();
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.change(screen.getByRole('textbox', { name: '링크 URL' }), {
      target: { value: 'https://skip-context.example/article#source' },
    });
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    await user.click(screen.getByRole('button', { name: '건너뛰기' }));

    expect(save).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('link', { name: '원문 열기' }).getAttribute('href')
    ).toBe('https://skip-context.example/article#source');

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(
      (screen.getByRole('textbox', { name: '링크 URL' }) as HTMLInputElement)
        .value
    ).toBe('');
    expect(
      screen.queryByRole('heading', {
        name: '언제 다시 쓰고 싶은 자료인가요?',
      })
    ).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: '링크 URL' }), {
      target: { value: 'https://next-save.example/article' },
    });
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(
      (screen.getByRole('textbox', { name: '제목 (선택)' }) as HTMLInputElement)
        .value
    ).toBe('');
    expect(
      (
        screen.getByRole('textbox', {
          name: '한 줄 메모 (선택)',
        }) as HTMLTextAreaElement
      ).value
    ).toBe('');
    expect(
      (
        screen.getByRole('textbox', {
          name: '카테고리 (선택)',
        }) as HTMLInputElement
      ).value
    ).toBe('');
    expect(screen.queryByRole('status', { name: '맥락 저장 완료' })).toBeNull();
  });

  it('keeps personal context inputs after a write failure and retries them', async () => {
    const user = userEvent.setup();
    const save = vi
      .fn<InsightRepository['save']>()
      .mockReturnValueOnce({ ok: true })
      .mockReturnValueOnce({ ok: false, reason: 'write-failed' })
      .mockReturnValueOnce({ ok: true });
    const repository: InsightRepository = {
      load: () => ({ insights: [], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.change(screen.getByRole('textbox', { name: '링크 URL' }), {
      target: { value: 'https://context-retry.example/article' },
    });
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    const memoInput = screen.getByRole('textbox', {
      name: '한 줄 메모 (선택)',
    });
    fireEvent.change(memoInput, {
      target: { value: '발표 자료를 만들 때 참고하기' },
    });
    await user.click(screen.getByRole('button', { name: '맥락 저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '먼저 저장한 링크와 입력은 그대로 두었어요.'
    );
    expect((memoInput as HTMLTextAreaElement).value).toBe(
      '발표 자료를 만들 때 참고하기'
    );

    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(save).toHaveBeenCalledTimes(3);
    expect(
      screen.getByRole('status', { name: '맥락 저장 완료' })
    ).not.toBeNull();
  });

  it('keeps the URL in the library when failed personal context is skipped', async () => {
    const user = userEvent.setup();
    const save = vi
      .fn<InsightRepository['save']>()
      .mockReturnValueOnce({ ok: true })
      .mockReturnValueOnce({ ok: false, reason: 'write-failed' });
    const repository: InsightRepository = {
      load: () => ({ insights: [], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    fireEvent.change(screen.getByRole('textbox', { name: '링크 URL' }), {
      target: { value: 'https://failed-context.example/article' },
    });
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: '한 줄 메모 (선택)' }),
      { target: { value: '저장되지 않을 메모' } }
    );
    await user.click(screen.getByRole('button', { name: '맥락 저장하기' }));
    await user.click(screen.getByRole('button', { name: '건너뛰기' }));

    expect(screen.getAllByText('failed-context.example')).toHaveLength(2);
    expect(screen.queryByText('저장되지 않을 메모')).toBeNull();
    expect(
      screen.getByRole('link', { name: '원문 열기' }).getAttribute('href')
    ).toBe('https://failed-context.example/article');
  });

  it('keeps rendering when browser storage access is blocked', async () => {
    const user = userEvent.setup();
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'localStorage'
    );

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });

    try {
      render(
        <DesignSystemProvider>
          <AuthenticatedWorkspace />
        </DesignSystemProvider>
      );
    } finally {
      Object.defineProperty(window, 'localStorage', localStorageDescriptor!);
    }

    expect(screen.getByRole('alert').textContent).toContain(
      '브라우저 저장소를 읽지 못했어요.'
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: '링크 URL' });
    await user.type(saveUrl, 'https://blocked.example/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getAllByRole('alert').at(-1)?.textContent).toContain(
      '브라우저 저장에 실패했어요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe(
      'https://blocked.example/article'
    );
  });

  it('restores insights from the default browser storage after remounting', async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );

    expect(screen.getByText('이 브라우저에 로컬 저장됨')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.type(
      screen.getByRole('textbox', { name: '링크 URL' }),
      'https://reload.example/article#original'
    );
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    fireEvent.change(screen.getByRole('textbox', { name: '제목 (선택)' }), {
      target: { value: '새로고침 뒤에도 남는 제목' },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: '한 줄 메모 (선택)' }),
      { target: { value: '새로고침 복원 확인' } }
    );
    fireEvent.change(screen.getByRole('textbox', { name: '카테고리 (선택)' }), {
      target: { value: '복원 테스트' },
    });
    await user.click(screen.getByRole('button', { name: '맥락 저장하기' }));

    firstRender.unmount();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );
    await user.click(screen.getByRole('button', { name: '보관함' }));

    expect(
      screen.getByRole('link', { name: '원문 열기' }).getAttribute('href')
    ).toBe('https://reload.example/article#original');
    expect(screen.getByText('새로고침 뒤에도 남는 제목')).not.toBeNull();
    expect(screen.getByText('새로고침 복원 확인')).not.toBeNull();
    expect(screen.getByText('복원 테스트')).not.toBeNull();
  });

  it('restores repository insights and persists a saved URL', async () => {
    const user = userEvent.setup();
    const restoredInsight = createInsight({
      id: 'restored',
      originalUrl: 'https://restored.example/article',
      normalizedUrl: 'https://restored.example/article',
      domain: 'restored.example',
      title: '새로고침 뒤 복원된 링크',
    });
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [restoredInsight], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(screen.getByText('새로고침 뒤 복원된 링크')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.type(
      screen.getByRole('textbox', { name: '링크 URL' }),
      'https://Example.com/new-article#details'
    );
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(save).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '보관함' }));
    const newSourceLink = screen.getAllByRole('link', {
      name: '원문 열기',
    })[0];

    expect(newSourceLink?.getAttribute('href')).toBe(
      'https://Example.com/new-article#details'
    );
    expect(newSourceLink?.getAttribute('target')).toBe('_blank');
    expect(newSourceLink?.getAttribute('rel')).toBe('noreferrer');
  });

  it('distinguishes unsupported protocols from malformed URLs', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={createRepository()} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: '링크 URL' });

    await user.type(saveUrl, 'ftp://example.com/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'http 또는 https 주소만 저장할 수 있어요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe(
      'ftp://example.com/article'
    );

    await user.clear(saveUrl);
    await user.type(saveUrl, 'notaurl');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '올바른 URL을 입력해주세요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe('notaurl');
  });

  it('keeps a duplicate URL and offers to open the library', async () => {
    const user = userEvent.setup();
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({
        insights: [
          createInsight({
            originalUrl: 'https://example.com/article?utm_source=feed',
            normalizedUrl: 'https://example.com/article',
          }),
        ],
        warnings: [],
      }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: '링크 URL' });

    await user.type(saveUrl, 'https://EXAMPLE.com/article#details');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '이미 보관함에 저장된 링크예요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe(
      'https://EXAMPLE.com/article#details'
    );
    expect(save).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '보관함에서 보기' }));

    expect(
      screen.getByRole('heading', { name: '전체 인사이트' })
    ).not.toBeNull();
  });

  it('clears hidden library filters before opening a duplicate insight', async () => {
    const user = userEvent.setup();
    const duplicateInsight = createInsight({
      originalUrl: 'https://example.com/article?utm_source=feed',
      normalizedUrl: 'https://example.com/article',
      title: '다시 보여야 하는 링크',
      category: '개발',
    });
    const repository: InsightRepository = {
      load: () => ({ insights: [duplicateInsight], warnings: [] }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    await user.click(screen.getByRole('button', { name: '디자인' }));
    const librarySearch = screen.getByRole('searchbox', {
      name: '보관함 검색',
    });
    await user.type(librarySearch, '숨김 검색어');
    expect(screen.queryByText('다시 보여야 하는 링크')).toBeNull();

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.type(
      screen.getByRole('textbox', { name: '링크 URL' }),
      'https://EXAMPLE.com/article#details'
    );
    await user.click(screen.getByRole('button', { name: '저장하기' }));
    await user.click(screen.getByRole('button', { name: '보관함에서 보기' }));

    expect(screen.getByText('다시 보여야 하는 링크')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      (
        screen.getByRole('searchbox', {
          name: '보관함 검색',
        }) as HTMLInputElement
      ).value
    ).toBe('');
  });

  it('keeps the URL after a write failure and allows retrying', async () => {
    const user = userEvent.setup();
    const save = vi
      .fn<InsightRepository['save']>()
      .mockReturnValueOnce({ ok: false, reason: 'write-failed' })
      .mockReturnValueOnce({ ok: true });
    const repository: InsightRepository = {
      load: () => ({ insights: [], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: '링크 URL' });
    await user.type(saveUrl, 'https://retry.example/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '브라우저 저장에 실패했어요.'
    );
    expect(screen.getByRole('alert').textContent).toContain('다시 시도');
    expect((saveUrl as HTMLInputElement).value).toBe(
      'https://retry.example/article'
    );

    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(save).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toContain('저장 완료');
  });

  it('explains load warnings without hiding restored valid insights', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [createInsight({ title: '정상 복원된 링크' })],
        warnings: ['read-failed', 'corrupted-store', 'corrupted-entry'],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    const warningText = screen
      .getAllByRole('alert')
      .map((alert) => alert.textContent)
      .join(' ');

    expect(warningText).toContain('브라우저 저장소를 읽지 못했어요.');
    expect(warningText).toContain('저장 데이터가 손상되어 불러오지 못했어요.');
    expect(warningText).toContain(
      '일부 손상된 링크를 제외하고 나머지를 불러왔어요.'
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(screen.getByText('정상 복원된 링크')).not.toBeNull();
  });

  it('moves between the home, library, and save tabs', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('navigation', { name: '주요 화면' })
    ).not.toBeNull();
    expect(screen.getByRole('heading', { name: '홈' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '홈' }).getAttribute('aria-current')
    ).toBe('page');

    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(
      screen.getByRole('heading', { name: '전체 인사이트' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: '보관함' })
        .getAttribute('aria-current')
    ).toBe('page');

    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(
      screen.getByRole('heading', { name: 'URL만 넣고 바로 보관해요' })
    ).not.toBeNull();

    const saveUrl = screen.getByLabelText('링크 URL');

    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '올바른 URL을 입력해주세요.'
    );
    expect(saveUrl.getAttribute('aria-invalid')).toBe('true');
    expect(saveUrl.getAttribute('aria-describedby')).toBe('save-url-error');

    await user.type(saveUrl, 'notaurl');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '올바른 URL을 입력해주세요.'
    );

    await user.clear(saveUrl);
    await user.type(saveUrl, 'https://example.com/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('status').textContent).toContain('저장 완료');
  });
});

function createInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    originalUrl: 'https://example.com',
    normalizedUrl: 'https://example.com',
    domain: 'example.com',
    title: 'example.com',
    memo: null,
    category: null,
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides,
  };
}

function createRepository(): InsightRepository {
  return {
    load: () => ({ insights: [], warnings: [] }),
    save: () => ({ ok: true }),
  };
}
