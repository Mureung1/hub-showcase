# 아맞다 보관함과 검색 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 보관함에서 저장한 인사이트를 최신순으로 보고, 카테고리/미분류 필터와 키워드 검색으로 직접 찾을 수 있게 한다.

**Architecture:** 인사이트 조회와 삭제 Repository는 `src/entities/insight`에 둔다. 보관함 검색과 필터링은 `src/features/library`에 순수 함수로 구현한다. `꺼내보기`와 검색 문서 일부를 공유할 수 있지만, 보관함 검색 UX는 직접 탐색용 결과 목록이고 `꺼내보기` UX는 `docs/retrieve.md`의 작업팩 기준을 따른다.


**FSD note:** 파일 경로는 slice 내부 위치를 표기한다. 외부 import는 각 slice의 `index.ts` public API를 사용하며, 새 slice를 만들 때 필요한 `index.ts`도 함께 추가한다.

**Tech Stack:** React 19, TypeScript, Supabase, MiniSearch 또는 Fuse.js, Vitest, React Testing Library

---

## 범위

포함 범위:

- 전체 인사이트 목록 조회
- 최신 저장순 정렬
- `All`, 사용자 카테고리, `미분류` 필터
- 제목, 메모, 카테고리 이름, URL, 도메인 검색
- 검색 결과 없음과 빈 상태
- 원문 새 탭 열기
- 제목, 메모, 카테고리 수정 진입점
- 인사이트 삭제

제외 범위:

- URL 수정
- 휴지통/복구
- 정렬 옵션
- 협업 보관함
- 보관함 카드의 추천 이유 표시
- 꺼내보기 작업팩 생성

## 파일 구조

- Modify: `package.json`
  - 보관함 검색에 사용할 검색 라이브러리를 추가한다.
- Create: `src/entities/insight/model/insightView.ts`
  - 카드와 검색에 쓰는 인사이트 view model을 정의한다.
- Create: `src/entities/insight/api/insightQueries.ts`
  - 보관함 목록 조회, 수정, 삭제를 담당한다.
- Create: `src/features/library/model/insightSearch.ts`
  - 보관함 검색 함수를 제공한다.
- Create: `src/features/library/model/insightSearch.test.ts`
  - 검색 대상 필드와 결과 정렬을 검증한다.
- Create: `src/features/library/model/categoryFilters.ts`
  - `All`, 사용자 카테고리, `미분류` 필터 모델을 만든다.
- Create: `src/features/library/model/categoryFilters.test.ts`
  - 필터 순서를 검증한다.
- Modify: `src/pages/library/ui/LibraryPage.tsx`
  - 실제 보관함 화면으로 연결한다.

---

### Task 1: 보관함 검색 도입

**Files:**

- Modify: `package.json`
- Create: `src/entities/insight/model/insightView.ts`
- Create: `src/features/library/model/insightSearch.ts`
- Create: `src/features/library/model/insightSearch.test.ts`

- [ ] **Step 1: 검색 라이브러리 설치**

Run:

```bash
npm install minisearch
```

Expected:

```text
added ... packages
found 0 vulnerabilities
```

- [ ] **Step 2: 검색 view model 작성**

Create `src/entities/insight/model/insightView.ts`:

```ts
export type InsightCategoryView = {
  id: string;
  name: string;
};

export type InsightView = {
  categories: InsightCategoryView[];
  createdAt: string;
  description: string | null;
  domain: string;
  id: string;
  memo: string | null;
  originalUrl: string;
  thumbnailUrl: string | null;
  title: string;
};
```

- [ ] **Step 3: 실패하는 검색 테스트 작성**

