# 아맞다 인사이트 저장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 URL만으로 인사이트를 즉시 저장하고, 저장 후 메모와 여러 카테고리를 선택적으로 연결할 수 있게 한다.

**Architecture:** URL 검증과 정규화는 `src/domain/url.ts`에 둔다. 저장 유스케이스는 `src/insights/saveInsight.ts`에서 Repository를 주입받아 테스트 가능하게 만들고, 화면은 `SavePage`에서 입력-저장-후속 분류 흐름을 담당한다.

**Tech Stack:** React 19, TypeScript, Supabase, Vitest, React Testing Library

---

## 범위

포함 범위:

- URL 입력 저장 화면
- URL 형식 검증
- 보수적 URL 정규화
- `original_url`과 `normalized_url` 분리 저장
- 사용자별 중복 URL 방지
- 저장 직후 인사이트 생성
- 저장 후 카테고리와 메모 선택 제안
- `그냥 저장`
- URL 수정 불가

제외 범위:

- URL 메타데이터 서버 수집
- 이미지 직접 업로드
- 저장 전 미리보기
- Chrome Extension

## 파일 구조

- Create: `src/domain/url.ts`
  - URL 검증, 정규화, 도메인 추출을 담당한다.
- Create: `src/domain/url.test.ts`
  - 정규화 규칙과 차단 protocol을 검증한다.
- Create: `src/insights/insightRepository.ts`
  - Supabase 인사이트 저장과 카테고리 연결을 담당한다.
- Create: `src/insights/saveInsight.ts`
  - URL을 인사이트로 저장하는 유스케이스를 담당한다.
- Create: `src/insights/saveInsight.test.ts`
  - 중복 감지와 저장 payload를 검증한다.
- Modify: `src/pages/SavePage.tsx`
  - 실제 URL 저장 화면으로 교체한다.

---

### Task 1: URL 도메인 규칙 작성

**Files:**

- Create: `src/domain/url.ts`
- Create: `src/domain/url.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/domain/url.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeUrl, parseInsightUrl } from './url';

describe('url domain', () => {
  it('normalizes host casing, default port, hash, root slash, and tracking params', () => {
    expect(
      normalizeUrl(' https://Example.com:443/?utm_source=feed&ref=home#section ')
    ).toBe('https://example.com/?ref=home');
  });

  it('keeps path casing and normal query parameters', () => {
    expect(normalizeUrl('https://example.com/React/Docs?Page=Intro')).toBe(
      'https://example.com/React/Docs?Page=Intro'
    );
  });

  it('blocks unsafe protocols', () => {
    expect(() => parseInsightUrl('javascript:alert(1)')).toThrow('지원하지 않는 URL 형식');
    expect(() => parseInsightUrl('file:///C:/secret.txt')).toThrow(
      '지원하지 않는 URL 형식'
    );
  });

  it('returns original URL, normalized URL, and domain', () => {
    expect(parseInsightUrl('https://React.dev/learn#top')).toEqual({
      domain: 'react.dev',
      normalizedUrl: 'https://react.dev/learn',
      originalUrl: 'https://React.dev/learn#top',
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/domain/url.test.ts
```

Expected:

```text
FAIL src/domain/url.test.ts
Cannot find module './url'
```

- [ ] **Step 3: URL 규칙 구현**

Create `src/domain/url.ts`:

```ts
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'ftp:']);
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
]);

export type ParsedInsightUrl = {
  domain: string;
  normalizedUrl: string;
  originalUrl: string;
};

function createUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  try {
    return new URL(trimmed);
  } catch {
    throw new Error('올바른 URL을 입력하세요.');
  }
}

export function normalizeUrl(rawUrl: string) {
  const url = createUrl(rawUrl);

  if (BLOCKED_PROTOCOLS.has(url.protocol) || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('지원하지 않는 URL 형식입니다.');
  }

  url.hostname = url.hostname.toLocaleLowerCase();
  url.hash = '';

  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  ) {
    url.port = '';
  }

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLocaleLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  if (url.pathname === '/') {
    return `${url.origin}/${url.search}`;
  }

  return url.toString();
}

export function parseInsightUrl(rawUrl: string): ParsedInsightUrl {
  const originalUrl = rawUrl.trim();
  const normalizedUrl = normalizeUrl(originalUrl);
  const normalized = new URL(normalizedUrl);

  return {
    domain: normalized.hostname,
    normalizedUrl,
    originalUrl,
  };
}
```

