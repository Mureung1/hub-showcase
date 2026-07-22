/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Insight, RetrievedInsight } from '@/entities/insight';
import { DesignSystemProvider } from '@/shared/ui';

import {
  HomePage,
  type HomePageProps,
  type SuggestedSituation,
} from './home_page';

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

const situations: SuggestedSituation[] = [
  { label: '개발 공부', query: '리액트 상태 관리' },
];

const defaultProps: HomePageProps = {
  insightCount: 1,
  libraryState: 'ready',
  onOpenLibrary: vi.fn(),
  onOpenSave: vi.fn(),
  onClearQuery: vi.fn(),
  onQueryChange: vi.fn(),
  onRetrieve: vi.fn(),
  onRetryLoad: vi.fn(),
  onSituationClick: vi.fn(),
  query: '',
  results: [],
  selectedSituation: '',
  situations,
  submittedQuery: '',
};

function renderHomePage(props: Partial<HomePageProps> = {}) {
  render(
    <DesignSystemProvider>
      <HomePage {...defaultProps} {...props} />
    </DesignSystemProvider>
  );
}

describe('HomePage', () => {
  it('shows loading before treating the remote library as empty', () => {
    renderHomePage({ insightCount: 0, libraryState: 'loading' });

    expect(
      screen.getByRole('status', {
        name: '꺼내볼 인사이트를 불러오는 중',
      })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: '아직 저장한 인사이트가 없어요',
      })
    ).toBeNull();
  });

  it('opens save from an empty remote library', async () => {
    const user = userEvent.setup();
    const onOpenSave = vi.fn();

    renderHomePage({
      insightCount: 0,
      libraryState: 'ready',
      onOpenSave,
    });

    expect(
      screen.getByRole('heading', {
        name: '아직 저장한 인사이트가 없어요',
      })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '링크 저장' }));

    expect(onOpenSave).toHaveBeenCalledOnce();
  });

  it('offers retry when the remote library is unavailable', async () => {
    const user = userEvent.setup();
    const onRetryLoad = vi.fn();

    renderHomePage({
      insightCount: 0,
      libraryState: 'unavailable',
      onRetryLoad,
      query: '온보딩',
      submittedQuery: '온보딩',
    });

    expect(
      screen.getByRole('heading', {
        name: '보관함을 불러오지 못해 꺼내볼 수 없어요',
      })
    ).not.toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: '“온보딩”과 연결된 인사이트가 없어요',
      })
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));

    expect(onRetryLoad).toHaveBeenCalledOnce();
  });

  it('keeps survey situations and helper without legacy fallback before submission', () => {
    renderHomePage({
      situations: [
        { label: '과제 참고자료 다시 찾기', query: '과제 참고자료 다시 찾기' },
        {
          label: '프로젝트에 쓸 자료 꺼내기',
          query: '프로젝트에 쓸 자료 꺼내기',
        },
        {
          label: '공모전 아이디어 발전시키기',
          query: '공모전 아이디어 발전시키기',
        },
        {
          label: '여행·취미 계획 다시 이어가기',
          query: '여행 취미 계획 다시 이어가기',
        },
        {
          label: '디자인·개발 레퍼런스 찾기',
          query: '디자인 개발 레퍼런스 찾기',
        },
        { label: '저장해둔 영상 골라보기', query: '저장한 영상 골라보기' },
      ],
    });

    expect(
      screen.queryByText(
        '아맞다는 저장해둔 링크와 메모를 현재 상황에 맞춰 다시 찾게 해주는 개인 인사이트 저장소입니다.'
      )
    ).toBeNull();
    expect(
      screen.queryByRole('heading', { name: '이런 상황에서 시작해보세요' })
    ).toBeNull();
    expect(
      screen.getByText('떠오르는 단어나 지금 하고 있는 일을 짧게 적어보세요.')
    ).not.toBeNull();
    expect(screen.queryByText('작업팩')).toBeNull();
    expect(
      screen.getByRole('button', { name: '과제 참고자료 다시 찾기' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '프로젝트에 쓸 자료 꺼내기' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '공모전 아이디어 발전시키기' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '여행·취미 계획 다시 이어가기' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '디자인·개발 레퍼런스 찾기' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '저장해둔 영상 골라보기' })
    ).not.toBeNull();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('connects the clear control only while a draft query exists', async () => {
    const user = userEvent.setup();
    const onClearQuery = vi.fn();

    renderHomePage({ onClearQuery, query: '과제 참고자료 다시 찾기' });

    await user.click(screen.getByRole('button', { name: '입력 지우기' }));

    expect(onClearQuery).toHaveBeenCalledOnce();
  });

  it('reports situation selection and retrieve submission', async () => {
    const user = userEvent.setup();
    const onRetrieve = vi.fn();
    const onSituationClick = vi.fn();

    render(
      <DesignSystemProvider>
        <HomePage
          insightCount={1}
          libraryState="ready"
          onOpenLibrary={vi.fn()}
          onOpenSave={vi.fn()}
          onClearQuery={vi.fn()}
          onQueryChange={vi.fn()}
          onRetrieve={onRetrieve}
          onRetryLoad={vi.fn()}
          onSituationClick={onSituationClick}
          query="리액트"
          results={[]}
          selectedSituation=""
          situations={situations}
          submittedQuery="리액트"
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '개발 공부' }));
    fireEvent.submit(
      screen.getByRole('button', { name: '꺼내보기' }).closest('form')!
    );

    expect(onSituationClick).toHaveBeenCalledWith(situations[0]);
    expect(onRetrieve).toHaveBeenCalledOnce();
  });

  it('renders submitted results with the exact query and safe source link', () => {
    const result: RetrievedInsight = {
      insight: createInsight({
        memo: '온보딩 흐름 참고',
        originalUrl: 'https://example.com/onboarding',
        normalizedUrl: 'https://example.com/onboarding',
      }),
      score: 12,
      matchedFields: ['memo'],
      matchedTokens: ['온보딩'],
    };

    render(
      <DesignSystemProvider>
        <HomePage
          insightCount={1}
          libraryState="ready"
          onOpenLibrary={vi.fn()}
          onOpenSave={vi.fn()}
          onClearQuery={vi.fn()}
          onQueryChange={vi.fn()}
          onRetrieve={vi.fn()}
          onRetryLoad={vi.fn()}
          onSituationClick={vi.fn()}
          query="수정 중인 다른 초안"
          results={[result]}
          selectedSituation=""
          situations={situations}
          submittedQuery="온보딩 작업"
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('status').textContent).toContain('온보딩 작업');
    expect(screen.getByRole('status').textContent).toContain('1개');
    expect(screen.getByRole('status').textContent).toContain('결과');
    expect(screen.queryByText('작업팩')).toBeNull();
    expect(screen.queryByText(/단서가 겹쳐요/)).toBeNull();
    const sourceLink = screen.getByRole('link', { name: '원문 열기' });
    expect(sourceLink.getAttribute('href')).toBe(
      'https://example.com/onboarding'
    );
    expect(sourceLink.getAttribute('target')).toBe('_blank');
    expect(sourceLink.getAttribute('rel')).toContain('noreferrer');
  });

  it('retains the no-result query and offers other situations plus the library', async () => {
    const user = userEvent.setup();
    const onOpenLibrary = vi.fn();

    render(
      <DesignSystemProvider>
        <HomePage
          insightCount={1}
          libraryState="ready"
          onOpenLibrary={onOpenLibrary}
          onOpenSave={vi.fn()}
          onClearQuery={vi.fn()}
          onQueryChange={vi.fn()}
          onRetrieve={vi.fn()}
          onRetryLoad={vi.fn()}
          onSituationClick={vi.fn()}
          query="없는 상황"
          results={[]}
          selectedSituation=""
          situations={situations}
          submittedQuery="없는 상황"
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', {
        name: '“없는 상황” 결과가 없어요',
      })
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: '개발 공부' })).not.toBeNull();
    expect(
      (
        screen.getByRole('textbox', {
          name: '지금 꺼내보고 싶은 상황',
        }) as HTMLInputElement
      ).value
    ).toBe('없는 상황');

    await user.click(screen.getByRole('button', { name: '보관함 보기' }));

    expect(onOpenLibrary).toHaveBeenCalledOnce();
  });

  it('gives long unbroken result queries a wrapping mobile layout contract', () => {
    const longQuery = 'React상태관리와온보딩디자인시스템'.repeat(8);

    render(
      <DesignSystemProvider>
        <HomePage
          insightCount={1}
          libraryState="ready"
          onOpenLibrary={vi.fn()}
          onOpenSave={vi.fn()}
          onClearQuery={vi.fn()}
          onQueryChange={vi.fn()}
          onRetrieve={vi.fn()}
          onRetryLoad={vi.fn()}
          onSituationClick={vi.fn()}
          query={longQuery}
          results={[]}
          selectedSituation=""
          situations={situations}
          submittedQuery={longQuery}
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('status').classList).toContain(
      'home-page__results-status'
    );
    expect(
      screen
        .getByRole('heading', {
          name: `“${longQuery}” 결과가 없어요`,
        })
        .closest('.home-page__no-results')
    ).not.toBeNull();

    const styles = readFileSync(
      join(process.cwd(), 'src/pages/home/ui/home_page.css'),
      'utf8'
    );
    const statusRule = getCssRule(styles, '.home-page__results-status');
    const noResultTextRule = getCssRule(
      styles,
      '.home-page__no-results :is(.empty-state__title, .empty-state__description)'
    );
    const mobileStyles = styles.slice(
      styles.indexOf('@media (max-width: 767px)')
    );
    const mobileHeadingRule = getCssRule(
      mobileStyles,
      '.home-page__results-heading'
    );

    expect(statusRule).toContain('min-width: 0;');
    expect(statusRule).toContain('white-space: normal;');
    expect(statusRule).toContain('overflow-wrap: anywhere;');
    expect(noResultTextRule).toContain('min-width: 0;');
    expect(noResultTextRule).toContain('overflow-wrap: anywhere;');
    expect(mobileHeadingRule).toContain('flex-direction: column;');
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

function createInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    originalUrl: 'https://example.com/article',
    normalizedUrl: 'https://example.com/article',
    domain: 'example.com',
    titleOrigin: 'fallback',
    title: '자료',
    memo: null,
    category: null,
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides,
  };
}
