# 아맞다 꺼내보기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 현재 상황이나 필요한 용도를 입력해 관련 인사이트를 최대 6개까지 다시 꺼내볼 수 있게 한다.

**Architecture:** 꺼내보기는 검색과 같은 인사이트 view model을 재사용하되, 홈 화면에서 추천 상황 버튼과 자유 입력으로 시작한다. 결과 메시지와 최대 결과 수는 `src/retrieve`에 순수 함수로 분리하고, 실제 데이터 조회는 보관함의 `getMyInsights`를 재사용한다.

**Tech Stack:** React 19, TypeScript, Fuse.js, Supabase, Vitest, React Testing Library

---

## 범위

포함 범위:

- 홈 화면의 꺼내보기 입력 영역
- 추천 상황 버튼
- 자유 입력
- 추천 상황 버튼을 검색 query로 변환
- Fuse.js 기반 관련 인사이트 검색
- 최대 6개 결과 제한
- 결과 개수별 메시지
- 결과 없음 상태
- 최근 보관한 인사이트 섹션
- 원문 새 탭 열기

제외 범위:

- AI 추천
- Embedding 기반 의미 검색
- 추천 결과별 피드백
- 추천 반복 횟수 기반 랭킹 조정
- 이메일/푸시 리마인드

## 파일 구조

- Create: `src/retrieve/retrieveSituations.ts`
  - 추천 상황 버튼과 query 변환 규칙을 정의한다.
- Create: `src/retrieve/retrieveMessages.ts`
  - 결과 개수별 문구를 만든다.
- Create: `src/retrieve/retrieveInsights.ts`
  - 검색 결과를 최대 6개로 제한하는 꺼내보기 함수를 만든다.
- Create: `src/retrieve/retrieveInsights.test.ts`
  - query 변환, 결과 제한, 메시지를 검증한다.
- Modify: `src/pages/HomePage.tsx`
  - 실제 꺼내보기 화면으로 연결한다.

---

### Task 1: 꺼내보기 도메인 함수 작성

**Files:**

- Create: `src/retrieve/retrieveSituations.ts`
- Create: `src/retrieve/retrieveMessages.ts`
- Create: `src/retrieve/retrieveInsights.ts`
- Create: `src/retrieve/retrieveInsights.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/retrieve/retrieveInsights.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { InsightView } from '@/insights/insightView';
import { getRetrieveMessage } from './retrieveMessages';
import { retrieveInsights } from './retrieveInsights';
import { getSituationQuery, RETRIEVE_SITUATIONS } from './retrieveSituations';

const insights: InsightView[] = Array.from({ length: 8 }, (_, index) => ({
  categories: [{ id: 'design', name: '디자인' }],
  createdAt: `2026-07-0${index + 1}T00:00:00Z`,
  domain: 'example.com',
  id: String(index + 1),
  memo: '팀 프로젝트 앱 디자인 참고',
  originalUrl: `https://example.com/${index + 1}`,
  thumbnailUrl: null,
  title: `UI 레퍼런스 ${index + 1}`,
}));

