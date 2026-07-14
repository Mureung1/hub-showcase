import { describe, expect, it } from 'vitest';

import type { Insight } from './insight';
import { searchInsights } from './search_insights';
import { retrieveInsights } from './retrieve_insights';

describe('retrieveInsights', () => {
  it('keeps the shared search order, excludes nonmatches, and returns at most six items', () => {
    const insights = [
      ...Array.from({ length: 8 }, (_, index) =>
        createInsight({
          id: `match-${index}`,
          title: `signal ${index}`,
          createdAt: `2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        })
      ),
      createInsight({ id: 'nonmatch', title: 'unrelated' }),
    ];

    const sharedSearchIds = searchInsights(insights, 'signal').map(
      ({ insight }) => insight.id
    );
    const retrieved = retrieveInsights(insights, 'signal');

    expect(retrieved).toHaveLength(6);
    expect(retrieved.map(({ insight }) => insight.id)).toEqual(
      sharedSearchIds.slice(0, 6)
    );
    expect(retrieved.every(({ score }) => score > 0)).toBe(true);
  });

  it('describes a memo connection using a token that actually matched the memo', () => {
    const [result] = retrieveInsights(
      [createInsight({ memo: '온보딩 흐름을 다시 설계할 때 참고' })],
      '온보딩'
    );

    expect(result?.connectionClue).toBe('메모의 “온보딩” 단서가 겹쳐요.');
  });

  it('falls back to a title connection when no memo token matched', () => {
    const [result] = retrieveInsights(
      [createInsight({ title: 'React 폼 검증', memo: '다른 맥락' })],
      'react'
    );

    expect(result?.connectionClue).toBe('제목에서 “react” 단서를 찾았어요.');
  });

  it('uses the matched category value when memo and title did not match', () => {
    const [result] = retrieveInsights(
      [createInsight({ category: '디자인 시스템' })],
      '디자인'
    );

    expect(result?.connectionClue).toBe(
      '“디자인 시스템” 카테고리에 저장했어요.'
    );
  });

  it('uses the matched domain when only the source fields matched', () => {
    const [result] = retrieveInsights(
      [createInsight({ domain: 'react.dev' })],
      'react'
    );

    expect(result?.connectionClue).toBe('react.dev에서 저장한 자료예요.');
  });

  it('uses a restrained URL clue instead of inventing another matched field', () => {
    const [result] = retrieveInsights(
      [
        createInsight({
          originalUrl: 'https://example.com/private-path-marker',
        }),
      ],
      'private path'
    );

    expect(result?.matchedFields).toEqual(['originalUrl']);
    expect(result?.connectionClue).toBe('URL의 “private” 단서를 찾았어요.');
  });

  it('prioritizes personal context and avoids recommendation or classification claims', () => {
    const [result] = retrieveInsights(
      [
        createInsight({
          memo: 'signal 메모',
          title: 'signal 제목',
          category: 'signal 카테고리',
          domain: 'signal.example',
          originalUrl: 'https://signal.example/signal',
        }),
      ],
      'signal'
    );

    expect(result?.connectionClue).toBe('메모의 “signal” 단서가 겹쳐요.');
    expect(result?.connectionClue).not.toMatch(
      /AI|완벽|최적|자동 분류|기획 참고|디자인 참고|구현 참고/
    );
  });

  it('keeps pre-recorded targets in the Top 5 for ten representative situations', () => {
    const fixture = [
      createInsight({
        id: 'react-form',
        title: 'React 폼 검증',
        memo: '로그인 구현',
      }),
      createInsight({
        id: 'onboarding',
        title: '온보딩 UX',
        memo: '앱 첫 화면 디자인',
      }),
      createInsight({
        id: 'wds',
        title: 'WDS 버튼',
        memo: '디자인 시스템 컴포넌트',
      }),
      createInsight({
        id: 'portfolio',
        title: '포트폴리오 사례',
        memo: '취업 케이스 스터디',
      }),
      createInsight({
        id: 'a11y',
        title: '접근성 체크리스트',
        memo: '키보드 탐색',
      }),
      createInsight({
        id: 'state',
        title: 'Zustand 상태 관리',
        memo: 'React 전역 state',
      }),
      createInsight({
        id: 'localstorage',
        title: '로컬 저장 복구',
        memo: 'localStorage 오류 처리',
      }),
      createInsight({
        id: 'research',
        title: '사용자 인터뷰',
        memo: '가설 검증 질문',
      }),
      createInsight({
        id: 'responsive',
        title: '반응형 그리드',
        memo: '모바일 레이아웃',
      }),
      createInsight({
        id: 'ci',
        title: 'GitHub Actions',
        memo: 'CI 테스트 자동화',
      }),
      ...Array.from({ length: 10 }, (_, index) =>
        createInsight({
          id: `filler-${index}`,
          title: `일반 참고 자료 ${index}`,
          memo: `나중에 읽을 문서 ${index}`,
          originalUrl: `https://example.com/filler-${index}`,
        })
      ),
    ];
    const evaluationCases = [
      { query: 'React 로그인 폼 구현', targetIds: ['react-form'] },
      { query: '앱 온보딩 디자인', targetIds: ['onboarding'] },
      { query: '디자인 시스템 버튼', targetIds: ['wds'] },
      { query: '취업 포트폴리오 케이스', targetIds: ['portfolio'] },
      { query: '키보드 접근성 확인', targetIds: ['a11y'] },
      { query: 'React 상태 관리', targetIds: ['state'] },
      { query: '로컬 저장 오류 복구', targetIds: ['localstorage'] },
      { query: '사용자 가설 인터뷰', targetIds: ['research'] },
      { query: '모바일 반응형 레이아웃', targetIds: ['responsive'] },
      { query: 'GitHub CI 테스트', targetIds: ['ci'] },
    ] as const;

    for (const { query, targetIds } of evaluationCases) {
      const topFiveIds = retrieveInsights(fixture, query)
        .slice(0, 5)
        .map(({ insight }) => insight.id);

      expect(
        targetIds.some((targetId) => topFiveIds.includes(targetId)),
        `${query}: expected one of ${targetIds.join(', ')} in ${topFiveIds.join(', ')}`
      ).toBe(true);
    }
  });
});

function createInsight(overrides: Partial<Insight> = {}): Insight {
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
