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
    expect(retrieved[0]).not.toHaveProperty('connectionClue');
    expect(retrieved.map(({ insight }) => insight.id)).toEqual(
      sharedSearchIds.slice(0, 6)
    );
    expect(retrieved.every(({ score }) => score > 0)).toBe(true);
  });

  it('keeps pre-recorded targets in the Top 5 for ten representative situations', () => {
    for (const { query, targetIds } of RETRIEVAL_EVALUATION_CASES) {
      const results = retrieveInsights(RETRIEVAL_EVALUATION_INSIGHTS, query);
      const topFiveIds = results.slice(0, 5).map(({ insight }) => insight.id);

      expect(
        results,
        `${query}: expected genuine ranking competition`
      ).toHaveLength(6);

      expect(
        targetIds.some((targetId) => topFiveIds.includes(targetId)),
        `${query}: expected one of ${targetIds.join(', ')} in ${topFiveIds.join(', ')}`
      ).toBe(true);
    }
  });

  it.each(MEMO_WEIGHT_PRIORITY_CASES)(
    'ranks the personal memo target before the title distractor for "$query"',
    ({ query, targetId, titleDistractorId }) => {
      const rankedIds = retrieveInsights(
        RETRIEVAL_EVALUATION_INSIGHTS,
        query
      ).map(({ insight }) => insight.id);
      const targetIndex = rankedIds.indexOf(targetId);
      const distractorIndex = rankedIds.indexOf(titleDistractorId);

      expect(targetIndex).toBeGreaterThanOrEqual(0);
      expect(distractorIndex).toBeGreaterThanOrEqual(0);
      expect(targetIndex).toBeLessThan(distractorIndex);
    }
  );
});

const RETRIEVAL_EVALUATION_CASES = [
  { query: 'React 로그인 폼 구현', targetIds: ['react-auth-form'] },
  { query: '앱 온보딩 디자인', targetIds: ['onboarding-research'] },
  { query: '디자인 시스템 버튼', targetIds: ['wds-button'] },
  { query: '취업 포트폴리오 케이스', targetIds: ['portfolio-story'] },
  { query: '키보드 접근성 확인', targetIds: ['keyboard-a11y'] },
  { query: 'React 상태 관리', targetIds: ['react-state'] },
  { query: '로컬 저장 오류 복구', targetIds: ['storage-recovery'] },
  { query: '사용자 가설 인터뷰', targetIds: ['user-interview'] },
  { query: '모바일 반응형 레이아웃', targetIds: ['responsive-layout'] },
  { query: 'GitHub CI 테스트', targetIds: ['github-ci'] },
] as const;

const MEMO_WEIGHT_PRIORITY_CASES = [
  {
    query: 'React 로그인 폼 구현',
    targetId: 'react-auth-form',
    titleDistractorId: 'react-form-catalog',
  },
  {
    query: '디자인 시스템 버튼',
    targetId: 'wds-button',
    titleDistractorId: 'button-gallery',
  },
  {
    query: '키보드 접근성 확인',
    targetId: 'keyboard-a11y',
    titleDistractorId: 'a11y-guide',
  },
] as const;