describe('retrieve', () => {
  it('maps situation button to query', () => {
    expect(RETRIEVE_SITUATIONS.map((situation) => situation.label)).toContain(
      '팀 프로젝트'
    );
    expect(getSituationQuery('team-project')).toBe('팀 프로젝트 기획 디자인 개발');
  });

  it('limits retrieve results to 6 items', () => {
    expect(retrieveInsights(insights, '팀 프로젝트').length).toBe(6);
  });

  it('returns count-based messages', () => {
    expect(getRetrieveMessage(0)).toBe('지금 꺼내볼 만한 인사이트가 없습니다.');
    expect(getRetrieveMessage(1)).toBe('인사이트 1개를 꺼냈습니다.');
    expect(getRetrieveMessage(6)).toBe('인사이트 6개를 꺼냈습니다.');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/retrieve/retrieveInsights.test.ts
```

Expected:

```text
FAIL src/retrieve/retrieveInsights.test.ts
Cannot find module './retrieveMessages'
```

- [ ] **Step 3: 추천 상황 작성**

Create `src/retrieve/retrieveSituations.ts`:

```ts
export type RetrieveSituationId =
  | 'study'
  | 'team-project'
  | 'development'
  | 'design'
  | 'portfolio'
  | 'chill';

export type RetrieveSituation = {
  id: RetrieveSituationId;
  label: string;
  query: string;
};

export const RETRIEVE_SITUATIONS: RetrieveSituation[] = [
  { id: 'study', label: '공부', query: '공부 개념 정리 시험 과제' },
  { id: 'team-project', label: '팀 프로젝트', query: '팀 프로젝트 기획 디자인 개발' },
  { id: 'development', label: '개발', query: '개발 코드 구현 프론트엔드' },
  { id: 'design', label: '디자인', query: '디자인 UI UX 레퍼런스' },
  { id: 'portfolio', label: '포트폴리오', query: '포트폴리오 프로젝트 정리' },
  { id: 'chill', label: '쉬면서 보기', query: '쉬면서 보기 가볍게 읽기' },
];

export function getSituationQuery(id: RetrieveSituationId) {
  return RETRIEVE_SITUATIONS.find((situation) => situation.id === id)?.query ?? '';
}
```

- [ ] **Step 4: 결과 메시지 작성**

Create `src/retrieve/retrieveMessages.ts`:

```ts
export function getRetrieveMessage(count: number) {
  if (count === 0) {
    return '지금 꺼내볼 만한 인사이트가 없습니다.';
  }

  return `인사이트 ${count}개를 꺼냈습니다.`;
}
```

- [ ] **Step 5: 꺼내보기 검색 작성**

Create `src/retrieve/retrieveInsights.ts`:

```ts
import type { InsightView } from '@/insights/insightView';
import { searchInsights } from '@/search/insightSearch';

const RETRIEVE_RESULT_LIMIT = 6;

export function retrieveInsights(insights: InsightView[], query: string) {
  return searchInsights(insights, query).slice(0, RETRIEVE_RESULT_LIMIT);
}
```

- [ ] **Step 6: 테스트 확인**

Run:

```bash
npm test -- src/retrieve/retrieveInsights.test.ts
```

Expected:

```text
3 passed
```

- [ ] **Step 7: 커밋**

Run:

```bash
git add src/retrieve/retrieveSituations.ts src/retrieve/retrieveMessages.ts src/retrieve/retrieveInsights.ts src/retrieve/retrieveInsights.test.ts
git commit -m "feat: 꺼내보기 추천 규칙 추가"
```

---

### Task 2: 홈 화면에 꺼내보기 연결

**Files:**

- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: 홈 화면 구현**

Modify `src/pages/HomePage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { InsightCard } from '@/components/ui/InsightCard';
import { TextInput } from '@/components/ui/TextInput';
import { getMyInsights } from '@/insights/insightQueries';
import type { InsightView } from '@/insights/insightView';
import { getRetrieveMessage } from '@/retrieve/retrieveMessages';
import { retrieveInsights } from '@/retrieve/retrieveInsights';
import {
  getSituationQuery,
  RETRIEVE_SITUATIONS,
} from '@/retrieve/retrieveSituations';

export function HomePage() {
  const { authState } = useAuth();
  const [insights, setInsights] = useState<InsightView[]>([]);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const userId = authState.status === 'signed-in' ? authState.user.id : null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    void getMyInsights(userId).then(setInsights);
  }, [userId]);

  const retrieveResults = useMemo(
    () => retrieveInsights(insights, submittedQuery),
    [insights, submittedQuery]
  );
  const recentInsights = insights.slice(0, 3);
  const hasSubmitted = submittedQuery.trim().length > 0;

  const submitQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
  };

  return (
    <div className="page-stack">
      <section className="hero-panel" aria-labelledby="retrieve-title">
        <p className="section-kicker">꺼내보기</p>
        <h2 id="retrieve-title">지금 필요한 인사이트를 다시 꺼내보세요.</h2>
        <div className="retrieve-form">
          <TextInput
            label="상황 또는 용도"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 팀 프로젝트 앱 디자인 참고"
            value={query}
          />
          <Button onClick={() => submitQuery(query)}>추천 보기</Button>
        </div>
        <div className="chip-row" aria-label="추천 상황">
          {RETRIEVE_SITUATIONS.map((situation) => (
            <Chip
              key={situation.id}
              onClick={() => submitQuery(getSituationQuery(situation.id))}
            >
              {situation.label}
            </Chip>
          ))}
        </div>
      </section>

      {hasSubmitted ? (
        <section aria-labelledby="retrieve-result-title">
          <div className="section-heading">
            <p className="section-kicker">결과</p>
            <h2 id="retrieve-result-title">
              {getRetrieveMessage(retrieveResults.length)}
            </h2>
          </div>
          {retrieveResults.length > 0 ? (
            <div className="card-grid">
              {retrieveResults.map((insight) => (
                <InsightCard
                  categories={insight.categories.map((category) => category.name)}
                  domain={insight.domain}
                  key={insight.id}
                  memo={insight.memo ?? undefined}
                  onOpen={() =>
                    window.open(insight.originalUrl, '_blank', 'noopener')
                  }
                  thumbnailUrl={insight.thumbnailUrl ?? undefined}
                  title={insight.title}
                />
              ))}
            </div>
          ) : (
            <p className="empty-state">보관함에 인사이트를 더 저장해보세요.</p>
          )}
        </section>
      ) : null}

      <section aria-labelledby="recent-insights-title">
        <div className="section-heading">
          <p className="section-kicker">최근 보관</p>
          <h2 id="recent-insights-title">최근 보관한 인사이트</h2>
        </div>
        {recentInsights.length > 0 ? (
          <div className="card-grid">
            {recentInsights.map((insight) => (
              <InsightCard
                categories={insight.categories.map((category) => category.name)}
                domain={insight.domain}
                key={insight.id}
                memo={insight.memo ?? undefined}
                onOpen={() => window.open(insight.originalUrl, '_blank', 'noopener')}
                thumbnailUrl={insight.thumbnailUrl ?? undefined}
                title={insight.title}
              />
            ))}
          </div>
        ) : (
          <p className="empty-state">최근 보관한 인사이트가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 3: 수동 확인**

Run:

```bash
npm run dev
```

Expected:

```text
Local: http://localhost:5173/
```

브라우저에서 확인할 동작:

- 홈 화면에 `꺼내보기` 입력 영역이 있다.
- 추천 상황 버튼을 누르면 결과 영역이 열린다.
- 결과는 최대 6개 카드로 보인다.
- 결과 수에 따라 제목 문구가 달라진다.
- 카드의 원문 열기는 새 탭으로 열린다.

- [ ] **Step 4: 커밋**

Run:

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: 홈 꺼내보기 화면 연결"
```

---

## Self-Review

**Spec coverage:**

- 추천 상황 버튼과 자유 입력을 모두 제공한다.
- 추천 상황 버튼은 query로 변환된다.
- 결과는 최대 6개로 제한된다.
- 결과 개수별 메시지를 사용한다.
- 꺼내보기 결과에서 원문은 새 탭으로 열린다.
- 최근 보관한 인사이트 섹션이 포함된다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- 결과 제한과 문구는 테스트 가능한 함수로 분리했다.

**Type consistency:**

- `InsightView`는 보관함과 꺼내보기에서 같은 타입을 사용한다.
- `RetrieveSituationId`는 추천 상황 목록과 query 변환 함수에서 일치한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-retrieve.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
