# 아맞다 URL 메타데이터 수집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인사이트 저장 후 서버 함수로 URL 메타데이터를 비동기 수집하고, 실패해도 저장 성공 상태를 유지한다.

**Architecture:** 프론트엔드는 `supabase.functions.invoke`로 메타데이터 수집을 요청한다. Supabase Edge Function은 HTML만 가져와 `og:title`, `<title>`, description, `og:image`를 파싱하고, SSRF 위험을 줄이기 위해 protocol, localhost, private IP, timeout, 응답 크기를 제한한다.

**Tech Stack:** Supabase Edge Functions, Deno TypeScript, Supabase JavaScript client, React 19, TypeScript

---

## 범위

포함 범위:

- 저장 후 비동기 메타데이터 요청
- 수집 상태를 사용자에게 별도로 표시하지 않음
- `og:title`, `<title>` fallback
- `og:description`, `meta description`
- `og:image`
- 제목 fallback으로 도메인 또는 URL 사용
- 썸네일 fallback
- 수집 실패 시 저장 성공 유지
- 사용자가 수정한 제목을 자동 수집 제목으로 덮어쓰지 않음
- URL protocol, private IP, timeout, 응답 크기 제한

제외 범위:

- URL shortener 자동 확장
- XML/SVG 파싱
- 이미지 직접 저장
- AI 요약

## 파일 구조

- Create: `supabase/functions/collect-metadata/index.ts`
  - Edge Function 진입점이다.
- Create: `supabase/functions/collect-metadata/metadata.ts`
  - HTML 메타데이터 파싱과 URL 안전성 검사를 담당한다.
- Create: `src/metadata/metadataRepository.ts`
  - 프론트엔드에서 Edge Function 호출을 담당한다.
- Modify: `src/insights/saveInsight.ts`
  - 저장 성공 후 메타데이터 요청 함수를 선택적으로 호출한다.
- Modify: `src/insights/saveInsight.test.ts`
  - 메타데이터 요청 실패가 저장 실패로 전파되지 않는지 검증한다.

---

### Task 1: Edge Function 메타데이터 파서 작성

**Files:**

- Create: `supabase/functions/collect-metadata/metadata.ts`

- [ ] **Step 1: 메타데이터 파서 작성**

Create `supabase/functions/collect-metadata/metadata.ts`:

```ts
export type UrlMetadata = {
  description: string | null;
  thumbnailUrl: string | null;
  title: string | null;
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
];

export function assertFetchableUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('지원하지 않는 URL 형식입니다.');
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error('수집할 수 없는 URL입니다.');
  }

  return url;
}

function readMetaContent(html: string, property: string) {
  const escaped = property.replaceAll(':', '\\\\:');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return null;
}

function readTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  return match?.[1] ? decodeHtml(match[1].trim()) : null;
}

function decodeHtml(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

export function parseMetadata(html: string): UrlMetadata {
  return {
    description:
      readMetaContent(html, 'og:description') ?? readMetaContent(html, 'description'),
    thumbnailUrl: readMetaContent(html, 'og:image'),
    title: readMetaContent(html, 'og:title') ?? readTitle(html),
  };
}
```

- [ ] **Step 2: 수동 타입 점검**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
no TypeScript errors
```

- [ ] **Step 3: 커밋**

Run:

```bash
git add supabase/functions/collect-metadata/metadata.ts
git commit -m "feat: URL 메타데이터 파서 추가"
```

---

### Task 2: Edge Function 진입점 작성

**Files:**

- Create: `supabase/functions/collect-metadata/index.ts`

- [ ] **Step 1: Edge Function 작성**

Create `supabase/functions/collect-metadata/index.ts`:

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { assertFetchableUrl, parseMetadata } from './metadata.ts';

const MAX_HTML_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 5000;

type RequestBody = {
  insightId: string;
  url: string;
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Missing Supabase secrets' }, { status: 500 });
  }

  const { insightId, url } = (await request.json()) as RequestBody;
  const targetUrl = assertFetchableUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        accept: 'text/html',
        'user-agent': 'amadda-metadata-bot/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('text/html')) {
      throw new Error('HTML 응답이 아닙니다.');
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const metadata = parseMetadata(html);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from('insights')
      .update({
        description: metadata.description,
        metadata_status: 'ready',
        thumbnail_url: metadata.thumbnailUrl,
        title: metadata.title ?? targetUrl.hostname,
      })
      .eq('id', insightId)
      .eq('metadata_status', 'pending');

    if (error) {
      throw error;
    }

    return Response.json({ ok: true });
  } catch (error) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await supabase
      .from('insights')
      .update({ metadata_status: 'failed' })
      .eq('id', insightId)
      .eq('metadata_status', 'pending');

    return Response.json(
      { error: error instanceof Error ? error.message : 'metadata failed' },
      { status: 200 }
    );
  } finally {
    clearTimeout(timeout);
  }
});
```