Create `src/features/library/model/insightSearch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { InsightView } from '@/entities/insight';
import { searchInsights } from './insightSearch';

const insights: InsightView[] = [
  {
    categories: [{ id: 'c1', name: '개발' }],
    createdAt: '2026-01-02T00:00:00Z',
    description: null,
    domain: 'react.dev',
    id: '1',
    memo: '폼 상태 관리 참고',
    originalUrl: 'https://react.dev/learn',
    thumbnailUrl: null,
    title: 'React 공식 문서',
  },
  {
    categories: [{ id: 'c2', name: '디자인' }],
    createdAt: '2026-07-06T00:00:00Z',
    description: null,
    domain: 'example.com',
    id: '2',
    memo: '앱 온보딩 화면 참고',
    originalUrl: 'https://example.com/onboarding',
    thumbnailUrl: null,
    title: '모바일 온보딩 UX',
  },
];

describe('searchInsights', () => {
  it('returns all insights when query is empty', () => {
    expect(searchInsights(insights, '').map((item) => item.id)).toEqual([
      '1',
      '2',
    ]);
  });

  it('searches by title, memo, category, URL, and domain', () => {
    expect(searchInsights(insights, 'React').map((item) => item.id)).toEqual([
      '1',
    ]);
    expect(searchInsights(insights, '온보딩').map((item) => item.id)).toEqual([
      '2',
    ]);
    expect(searchInsights(insights, '디자인').map((item) => item.id)).toEqual([
      '2',
    ]);
    expect(
      searchInsights(insights, 'react.dev').map((item) => item.id)
    ).toEqual(['1']);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run:

```bash
npm test -- src/features/library/model/insightSearch.test.ts
```

Expected:

```text
FAIL src/features/library/model/insightSearch.test.ts
Cannot find module './insightSearch'
```

- [ ] **Step 5: 보관함 검색 구현**

Create `src/features/library/model/insightSearch.ts`:

```ts
import MiniSearch from 'minisearch';
import type { InsightView } from '@/entities/insight';

type SearchDocument = InsightView & {
  categoryNames: string;
};

function toSearchDocument(insight: InsightView): SearchDocument {
  return {
    ...insight,
    categoryNames: insight.categories
      .map((category) => category.name)
      .join(' '),
  };
}

export function searchInsights(insights: InsightView[], query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return insights;
  }

  const documents = insights.map(toSearchDocument);
  const miniSearch = new MiniSearch({
    fields: ['title', 'memo', 'categoryNames', 'domain', 'originalUrl'],
    idField: 'id',
    searchOptions: {
      boost: {
        title: 3,
        memo: 2,
        categoryNames: 1.5,
        domain: 1,
        originalUrl: 0.5,
      },
      fuzzy: 0.2,
      prefix: true,
    },
    storeFields: ['id'],
  });
  miniSearch.addAll(documents);
  const insightById = new Map(insights.map((insight) => [insight.id, insight]));

  return miniSearch.search(trimmedQuery).map((result) => {
    return insightById.get(String(result.id))!;
  });
}
```

- [ ] **Step 6: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/features/library/model/insightSearch.test.ts
npm run build
```

Expected:

```text
2 passed
✓ built in
```

- [ ] **Step 7: 커밋**

Run:

```bash
git add package.json package-lock.json src/entities/insight/model/insightView.ts src/features/library/model/insightSearch.ts src/features/library/model/insightSearch.test.ts
git commit -m "feat: 보관함 인사이트 검색 추가"
```

---

### Task 2: 카테고리 필터 모델 작성

**Files:**

- Create: `src/features/library/model/categoryFilters.ts`
- Create: `src/features/library/model/categoryFilters.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/features/library/model/categoryFilters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCategoryFilters } from './categoryFilters';

describe('buildCategoryFilters', () => {
  it('places All first and uncategorized last', () => {
    expect(
      buildCategoryFilters([
        {
          color: '#000',
          created_at: '',
          id: 'c1',
          name: '개발',
          sort_order: 0,
          updated_at: '',
          user_id: 'u1',
        },
        {
          color: '#111',
          created_at: '',
          id: 'c2',
          name: '디자인',
          sort_order: 1,
          updated_at: '',
          user_id: 'u1',
        },
      ]).map((filter) => filter.label)
    ).toEqual(['All', '개발', '디자인', '미분류']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/features/library/model/categoryFilters.test.ts
```

Expected:

```text
FAIL src/features/library/model/categoryFilters.test.ts
Cannot find module './categoryFilters'
```

- [ ] **Step 3: 필터 모델 구현**

Create `src/features/library/model/categoryFilters.ts`:

