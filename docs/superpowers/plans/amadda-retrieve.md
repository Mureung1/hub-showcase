# 아맞다 꺼내보기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 현재 상황이나 필요한 용도를 입력하면, 저장된 인사이트를 유사도 기반으로 다시 찾아 작업팩 형태로 보여준다.

**Product Definition:** 상세 제품 기준은 `docs/retrieve.md`를 따른다. `꺼내보기`는 보관함 검색 결과 화면이 아니라 상황 기반 유사도 검색과 작업팩 UX다.

**Architecture:** 보관함 검색과 같은 인사이트 view model은 재사용하되, 랭킹과 표시 모델은 `src/retrieve`에 분리한다. 검색 문서는 `title`, `memo`, `categoryNames`, `domain`, `originalUrl`, `description` 필드를 포함한다. MVP에서는 `MiniSearch` 기반 field boosting을 우선 적용한다.

**Tech Stack:** React 19, TypeScript, MiniSearch, Supabase, Vitest, React Testing Library

---

## 범위

포함 범위:

- 홈 화면의 `꺼내보기` 입력 영역
- 추천 상황 버튼
- 자유 입력
- 추천 상황 버튼을 query로 변환
- MiniSearch 기반 유사도 검색
- field weight 기반 랭킹
- 최대 6개 결과 제한
- 작업팩 view model 생성
- 연결 단서 생성
- 결과 없음 상태
- 원문 새 탭 열기

제외 범위:

- 보관함 검색 결과 화면과 같은 단순 카드 목록
- `기획 참고`, `디자인 참고`, `구현 참고` 같은 고정 분류 라벨 노출
- AI/LLM 추천
- embedding 기반 의미 검색
- 추천 결과별 피드백
- 이메일/푸시 리마인드

## 파일 구조

- Modify: `package.json`
  - `minisearch`를 추가한다.
- Create: `src/retrieve/retrieveSituations.ts`
  - 추천 상황 버튼과 query 변환 규칙을 정의한다.
- Create: `src/retrieve/retrieveSearchDocument.ts`
  - 인사이트를 검색 문서로 변환한다.
- Create: `src/retrieve/retrieveInsights.ts`
  - MiniSearch 기반 유사도 검색과 결과 제한을 담당한다.
- Create: `src/retrieve/retrievePack.ts`
  - 작업팩 view model과 연결 단서를 만든다.
- Create: `src/retrieve/retrieveInsights.test.ts`
  - query 변환, 랭킹, 결과 제한, 연결 단서를 검증한다.
- Modify: `src/pages/HomePage.tsx`
  - 실제 꺼내보기 화면으로 연결한다.

---

### Task 1: 꺼내보기 도메인 함수 작성

**Files:**

- Modify: `package.json`
- Create: `src/retrieve/retrieveSituations.ts`
- Create: `src/retrieve/retrieveSearchDocument.ts`
- Create: `src/retrieve/retrieveInsights.ts`
- Create: `src/retrieve/retrievePack.ts`
- Create: `src/retrieve/retrieveInsights.test.ts`

- [ ] **Step 1: MiniSearch 설치**

Run:

```bash
npm install minisearch
```

- [ ] **Step 2: 실패하는 테스트 작성**