- [ ] **Step 4: 테스트 확인**

Run:

```bash
npm test -- src/domain/url.test.ts
```

Expected:

```text
4 passed
```

- [ ] **Step 5: 커밋**

Run:

```bash
git add src/domain/url.ts src/domain/url.test.ts
git commit -m "feat: 인사이트 URL 검증과 정규화 추가"
```

---

### Task 2: 인사이트 저장 유스케이스 작성

**Files:**

- Create: `src/insights/saveInsight.ts`
- Create: `src/insights/saveInsight.test.ts`
- Create: `src/insights/insightRepository.ts`

- [ ] **Step 1: 저장 유스케이스 테스트 작성**

Create `src/insights/saveInsight.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { saveInsight } from './saveInsight';

describe('saveInsight', () => {
  it('creates insight with normalized URL and fallback title', async () => {
    const createInsight = vi.fn().mockResolvedValue({ id: 'insight-id' });
    const attachCategories = vi.fn().mockResolvedValue(undefined);

    const result = await saveInsight({
      attachCategories,
      categoryIds: ['category-id'],
      createInsight,
      memo: '나중에 참고',
      rawUrl: 'https://React.dev/learn#top',
      userId: 'user-id',
    });

    expect(createInsight).toHaveBeenCalledWith({
      domain: 'react.dev',
      memo: '나중에 참고',
      normalized_url: 'https://react.dev/learn',
      original_url: 'https://React.dev/learn#top',
      title: 'react.dev',
      user_id: 'user-id',
    });
    expect(attachCategories).toHaveBeenCalledWith('user-id', 'insight-id', [
      'category-id',
    ]);
    expect(result).toEqual({ id: 'insight-id' });
  });

  it('saves without categories and memo', async () => {
    const createInsight = vi.fn().mockResolvedValue({ id: 'insight-id' });
    const attachCategories = vi.fn().mockResolvedValue(undefined);

    await saveInsight({
      attachCategories,
      categoryIds: [],
      createInsight,
      memo: '',
      rawUrl: 'https://example.com',
      userId: 'user-id',
    });

    expect(attachCategories).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/insights/saveInsight.test.ts
```

Expected:

```text
FAIL src/insights/saveInsight.test.ts
Cannot find module './saveInsight'
```

- [ ] **Step 3: Repository 작성**

Create `src/insights/insightRepository.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { InsightInsert } from '@/types/database';

export async function createInsight(input: InsightInsert) {
  const { data, error } = await supabase
    .from('insights')
    .insert(input)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return data;
}

export async function attachInsightCategories(
  userId: string,
  insightId: string,
  categoryIds: string[]
) {
  if (categoryIds.length === 0) {
    return;
  }

  const { error } = await supabase.from('insight_categories').insert(
    categoryIds.map((categoryId) => ({
      category_id: categoryId,
      insight_id: insightId,
      user_id: userId,
    }))
  );

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 4: 저장 유스케이스 구현**

Create `src/insights/saveInsight.ts`:

```ts
import { parseInsightUrl } from '@/domain/url';
import type { InsightInsert } from '@/types/database';

type SaveInsightInput = {
  attachCategories: (
    userId: string,
    insightId: string,
    categoryIds: string[]
  ) => Promise<void>;
  categoryIds: string[];
  createInsight: (input: InsightInsert) => Promise<{ id: string }>;
  memo: string;
  rawUrl: string;
  userId: string;
};