```ts
import type { CategoryRow } from '@/shared/api';

export type CategoryFilter =
  | { id: 'all'; label: 'All'; type: 'all' }
  | { id: string; label: string; type: 'category' }
  | { id: 'uncategorized'; label: '미분류'; type: 'uncategorized' };

export function buildCategoryFilters(
  categories: CategoryRow[]
): CategoryFilter[] {
  return [
    { id: 'all', label: 'All', type: 'all' },
    ...categories.map((category) => ({
      id: category.id,
      label: category.name,
      type: 'category' as const,
    })),
    { id: 'uncategorized', label: '미분류', type: 'uncategorized' },
  ];
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
npm test -- src/features/library/model/categoryFilters.test.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/features/library/model/categoryFilters.ts src/features/library/model/categoryFilters.test.ts
git commit -m "feat: 보관함 카테고리 필터 모델 추가"
```

---

### Task 3: 보관함 인사이트 Repository 작성

**Files:**

- Create: `src/entities/insight/api/insightQueries.ts`

- [ ] **Step 1: Repository 작성**

Create `src/entities/insight/api/insightQueries.ts`:

```ts
import { supabase } from '@/shared/api';
import type { InsightView } from './insightView';

type InsightListRow = {
  created_at: string;
  domain: string;
  id: string;
  insight_categories: {
    categories: {
      id: string;
      name: string;
    } | null;
  }[];
  memo: string | null;
  original_url: string;
  thumbnail_url: string | null;
  title: string;
};

function mapInsightRow(row: InsightListRow): InsightView {
  return {
    categories: row.insight_categories
      .map((item) => item.categories)
      .filter((category): category is { id: string; name: string } =>
        Boolean(category)
      ),
    createdAt: row.created_at,
    domain: row.domain,
    id: row.id,
    memo: row.memo,
    originalUrl: row.original_url,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
  };
}

export async function getMyInsights(userId: string) {
  const { data, error } = await supabase
    .from('insights')
    .select(
      `
      id,
      title,
      memo,
      original_url,
      domain,
      thumbnail_url,
      created_at,
      insight_categories (
        categories (
          id,
          name
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<InsightListRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapInsightRow);
}