Create `src/retrieve/retrieveInsights.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { InsightView } from '@/insights/insightView';
import { createRetrievePack } from './retrievePack';
import { retrieveInsights } from './retrieveInsights';
import { getSituationQuery, RETRIEVE_SITUATIONS } from './retrieveSituations';

const insights: InsightView[] = [
  {
    categories: [{ id: 'design', name: '디자인' }],
    createdAt: '2026-07-01T00:00:00Z',
    description: '가입 전 첫 화면과 CTA 설계 사례',
    domain: 'example.com',
    id: '1',
    memo: '팀 프로젝트 앱 온보딩 참고',
    originalUrl: 'https://example.com/onboarding',
    thumbnailUrl: null,
    title: '모바일 온보딩 UX 패턴',
  },
  {
    categories: [{ id: 'dev', name: '개발' }],
    createdAt: '2026-07-02T00:00:00Z',
    description: null,
    domain: 'react.dev',
    id: '2',
    memo: '폼 상태 관리 참고',
    originalUrl: 'https://react.dev/learn',
    thumbnailUrl: null,
    title: 'React 공식 문서',
  },
];

describe('retrieve', () => {
  it('maps situation button to query', () => {
    expect(RETRIEVE_SITUATIONS.map((situation) => situation.label)).toContain(
      '팀 프로젝트'
    );
    expect(getSituationQuery('team-project')).toContain('팀 프로젝트');
  });

  it('ranks insights by current situation similarity', () => {
    const results = retrieveInsights(insights, '팀 프로젝트 온보딩 화면');

    expect(results[0].insight.id).toBe('1');
  });

  it('limits retrieve results to 6 items', () => {
    const manyInsights = Array.from({ length: 8 }, (_, index) => ({
      ...insights[0],
      id: String(index + 1),
      title: `온보딩 참고 ${index + 1}`,
    }));

    expect(retrieveInsights(manyInsights, '온보딩').length).toBe(6);
  });

  it('creates a work pack with connection cues', () => {
    const pack = createRetrievePack(
      retrieveInsights(insights, '팀 프로젝트 온보딩 화면')
    );

    expect(pack.sections[0].title).toBe('이 상황과 가장 가까운 자료');
    expect(pack.sections[0].items[0].connectionCue).toContain('온보딩');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run:

```bash
npm test -- src/retrieve/retrieveInsights.test.ts
```

Expected:

```text
FAIL src/retrieve/retrieveInsights.test.ts
Cannot find module './retrievePack'
```

- [ ] **Step 4: 추천 상황 작성**

Create `src/retrieve/retrieveSituations.ts`:

```ts
export type RetrieveSituationId =
  | 'study'
  | 'team-project'
  | 'development'
  | 'design'
  | 'portfolio'
  | 'light-reading';

export type RetrieveSituation = {
  id: RetrieveSituationId;
  label: string;
  query: string;
};

export const RETRIEVE_SITUATIONS: RetrieveSituation[] = [
  { id: 'study', label: '공부', query: '공부 개념 정리 시험 과제' },
  {
    id: 'team-project',
    label: '팀 프로젝트',
    query: '팀 프로젝트 기획 디자인 개발',
  },
  { id: 'development', label: '개발', query: '개발 코드 구현 프론트엔드' },
  { id: 'design', label: '디자인', query: '디자인 UI UX 레퍼런스' },
  { id: 'portfolio', label: '포트폴리오', query: '포트폴리오 프로젝트 정리' },
  {
    id: 'light-reading',
    label: '가볍게 보기',
    query: '가볍게 읽기 나중에 보기',
  },
];

export function getSituationQuery(id: RetrieveSituationId) {
  return (
    RETRIEVE_SITUATIONS.find((situation) => situation.id === id)?.query ?? ''
  );
}
```

- [ ] **Step 5: 검색 문서 작성**

Create `src/retrieve/retrieveSearchDocument.ts`:

```ts
import type { InsightView } from '@/insights/insightView';

export type RetrieveSearchDocument = {
  categoryNames: string;
  createdAt: string;
  description: string;
  domain: string;
  id: string;
  memo: string;
  originalUrl: string;
  title: string;
};

export function toRetrieveSearchDocument(
  insight: InsightView
): RetrieveSearchDocument {
  return {
    categoryNames: insight.categories
      .map((category) => category.name)
      .join(' '),
    createdAt: insight.createdAt,
    description: insight.description ?? '',
    domain: insight.domain,
    id: insight.id,
    memo: insight.memo ?? '',
    originalUrl: insight.originalUrl,
    title: insight.title,
  };
}
```

- [ ] **Step 6: 유사도 검색 작성**

Create `src/retrieve/retrieveInsights.ts`:

```ts
import MiniSearch from 'minisearch';
import type { InsightView } from '@/insights/insightView';
import { toRetrieveSearchDocument } from './retrieveSearchDocument';

const RETRIEVE_RESULT_LIMIT = 6;

export type RetrieveResult = {
  insight: InsightView;
  matchedTerms: string[];
  score: number;
};

