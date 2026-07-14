import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Insight } from './insight';
import {
  INSIGHT_SEARCH_FIELD_WEIGHTS,
  INSIGHT_SEARCH_MATCH_MULTIPLIERS,
  searchInsights,
} from './search_insights';

const goldenInsights: Insight[] = [
  createInsight({
    id: 'A',
    title: 'React 폼 검증',
    memo: '팀 프로젝트 로그인 구현',
    category: '개발',
    domain: 'react.dev',
    originalUrl: 'https://react.dev/learn/forms',
    createdAt: '2026-07-10T09:00:00Z',
  }),
  createInsight({
    id: 'B',
    title: '로그인 UX 체크리스트',
    memo: '앱 온보딩 디자인 참고',
    category: '디자인',
    domain: 'medium.com',
    originalUrl: 'https://medium.com/login-ux',
    createdAt: '2026-07-11T09:00:00Z',
  }),
  createInsight({
    id: 'C',
    title: '여행 준비',
    memo: '제주 숙소',
    category: '여행',
    domain: 'blog.naver.com',
    originalUrl: 'https://blog.naver.com/travel/jeju',
    createdAt: '2026-07-09T09:00:00Z',
  }),
  createInsight({
    id: 'D',
    title: 'WDS 버튼',
    memo: '팀 프로젝트 디자인 시스템',
    category: '개발',
    domain: 'wanted.co.kr',
    originalUrl: 'https://wanted.co.kr/wds/button',
    createdAt: '2026-07-12T09:00:00Z',
  }),
];

