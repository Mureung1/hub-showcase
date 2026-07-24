import { describe, expect, it } from 'vitest';

import type { Insight } from '../../../src/entities/insight/model/insight';
import { searchInsights } from '../../../src/entities/insight/model/search_insights';
import {
  cosineSimilarity,
  fuseRankings,
  rankByCosine,
  rankLexically,
} from '../ranking';
import type { EvaluationInsight } from '../contracts';

const DEVELOPMENT_CATEGORY_ID = '10000000-0000-4000-8000-000000000001';
const DESIGN_CATEGORY_ID = '10000000-0000-4000-8000-000000000002';
const CATEGORY_NAMES = new Map([
  [DEVELOPMENT_CATEGORY_ID, '개발'],
  [DESIGN_CATEGORY_ID, '디자인'],
]);

const productInsights: Insight[] = [
  createProductInsight({
    id: 'A',
    title: 'React 폼 검증',
    memo: '팀 프로젝트 로그인 구현',
    categoryId: DEVELOPMENT_CATEGORY_ID,
    domain: 'react.dev',
    originalUrl: 'https://react.dev/learn/forms',
    createdAt: '2026-07-10T09:00:00Z',
  }),
  createProductInsight({
    id: 'B',
    title: '로그인 UX 체크리스트',
    memo: '앱 온보딩 디자인 참고',
    categoryId: DESIGN_CATEGORY_ID,
    domain: 'medium.com',
    originalUrl: 'https://medium.com/login-ux',
    createdAt: '2026-07-11T09:00:00Z',
  }),
  createProductInsight({
    id: 'D',
    title: 'WDS 버튼',
    memo: '팀 프로젝트 디자인 시스템',
    categoryId: DEVELOPMENT_CATEGORY_ID,
    domain: 'wanted.co.kr',
    originalUrl: 'https://wanted.co.kr/wds/button',
    createdAt: '2026-07-12T09:00:00Z',
  }),
];

describe('실험 랭킹', () => {
  it('lexical adapter가 현행 searchInsights의 순서와 점수를 보존한다', () => {
    const query = '팀 프로젝트 로그인';
    const expected = searchInsights(productInsights, query).map(
      ({ insight, score }) => ({
        insightId: insight.id,
        score,
      })
    );

    expect(rankLexically(toEvaluationInsights(productInsights), query)).toEqual(
      expected
    );
  });

  it('꺼내보기 lexical adapter는 카테고리 이름만 일치하는 결과를 제외한다', () => {
    const categoryOnlyInsight = createProductInsight({
      categoryId: DEVELOPMENT_CATEGORY_ID,
      title: '분류된 자료',
    });

    expect(
      rankLexically(toEvaluationInsights([categoryOnlyInsight]), '개발')
    ).toEqual([]);
  });

  it('코사인 유사도를 계산하고 잘못된 벡터를 명시적으로 거부한다', () => {
    expect(cosineSimilarity([1, 0], [0.6, 0.8])).toBeCloseTo(0.6, 12);
    expect(() => cosineSimilarity([0, 0], [1, 0])).toThrow(/영벡터/u);
    expect(() => cosineSimilarity([1, Number.NaN], [1, 0])).toThrow(
      /유한한 숫자/u
    );
    expect(() => cosineSimilarity([1, 0], [1])).toThrow(/차원/u);
  });

  it('코사인 점수 동률을 insight ID 오름차순으로 결정한다', () => {
    const candidates = [
      { insightId: 'B', vector: [1, 0] },
      { insightId: 'C', vector: [0, 1] },
      { insightId: 'A', vector: [1, 0] },
    ];

    expect(
      rankByCosine([1, 0], candidates).map(({ insightId, score }) => ({
        insightId,
        score,
      }))
    ).toEqual([
      { insightId: 'A', score: 1 },
      { insightId: 'B', score: 1 },
      { insightId: 'C', score: 0 },
    ]);
    expect(candidates.map(({ insightId }) => insightId)).toEqual([
      'B',
      'C',
      'A',
    ]);
  });

  it('같은 cached 순위에서 RRF k=10과 k=60의 민감도를 비교한다', () => {
    const lexical = [
      'A',
      ...Array.from({ length: 18 }, (_, index) => `lexical-${index + 1}`),
      'B',
    ];
    const semantic = [
      ...Array.from({ length: 19 }, (_, index) => `semantic-${index + 1}`),
      'B',
    ];
    const k10 = fuseRankings({ lexical, semantic }, 10);
    const k60 = fuseRankings({ lexical, semantic }, 60);

    expect(relativeOrder(k10, ['A', 'B'])).toEqual(['A', 'B']);
    expect(relativeOrder(k60, ['A', 'B'])).toEqual(['B', 'A']);
    expect(findScore(k10, 'A')).toBeCloseTo(1 / 11, 12);
    expect(findScore(k10, 'B')).toBeCloseTo(2 / 30, 12);
    expect(findScore(k60, 'A')).toBeCloseTo(1 / 61, 12);
    expect(findScore(k60, 'B')).toBeCloseTo(2 / 80, 12);
  });

  it('RRF 점수 동률을 insight ID 오름차순으로 결정한다', () => {
    expect(
      fuseRankings(
        {
          lexical: ['B', 'A'],
          semantic: ['A', 'B'],
        },
        60
      ).map(({ insightId }) => insightId)
    ).toEqual(['A', 'B']);
  });
});

function createProductInsight(overrides: Partial<Insight>): Insight {
  const createdAt = overrides.createdAt ?? '2026-07-14T00:00:00.000Z';

  return {
    id: 'insight',
    originalUrl: 'https://example.com/article',
    normalizedUrl: 'https://example.com/article',
    domain: 'example.com',
    titleOrigin: 'fallback',
    title: '자료',
    memo: null,
    categoryId: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function toEvaluationInsights(
  insights: readonly Insight[]
): EvaluationInsight[] {
  return insights.map(
    ({ id, title, memo, categoryId, domain, originalUrl, createdAt }) => ({
      id,
      title,
      memo,
      category: categoryId ? (CATEGORY_NAMES.get(categoryId) ?? null) : null,
      domain,
      originalUrl,
      createdAt,
    })
  );
}

function relativeOrder(
  ranking: readonly { insightId: string }[],
  insightIds: readonly string[]
) {
  const includedIds = new Set(insightIds);

  return ranking
    .map(({ insightId }) => insightId)
    .filter((insightId) => includedIds.has(insightId));
}

function findScore(
  ranking: readonly { insightId: string; score: number }[],
  insightId: string
) {
  const result = ranking.find((item) => item.insightId === insightId);

  if (!result) {
    throw new Error(`${insightId}의 RRF 점수를 찾지 못했습니다.`);
  }

  return result.score;
}