export function retrieveInsights(
  insights: InsightView[],
  query: string
): RetrieveResult[] {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const documents = insights.map(toRetrieveSearchDocument);
  const insightById = new Map(insights.map((insight) => [insight.id, insight]));
  const miniSearch = new MiniSearch({
    fields: [
      'title',
      'memo',
      'categoryNames',
      'description',
      'domain',
      'originalUrl',
    ],
    idField: 'id',
    searchOptions: {
      boost: {
        title: 3,
        memo: 2.5,
        categoryNames: 1.5,
        description: 1.2,
        domain: 0.8,
        originalUrl: 0.5,
      },
      fuzzy: 0.2,
      prefix: true,
    },
    storeFields: ['id'],
  });

  miniSearch.addAll(documents);

  return miniSearch
    .search(trimmedQuery)
    .slice(0, RETRIEVE_RESULT_LIMIT)
    .map((result) => ({
      insight: insightById.get(String(result.id))!,
      matchedTerms: result.terms,
      score: result.score,
    }));
}
```

- [ ] **Step 7: 작업팩 작성**

Create `src/retrieve/retrievePack.ts`:

```ts
import type { RetrieveResult } from './retrieveInsights';

export type RetrievePackItem = {
  connectionCue: string;
  result: RetrieveResult;
};

export type RetrievePackSection = {
  items: RetrievePackItem[];
  title: string;
};

export type RetrievePack = {
  sections: RetrievePackSection[];
};

export function createRetrievePack(results: RetrieveResult[]): RetrievePack {
  const primary = results.slice(0, 3).map(toPackItem);
  const secondary = results.slice(3).map(toPackItem);

  return {
    sections: [
      ...(primary.length > 0
        ? [{ title: '이 상황과 가장 가까운 자료', items: primary }]
        : []),
      ...(secondary.length > 0
        ? [{ title: '함께 보면 좋은 자료', items: secondary }]
        : []),
    ],
  };
}

function toPackItem(result: RetrieveResult): RetrievePackItem {
  return {
    connectionCue: getConnectionCue(result),
    result,
  };
}

function getConnectionCue(result: RetrieveResult) {
  const [term] = result.matchedTerms;

  if (term) {
    return `현재 상황과 "${term}" 단서가 겹쳐요.`;
  }

  return '현재 상황과 가까운 저장 자료예요.';
}
```

- [ ] **Step 8: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/retrieve/retrieveInsights.test.ts
npm run build
```

- [ ] **Step 9: 커밋**

Run:

```bash
git add package.json package-lock.json src/retrieve
git commit -m "feat: 꺼내보기 유사도 검색 추가"
```

---

### Task 2: 홈 화면에 작업팩 연결

**Files:**

- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: 홈 화면 구현**

홈 화면은 `꺼내보기` 입력, 추천 상황 버튼, 작업팩 섹션, 결과 없음 상태를 포함한다. UI 문구는 고정 분류를 노출하지 않는다.

필수 동작:

- 추천 상황 버튼을 누르면 query가 입력되고 작업팩이 생성된다.
- 자유 입력으로도 작업팩을 생성할 수 있다.
- 작업팩 섹션은 `이 상황과 가장 가까운 자료`, `함께 보면 좋은 자료`를 기본으로 한다.
- 각 항목은 연결 단서를 짧게 표시한다.
- 원문 열기는 새 탭으로 열린다.
- 결과가 없으면 저장 CTA 또는 보관함 이동 CTA를 제공한다.

- [ ] **Step 2: 수동 확인**

Run:

```bash
npm run dev
```

브라우저에서 확인할 동작:

- 홈 화면에 `꺼내보기` 입력 영역이 있다.
- 추천 상황 버튼을 누르면 작업팩이 열린다.
- 결과는 단순 검색 결과 목록처럼 보이지 않는다.
- 고정된 `기획 참고`, `디자인 참고`, `구현 참고` 라벨이 보이지 않는다.
- 연결 단서가 각 항목에 표시된다.
- 카드의 원문 열기는 새 탭으로 열린다.

- [ ] **Step 3: 검증과 커밋**

Run:

```bash
npm run lint
npm test
npm run build
git add src/pages/HomePage.tsx
git commit -m "feat: 홈 꺼내보기 작업팩 연결"
```

---

## Self-Review

- `꺼내보기`를 보관함 검색 결과 화면과 분리했다.
- 상황 기반 유사도 검색과 작업팩 UX를 구현 기준으로 삼았다.
- 고정 분류 라벨을 사용자에게 노출하지 않는다.
- 연결 단서는 과장된 추천 이유가 아니라 검색 근거를 짧게 보여준다.
- AI/LLM, embedding, 리마인드는 MVP 제외 범위로 남겼다.