- [ ] **Step 2: 로컬 함수 실행 확인**

Run:

```bash
npx supabase functions serve collect-metadata
```

Expected:

```text
Serving functions on
```

- [ ] **Step 3: 커밋**

Run:

```bash
git add supabase/functions/collect-metadata/index.ts
git commit -m "feat: URL 메타데이터 수집 Edge Function 추가"
```

---

### Task 3: 프론트엔드 메타데이터 요청 연결

**Files:**

- Create: `src/metadata/metadataRepository.ts`
- Modify: `src/insights/saveInsight.ts`
- Modify: `src/insights/saveInsight.test.ts`

- [ ] **Step 1: 메타데이터 Repository 작성**

Create `src/metadata/metadataRepository.ts`:

```ts
import { supabase } from '@/lib/supabase';

export async function requestMetadataCollection(insightId: string, url: string) {
  const { error } = await supabase.functions.invoke('collect-metadata', {
    body: {
      insightId,
      url,
    },
  });

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 2: 저장 유스케이스 테스트 확장**

Add to `src/insights/saveInsight.test.ts`:

```ts
it('does not fail insight saving when metadata collection fails', async () => {
  const createInsight = vi.fn().mockResolvedValue({ id: 'insight-id' });
  const attachCategories = vi.fn().mockResolvedValue(undefined);
  const requestMetadata = vi.fn().mockRejectedValue(new Error('metadata failed'));

  const result = await saveInsight({
    attachCategories,
    categoryIds: [],
    createInsight,
    memo: '',
    rawUrl: 'https://example.com',
    requestMetadata,
    userId: 'user-id',
  });

  expect(result).toEqual({ id: 'insight-id' });
  expect(requestMetadata).toHaveBeenCalledWith('insight-id', 'https://example.com');
});
```

- [ ] **Step 3: 저장 유스케이스 수정**

Modify `src/insights/saveInsight.ts` so `SaveInsightInput` includes:

```ts
requestMetadata?: (insightId: string, url: string) => Promise<void>;
```

Then call it after category attachment:

```ts
if (requestMetadata) {
  void requestMetadata(insight.id, parsed.originalUrl).catch(() => undefined);
}
```

- [ ] **Step 4: 저장 화면에서 메타데이터 요청 함수 전달**

Modify `src/pages/SavePage.tsx`:

```tsx
import { requestMetadataCollection } from '@/metadata/metadataRepository';
```

Add to the `saveInsight` call:

```tsx
requestMetadata: requestMetadataCollection,
```

- [ ] **Step 5: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/insights/saveInsight.test.ts
npm run build
```

Expected:

```text
3 passed
✓ built in
```

- [ ] **Step 6: 커밋**

Run:

```bash
git add src/metadata/metadataRepository.ts src/insights/saveInsight.ts src/insights/saveInsight.test.ts src/pages/SavePage.tsx
git commit -m "feat: 저장 후 URL 메타데이터 수집 요청 연결"
```

---

## Self-Review

**Spec coverage:**

- 저장 후 비동기 메타데이터 수집을 요청한다.
- 수집 실패가 저장 실패로 전파되지 않는다.
- 제목, 설명, 썸네일 수집과 fallback을 포함한다.
- private IP, protocol, timeout, 응답 크기, HTML content type을 제한한다.
- XML/SVG 파싱과 URL shortener 자동 확장은 제외한다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- Edge Function과 프론트엔드 호출 코드를 모두 포함했다.

**Type consistency:**

- `metadata_status` 값은 데이터 모델의 `'pending' | 'ready' | 'failed'`와 일치한다.
- `requestMetadata` 인자는 저장 유스케이스와 Repository에서 같은 순서로 사용한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-metadata.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