const RETRIEVAL_EVALUATION_INSIGHTS = [
  createEvaluationInsight({
    id: 'react-auth-form',
    title: '인증 구현 노트',
    memo: 'React 로그인 폼 구현 회고',
    category: '개발',
    domain: 'devnote.example',
  }),
  createEvaluationInsight({
    id: 'onboarding-research',
    title: '첫 화면 조사 노트',
    memo: '사용자 앱 온보딩 디자인 가설 검토',
    category: '리서치',
    domain: 'product.example',
  }),
  createEvaluationInsight({
    id: 'wds-button',
    title: '컴포넌트 결정 기록',
    memo: '디자인 시스템 버튼 규칙과 키보드 접근성',
    category: '개발',
    domain: 'wds.example',
  }),
  createEvaluationInsight({
    id: 'portfolio-story',
    title: '지원 준비 기록',
    memo: '취업 포트폴리오 케이스와 사용자 반응 정리',
    category: '커리어',
    domain: 'career.example',
  }),
  createEvaluationInsight({
    id: 'keyboard-a11y',
    title: '검수 기록',
    memo: '키보드 접근성 확인 순서',
    category: '품질',
    domain: 'quality.example',
  }),
  createEvaluationInsight({
    id: 'react-state',
    title: '상태 전환 회고',
    memo: 'React 상태 관리 선택 근거',
    category: '개발',
    domain: 'frontend.example',
  }),
  createEvaluationInsight({
    id: 'storage-recovery',
    title: '브라우저 장애 기록',
    memo: '로컬 저장 오류 복구 절차',
    category: '개발',
    domain: 'browser.example',
  }),
  createEvaluationInsight({
    id: 'user-interview',
    title: '리서치 진행 메모',
    memo: '사용자 가설 인터뷰 질문',
    category: '리서치',
    domain: 'research.example',
  }),
  createEvaluationInsight({
    id: 'responsive-layout',
    title: '화면 검수 노트',
    memo: '모바일 반응형 레이아웃 기준',
    category: '디자인',
    domain: 'layout.example',
  }),
  createEvaluationInsight({
    id: 'github-ci',
    title: '배포 회고',
    memo: 'GitHub CI 테스트 오류 대응',
    category: '개발',
    domain: 'delivery.example',
  }),
  createEvaluationInsight({
    id: 'react-form-catalog',
    title: 'React 로그인 폼 구현',
    memo: '외부 라이브러리 목록',
    category: '프론트엔드',
    domain: 'ui.example',
  }),
  createEvaluationInsight({
    id: 'onboarding-patterns',
    title: '앱 온보딩 디자인',
    memo: '사용자 해외 사례 모음',
    category: '디자인',
    domain: 'patterns.example',
  }),
  createEvaluationInsight({
    id: 'button-gallery',
    title: '디자인 시스템 버튼',
    memo: '모바일 컴포넌트 갤러리',
    category: '디자인',
    domain: 'components.example',
  }),
  createEvaluationInsight({
    id: 'portfolio-examples',
    title: '취업 포트폴리오 케이스',
    memo: '공개 사례 링크',
    category: '커리어',
    domain: 'jobs.example',
  }),
  createEvaluationInsight({
    id: 'a11y-guide',
    title: '키보드 접근성 확인',
    memo: '표준 문서 링크',
    category: '접근성',
    domain: 'standards.example',
  }),
  createEvaluationInsight({
    id: 'state-libraries',
    title: 'React 상태 관리',
    memo: '라이브러리 비교',
    category: '프론트엔드',
    domain: 'libraries.example',
  }),
  createEvaluationInsight({
    id: 'storage-api',
    title: '로컬 저장 오류 복구',
    memo: 'Web API 문서',
    category: '브라우저',
    domain: 'mdn.example',
  }),
  createEvaluationInsight({
    id: 'interview-template',
    title: '사용자 가설 인터뷰',
    memo: '질문 템플릿',
    category: '리서치',
    domain: 'templates.example',
  }),
  createEvaluationInsight({
    id: 'responsive-examples',
    title: '모바일 반응형 레이아웃',
    memo: 'CSS 예제',
    category: '접근성',
    domain: 'css.example',
  }),
  createEvaluationInsight({
    id: 'ci-actions-guide',
    title: 'GitHub CI 테스트',
    memo: 'Actions 오류 문서',
    category: '개발',
    domain: 'docs.github.example',
  }),
  createEvaluationInsight({
    id: 'product-quality',
    title: '앱 프로젝트 품질 체크리스트',
    memo: '로그인 온보딩 키보드 접근성 모바일 로컬 확인',
    category: '테스트',
    domain: 'checklist.example',
  }),
  createEvaluationInsight({
    id: 'frontend-roadmap',
    title: 'React 프론트엔드 로드맵',
    memo: '폼 상태 관리 테스트와 버튼 키보드 처리',
    category: '개발',
    domain: 'roadmap.example',
  }),
  createEvaluationInsight({
    id: 'portfolio-build',
    title: '취업 포트폴리오 앱 제작',
    memo: 'GitHub CI와 반응형 레이아웃 케이스 기록',
    category: '커리어',
    domain: 'project.example',
  }),
  createEvaluationInsight({
    id: 'design-review',
    title: '디자인 리뷰 회의',
    memo: '온보딩 디자인 시스템 버튼과 모바일 접근성',
    category: '디자인',
    domain: 'review.example',
  }),
  createEvaluationInsight({
    id: 'reliability-retro',
    title: '브라우저 신뢰성 회고',
    memo: '로컬 저장 오류 React 상태 복구 테스트',
    category: '개발',
    domain: 'retro.example',
  }),
  createEvaluationInsight({
    id: 'research-plan',
    title: '사용자 조사 계획',
    memo: '앱 가설 인터뷰와 포트폴리오 케이스',
    category: '리서치',
    domain: 'planning.example',
  }),
  createEvaluationInsight({
    id: 'career-review',
    title: '취업 준비 대시보드',
    memo: '이력서와 면접 일정',
    category: '커리어',
    domain: 'careerboard.example',
  }),
  createEvaluationInsight({
    id: 'case-writing',
    title: '케이스 스터디 글쓰기',
    memo: '문제 해결 과정 구조',
    category: '포트폴리오',
    domain: 'writing.example',
  }),
];

function createEvaluationInsight({
  id,
  title,
  memo,
  category,
  domain,
}: {
  id: string;
  title: string;
  memo: string;
  category: string;
  domain: string;
}): Insight {
  const originalUrl = `https://${domain}/article`;

  return createInsight({
    id,
    title,
    memo,
    category,
    domain,
    originalUrl,
    normalizedUrl: originalUrl,
  });
}

function createInsight(overrides: Partial<Insight> = {}): Insight {
  const createdAt = overrides.createdAt ?? '2026-07-14T00:00:00.000Z';

  return {
    id: 'insight',
    originalUrl: 'https://example.com/article',
    normalizedUrl: 'https://example.com/article',
    domain: 'example.com',
    titleOrigin: 'fallback',
    title: '자료',
    memo: null,
    category: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}