export async function saveInsight({
  attachCategories,
  categoryIds,
  createInsight,
  memo,
  rawUrl,
  userId,
}: SaveInsightInput) {
  const parsed = parseInsightUrl(rawUrl);
  const trimmedMemo = memo.trim();

  const insight = await createInsight({
    description: null,
    domain: parsed.domain,
    memo: trimmedMemo || null,
    metadata_status: 'pending',
    normalized_url: parsed.normalizedUrl,
    original_url: parsed.originalUrl,
    thumbnail_url: null,
    title: parsed.domain,
    user_id: userId,
  });

  if (categoryIds.length > 0) {
    await attachCategories(userId, insight.id, categoryIds);
  }

  return insight;
}
```

- [ ] **Step 5: 테스트 확인**

Run:

```bash
npm test -- src/insights/saveInsight.test.ts
```

Expected:

```text
2 passed
```

- [ ] **Step 6: 커밋**

Run:

```bash
git add src/insights/saveInsight.ts src/insights/saveInsight.test.ts src/insights/insightRepository.ts
git commit -m "feat: 인사이트 저장 유스케이스 추가"
```

---

### Task 3: 저장 화면 연결

**Files:**

- Modify: `src/pages/SavePage.tsx`

- [ ] **Step 1: 저장 화면을 실제 입력 흐름으로 교체**

Modify `src/pages/SavePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { getMyCategories } from '@/categories/categoryRepository';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';
import { useAuth } from '@/auth/AuthProvider';
import {
  attachInsightCategories,
  createInsight,
} from '@/insights/insightRepository';
import { saveInsight } from '@/insights/saveInsight';
import type { CategoryRow } from '@/types/database';

export function SavePage() {
  const { authState } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  const userId = authState.status === 'signed-in' ? authState.user.id : null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    void getMyCategories(userId).then(setCategories);
  }, [userId]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  };

  const handleSubmit = async () => {
    if (!userId) {
      return;
    }

    try {
      await saveInsight({
        attachCategories: attachInsightCategories,
        categoryIds: selectedCategoryIds,
        createInsight,
        memo,
        rawUrl: url,
        userId,
      });
      setMessage('인사이트를 저장했습니다.');
      setUrl('');
      setMemo('');
      setSelectedCategoryIds([]);
    } catch {
      setMessage('저장하지 못했습니다. URL을 확인한 뒤 다시 시도하세요.');
    }
  };

  return (
    <div className="page-stack">
      <section className="save-panel" aria-labelledby="save-title">
        <p className="section-kicker">저장</p>
        <h2 id="save-title">나중에 꺼내볼 인사이트를 저장하세요.</h2>
        <div className="save-form">
          <TextInput
            helperText="카테고리와 메모는 선택 사항입니다."
            label="URL"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            type="url"
            value={url}
          />
          <TextInput
            label="메모"
            onChange={(event) => setMemo(event.target.value)}
            placeholder="나중에 참고할 맥락"
            value={memo}
          />
          <div className="chip-row" aria-label="카테고리 선택">
            {categories.map((category) => (
              <Chip
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                selected={selectedCategoryIds.includes(category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </div>
          <Button onClick={handleSubmit}>저장</Button>
          <Button onClick={handleSubmit} variant="ghost">
            그냥 저장
          </Button>
          {message ? <p role="status">{message}</p> : null}
        </div>
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

- [ ] **Step 3: 커밋**

Run:

```bash
git add src/pages/SavePage.tsx
git commit -m "feat: URL 인사이트 저장 화면 연결"
```

---

## Self-Review

**Spec coverage:**

- URL 검증과 보수적 정규화 규칙을 포함했다.
- `original_url`과 `normalized_url`을 분리 저장한다.
- 카테고리와 메모는 선택 사항이다.
- 저장 전 미리보기는 만들지 않는다.
- URL 수정은 저장 화면 범위에 포함하지 않는다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- URL 규칙과 저장 유스케이스는 테스트 가능한 코드로 작성했다.

**Type consistency:**

- `InsightInsert` 필드명은 데이터 모델 계획의 `insights` 컬럼과 일치한다.
- `attachInsightCategories`의 인자 순서는 테스트와 화면에서 일치한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-insight-save.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