describe('searchInsights', () => {
  it.each([
    ['팀 프로젝트 로그인', ['A', 'D', 'B']],
    ['온보딩 디자인', ['B', 'D']],
    ['react', ['A']],
    ['개발', ['D', 'A']],
  ])('ranks the golden fixture for "%s"', (query, expectedIds) => {
    expect(
      searchInsights(goldenInsights, query).map(({ insight }) => insight.id)
    ).toEqual(expectedIds);
  });

  it('normalizes Unicode, case, and whitespace and counts duplicate query tokens once', () => {
    const [result] = searchInsights(
      [createInsight({ id: 'react', title: 'React' })],
      '  REACT react ｒｅａｃｔ  '
    );

    expect(result).toEqual(
      expect.objectContaining({
        score: 9,
        matchedFields: ['title'],
        matchedTokens: ['react'],
      })
    );
  });

  it('uses the highest exact, prefix, or substring multiplier once per field', () => {
    const results = searchInsights(
      [
        createInsight({ id: 'substring', title: 'Preact patterns' }),
        createInsight({ id: 'prefix', title: 'Reactive patterns' }),
        createInsight({ id: 'exact', title: 'React React patterns' }),
      ],
      'react'
    );

    expect(
      results.map(({ insight, score }) => ({ id: insight.id, score }))
    ).toEqual([
      {
        id: 'exact',
        score:
          INSIGHT_SEARCH_FIELD_WEIGHTS.title *
          INSIGHT_SEARCH_MATCH_MULTIPLIERS.exact,
      },
      {
        id: 'prefix',
        score:
          INSIGHT_SEARCH_FIELD_WEIGHTS.title *
          INSIGHT_SEARCH_MATCH_MULTIPLIERS.prefix,
      },
      {
        id: 'substring',
        score:
          INSIGHT_SEARCH_FIELD_WEIGHTS.title *
          INSIGHT_SEARCH_MATCH_MULTIPLIERS.substring,
      },
    ]);
  });

  it('publishes readonly exact, prefix, and substring multiplier values', () => {
    expect(INSIGHT_SEARCH_MATCH_MULTIPLIERS).toEqual({
      exact: 3,
      prefix: 2,
      substring: 1,
    });
    expectTypeOf(INSIGHT_SEARCH_MATCH_MULTIPLIERS).toEqualTypeOf<
      Readonly<{ exact: 3; prefix: 2; substring: 1 }>
    >();
  });

  it('applies every public field weight and exposes duplicate-free matches', () => {
    const [result] = searchInsights(
      [
        createInsight({
          memo: 'signal',
          title: 'signal',
          category: 'signal',
          domain: 'signal',
          originalUrl: 'https://signal.example/signal',
        }),
      ],
      'signal'
    );

    expect(INSIGHT_SEARCH_FIELD_WEIGHTS).toEqual({
      memo: 4,
      title: 3,
      category: 2,
      domain: 1,
      originalUrl: 0.5,
    });
    expect(result).toEqual(
      expect.objectContaining({
        score: 31.5,
        matchedFields: ['memo', 'title', 'category', 'domain', 'originalUrl'],
        matchedTokens: ['signal'],
      })
    );
  });

  it('keeps matched tokens in query order when they match different fields', () => {
    const [result] = searchInsights(
      [createInsight({ memo: 'beta', title: 'alpha' })],
      'alpha beta alpha'
    );

    expect(result?.matchedTokens).toEqual(['alpha', 'beta']);
    expect(result?.matchedFields).toEqual(['memo', 'title']);
  });

  it('breaks score ties by newest created time and then ascending id', () => {
    const results = searchInsights(
      [
        createInsight({ id: 'B', title: 'match', createdAt: '2026-07-14Z' }),
        createInsight({ id: 'old', title: 'match', createdAt: '2026-07-13Z' }),
        createInsight({ id: 'A', title: 'match', createdAt: '2026-07-14Z' }),
      ],
      'match'
    );

    expect(results.map(({ insight }) => insight.id)).toEqual(['A', 'B', 'old']);
  });

  it('sorts created times by their instant across offsets before using the id tie-breaker', () => {
    const results = searchInsights(
      [
        createInsight({
          id: 'lexically-later-but-older',
          title: 'match',
          createdAt: '2026-07-14T00:30:00+09:00',
        }),
        createInsight({
          id: 'newer-instant',
          title: 'match',
          createdAt: '2026-07-13T23:45:00Z',
        }),
        createInsight({
          id: 'B-same-instant',
          title: 'match',
          createdAt: '2026-07-14T09:00:00+09:00',
        }),
        createInsight({
          id: 'A-same-instant',
          title: 'match',
          createdAt: '2026-07-14T00:00:00Z',
        }),
      ],
      'match'
    );

    expect(results.map(({ insight }) => insight.id)).toEqual([
      'A-same-instant',
      'B-same-instant',
      'newer-instant',
      'lexically-later-but-older',
    ]);
  });

  it('orders invalid created times deterministically after valid times without mutating input', () => {
    const insights = [
      createInsight({
        id: 'valid-newest',
        title: 'match',
        createdAt: '2026-07-14T00:00:00Z',
      }),
      createInsight({
        id: 'invalid-b',
        title: 'match',
        createdAt: 'not-a-date-b',
      }),
      createInsight({
        id: 'valid-oldest',
        title: 'match',
        createdAt: '2026-07-13T00:00:00Z',
      }),
      createInsight({
        id: 'invalid-a',
        title: 'match',
        createdAt: 'not-a-date-a',
      }),
    ];
    const originalOrder = insights.map(({ id }) => id);

    for (const permutation of getPermutations(insights)) {
      expect(
        searchInsights(permutation, 'match').map(({ insight }) => insight.id)
      ).toEqual(['valid-newest', 'valid-oldest', 'invalid-a', 'invalid-b']);
    }

    expect(insights.map(({ id }) => id)).toEqual(originalOrder);
  });

  it('returns every positive ranked result without a six-item core cap', () => {
    const insights = Array.from({ length: 8 }, (_, index) =>
      createInsight({ id: String(index), title: `match ${index}` })
    );

    expect(searchInsights(insights, 'match')).toHaveLength(8);
    expect(searchInsights(insights, 'missing')).toEqual([]);
    expect(searchInsights(insights, '   ')).toEqual([]);
  });
});

function createInsight(overrides: Partial<Insight>): Insight {
  const createdAt = overrides.createdAt ?? '2026-07-14T00:00:00.000Z';

  return {
    id: 'insight',
    originalUrl: 'https://example.com/article',
    normalizedUrl: 'https://example.com/article',
    domain: 'example.com',
    title: '자료',
    memo: null,
    category: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function getPermutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) {
    return [[]];
  }

  return values.flatMap((value, index) => {
    const remaining = values.filter((_, valueIndex) => valueIndex !== index);

    return getPermutations(remaining).map((permutation) => [
      value,
      ...permutation,
    ]);
  });
}