export async function deleteInsight(insightId: string) {
  const { error } = await supabase
    .from('insights')
    .delete()
    .eq('id', insightId);

  if (error) {
    throw error;
  }
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

- [ ] **Step 3: 커밋**

Run:

```bash
git add src/entities/insight/api/insightQueries.ts
git commit -m "feat: 보관함 인사이트 조회와 삭제 추가"
```

---

### Task 4: 보관함 화면 연결

**Files:**

- Modify: `src/pages/library/ui/LibraryPage.tsx`

- [ ] **Step 1: 보관함 화면 구현**

Modify `src/pages/library/ui/LibraryPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { getMyCategories } from '@/entities/category';
import { buildCategoryFilters } from '@/features/library';
import type { CategoryFilter } from '@/features/library';
import { useAuth } from '@/features/auth';
import { Chip } from '@/shared/ui';
import { InsightCard } from '@/shared/ui';
import { TextInput } from '@/shared/ui';
import { deleteInsight, getMyInsights } from '@/entities/insight';
import type { InsightView } from '@/entities/insight';
import { searchInsights } from '@/features/library';
import type { CategoryRow } from '@/shared/api';

function matchesFilter(insight: InsightView, filter: CategoryFilter) {
  if (filter.type === 'all') {
    return true;
  }

  if (filter.type === 'uncategorized') {
    return insight.categories.length === 0;
  }

  return insight.categories.some((category) => category.id === filter.id);
}

export function LibraryPage() {
  const { authState } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [insights, setInsights] = useState<InsightView[]>([]);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter['id']>('all');
  const [query, setQuery] = useState('');

  const userId = authState.status === 'signed-in' ? authState.user.id : null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    void Promise.all([getMyCategories(userId), getMyInsights(userId)]).then(
      ([nextCategories, nextInsights]) => {
        setCategories(nextCategories);
        setInsights(nextInsights);
      }
    );
  }, [userId]);

  const filters = useMemo(() => buildCategoryFilters(categories), [categories]);
  const selectedFilter =
    filters.find((filter) => filter.id === activeFilter) ?? filters[0];

  const visibleInsights = useMemo(() => {
    const filtered = insights.filter((insight) =>
      matchesFilter(insight, selectedFilter)
    );

    return searchInsights(filtered, query);
  }, [insights, query, selectedFilter]);

  const handleDelete = async (insightId: string) => {
    await deleteInsight(insightId);
    setInsights((current) =>
      current.filter((insight) => insight.id !== insightId)
    );
  };

  return (
    <div className="page-stack">
      <section className="toolbar" aria-label="보관함 필터">
        <TextInput
          label="검색"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="제목, 메모, 카테고리 검색"
          value={query}
        />
        <div className="chip-row" aria-label="카테고리 필터">
          {filters.map((filter) => (
            <Chip
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              selected={filter.id === activeFilter}
            >
              {filter.label}
            </Chip>
          ))}
        </div>
      </section>

      <section aria-labelledby="library-title">
        <div className="section-heading">
          <p className="section-kicker">보관함</p>
          <h2 id="library-title">저장한 인사이트</h2>
        </div>
        {visibleInsights.length > 0 ? (
          <div className="card-grid">
            {visibleInsights.map((insight) => (
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
          <p className="empty-state">조건에 맞는 인사이트가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 삭제 액션을 카드에 연결**

Modify `src/shared/ui/InsightCard.tsx`:

```tsx
import { ExternalLink } from 'lucide-react';
import { Button } from './Button';

type InsightCardProps = {
  categories?: readonly string[];
  domain: string;
  memo?: string;
  onDelete?: () => void;
  onOpen: () => void;
  thumbnailUrl?: string;
  title: string;
};

export function InsightCard({
  categories = [],
  domain,
  memo,
  onDelete,
  onOpen,
  thumbnailUrl,
  title,
}: InsightCardProps) {
  return (
    <article className="insight-card">
      <div className="insight-card__thumbnail" aria-hidden="true">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" />
        ) : (
          <span className="insight-card__thumbnail-fallback">아맞다</span>
        )}
      </div>
      <div className="insight-card__body">
        <p className="insight-card__domain">{domain}</p>
        <h3 className="insight-card__title">{title}</h3>
        {memo ? (
          <p className="insight-card__memo" aria-label="인사이트 메모">
            {memo}
          </p>
        ) : null}
        {categories.length > 0 ? (
          <ul className="insight-card__categories" aria-label="카테고리 목록">
            {categories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        ) : null}
        <div className="insight-card__actions">
          <Button
            aria-label={`${title} 원문 열기`}
            className="insight-card__open"
            onClick={onOpen}
            variant="secondary"
          >
            <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
            원문 열기
          </Button>
          {onDelete ? (
            <Button onClick={onDelete} variant="ghost">
              삭제
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
```

Modify the `InsightCard` call inside `src/pages/library/ui/LibraryPage.tsx`:

```tsx
onDelete={() => void handleDelete(insight.id)}
```

- [ ] **Step 3: 빌드 확인**

Run:

```bash
npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 4: 커밋**

Run:

```bash
git add src/pages/library/ui/LibraryPage.tsx src/shared/ui/InsightCard.tsx
git commit -m "feat: 보관함 필터와 검색 화면 연결"
```

---

## Self-Review

**Spec coverage:**

- 최신 저장순 조회는 Supabase query에서 처리한다.
- `All`, 사용자 카테고리, `미분류` 필터를 제공한다.
- 제목, 메모, 카테고리 이름, URL, 도메인 검색을 제공한다.
- 저장일과 보관함 카드의 추천 이유는 표시하지 않는다.
- 원문은 새 탭으로 연다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- 검색과 필터 규칙은 테스트 가능한 순수 함수로 분리했다.

**Type consistency:**

- `InsightView`는 검색, 카드, 보관함 화면에서 같은 형태로 사용한다.
- `CategoryFilter`는 필터 UI와 필터 판정 함수에서 같은 타입으로 사용한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-library.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
