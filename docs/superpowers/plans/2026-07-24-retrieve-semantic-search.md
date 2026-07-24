# 꺼내보기 서버 의미 검색 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 현재 상황을 입력하면 서버가 제목과 메모의 의미를 비교해 관련 있는 인사이트를 개수 제한 없이 반환하는 꺼내보기를 구현한다.

**Architecture:** 저장된 인사이트와 768차원 검색 벡터는 Supabase에서 분리해 관리한다. 인사이트의 제목이나 메모가 바뀌면 데이터베이스 트리거가 검색 준비 작업을 남기고, 꺼내보기 서버가 해당 사용자의 소량 미처리 작업을 보완한 뒤 Gemini 쿼리 벡터와 코사인 유사도를 비교한다. 브라우저에는 Gemini 키와 벡터를 전달하지 않고, 이미 불러온 보관함 데이터에서 서버가 반환한 ID 순서대로 카드를 보여준다.

**Tech Stack:** React 19, TypeScript 6, Express 5, Supabase/PostgreSQL, pgvector, `@google/genai` 2.13.0, Vitest, Supertest, pgTAP

---

## 구현 전에 확인할 것

- 기준 설계: `docs/superpowers/specs/2026-07-24-retrieve-semantic-search-design.md`
- 연결 이슈: [GitHub #23](https://github.com/ppre1ude/hub/issues/23)
- 별도 이슈: 카테고리 생성·이름·색상·삭제 문제는 [GitHub #71](https://github.com/ppre1ude/hub/issues/71)에서 처리한다.
- 설계 문서 브랜치를 `main`에 병합한 뒤 최신 `main`에서 `feat/23-retrieve-semantic-search`를 만든다.
- 실제 Gemini 호출, 운영 Supabase 마이그레이션, 기존 데이터 일괄 변환은 비용과 운영 데이터에 영향을 주므로 실행 직전에 사용자 승인을 받는다.
- `.env.local`에는 따옴표 유무와 관계없이 다음 서버 전용 값을 둔다. 값 자체는 커밋하지 않는다.

```dotenv
GEMINI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 구현 범위

이번 구현에 포함한다.

- 제목과 메모로만 만드는 768차원 문서 벡터
- 로그인 사용자의 인사이트만 대상으로 하는 의미 검색
- 코사인 유사도 `0.59` 이상 결과의 전체 반환
- 제목·메모 변경 시 재처리, 카테고리 변경 시 미처리
- 기존 인사이트의 Batch API 일괄 변환
- 월 500만 원이 아니라 **5달러**에 해당하는 2,500만 입력 토큰의 서비스 내부 사용 한도
- 검색 실패 시 입력을 유지한 재시도 안내
- 검색 준비가 끝나지 않은 일부 인사이트 안내

이번 구현에서 제외한다.

- 카테고리 관리 UI와 데이터 모델
- 카테고리, 도메인, URL을 의미 검색 입력에 포함하는 작업
- 기존 단어 검색과 의미 검색의 RRF 결합
- 생성형 LLM의 설명·요약
- 브라우저 모델 다운로드와 로컬 임베딩
- 결과 6개 제한
- 사용자별 자동 가중치 학습과 검색 결과 평가 UI

## 요청과 데이터 흐름

```text
인사이트 저장·수정
  → public.insights 저장 성공
  → 제목 또는 메모가 달라진 경우에만 embedding_jobs에 작업 등록

꺼내보기 요청
  → Bearer 토큰으로 사용자 확인
  → 그 사용자의 미처리 문서 최대 8개를 서버에서 검색 준비
  → 입력 문장을 Gemini 검색 벡터로 변환
  → 같은 user_id + 같은 모델/입력 버전 + 유사도 0.59 이상 정확 검색
  → 관련도순 인사이트 ID와 남은 준비 건수 반환
  → 브라우저가 이미 가진 보관함 데이터에서 ID 순서대로 카드 표시
```

요청당 미처리 문서 8개 제한은 검색 관련도를 조정하는 값이 아니라, 저장 직후 한 번의 요청이 외부 API를 무제한 호출하지 못하게 하는 운영 안전장치다. 배포 전 일괄 변환으로 정상 상황의 미처리 건수는 0에 가깝게 유지한다. 문서 벡터 생성은 최대 4개씩 병렬 처리해 저장 직후 첫 검색의 지연 증가를 제한한다.

## 파일 구조

```text
server/retrieve/
  gemini_embedding_client.ts       # Gemini 단건 임베딩과 사용량 반환
  retrieve_embedding.ts            # 입력 형식, 상수, 벡터 검증
  insight_embedding_store.ts       # 검색 준비·벡터 검색 저장 경계
  supabase_insight_embedding_store.ts
  insight_retrieve_service.ts      # 인증, 미처리 보완, 쿼리 검색 조합

src/features/retrieve/
  api/browser_retrieve_service.ts  # 로그인 토큰을 포함한 HTTP 요청
  model/retrieve.ts                # 브라우저 계약 타입
  model/use_retrieve.ts            # 요청 경합·오류·결과 상태
  index.ts

scripts/retrieve_backfill/
  submit.ts                        # 미처리 문서를 Batch API에 제출
  apply.ts                         # 완료된 배치 결과를 Supabase에 반영
```

서버 파일은 외부 API·DB·사용 사례를 나누고, 프론트엔드는 사용자 행동인 꺼내보기를 `features/retrieve`가 소유한다. 페이지는 검색 인프라를 알지 못하고 입력과 결과 표시만 맡는다.

### Task 1: 검색 입력 계약과 Gemini SDK 고정

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `server/retrieve/retrieve_embedding.ts`
- Create: `server/retrieve/retrieve_embedding.test.ts`

- [ ] **Step 1: 공식 Gemini SDK 버전을 고정한다**

Run:

```powershell
npm install @google/genai@2.13.0
```

Expected: `package.json`의 `dependencies`에 `@google/genai`가 추가되고 `package-lock.json`이 갱신된다.

- [ ] **Step 2: 제목·메모만 사용하는 입력 계약 테스트를 작성한다**

```ts
import { describe, expect, it } from 'vitest';

import {
  createDocumentEmbeddingText,
  createQueryEmbeddingText,
} from './retrieve_embedding';

describe('꺼내보기 임베딩 입력', () => {
  it('제목과 메모만 문서 입력에 넣는다', () => {
    expect(
      createDocumentEmbeddingText({
        category: '임의 분류',
        memo: '로그인 오류 문구를 사용자가 이해할 수 있게 쓴다',
        title: '오류 안내 작성법',
      })
    ).toBe(
      'title: 오류 안내 작성법 | text: 로그인 오류 문구를 사용자가 이해할 수 있게 쓴다'
    );
  });

  it('메모가 없으면 제목을 본문으로도 사용한다', () => {
    expect(
      createDocumentEmbeddingText({
        category: '개발',
        memo: null,
        title: '오류 안내 작성법',
      })
    ).toBe('title: 오류 안내 작성법 | text: 오류 안내 작성법');
  });

  it('검색 입력에 Gemini 권장 접두사를 붙인다', () => {
    expect(createQueryEmbeddingText(' 로그인 오류를 어떻게 보여주지? ')).toBe(
      'task: search result | query: 로그인 오류를 어떻게 보여주지?'
    );
  });
});
```

- [ ] **Step 3: 테스트가 구현 부재로 실패하는지 확인한다**

Run:

```powershell
npx vitest run server/retrieve/retrieve_embedding.test.ts
```

Expected: `retrieve_embedding` 모듈을 찾지 못해 FAIL.

- [ ] **Step 4: 모델·차원·입력 버전과 순수 함수를 구현한다**

```ts
export const RETRIEVE_EMBEDDING_MODEL = 'gemini-embedding-2';
export const RETRIEVE_EMBEDDING_DIMENSIONS = 768;
export const RETRIEVE_PROJECTION_VERSION = 1;
export const RETRIEVE_SIMILARITY_THRESHOLD = 0.59;
export const RETRIEVE_INDEX_CATCH_UP_LIMIT = 8;
export const RETRIEVE_INDEX_CONCURRENCY = 4;
export const RETRIEVE_MONTHLY_TOKEN_LIMIT = 25_000_000;
export const RETRIEVE_MAX_TOKENS_PER_EMBEDDING = 8_192;

type DocumentSource = {
  category?: string | null;
  memo: string | null;
  title: string;
};

export function createDocumentEmbeddingText(source: DocumentSource) {
  const title = source.title.trim();
  const text = source.memo?.trim() || title;

  return `title: ${title} | text: ${text}`;
}

export function createQueryEmbeddingText(query: string) {
  return `task: search result | query: ${query.trim()}`;
}

export function isEmbeddingVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === RETRIEVE_EMBEDDING_DIMENSIONS &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}
```

`category`는 타입 호환과 “입력에서 제외됨”을 테스트하기 위해 받되 문자열 생성에는 사용하지 않는다.

- [ ] **Step 5: 대상 테스트를 통과시키고 커밋한다**

Run:

```powershell
npx vitest run server/retrieve/retrieve_embedding.test.ts
git add package.json package-lock.json server/retrieve/retrieve_embedding.ts server/retrieve/retrieve_embedding.test.ts
git commit -m "feat: 꺼내보기 임베딩 입력 계약"
```

Expected: 3 tests PASS, 커밋 생성.

### Task 2: 벡터·검색 준비 작업·비용 집계 스키마

**Files:**

- Create: `supabase/migrations/20260724000000_add_semantic_retrieve.sql`
- Create: `supabase/tests/database/semantic_retrieve.test.sql`

- [ ] **Step 1: 핵심 데이터 경계를 검증하는 pgTAP 테스트를 작성한다**

테스트는 아래 여덟 계약만 검증한다.

1. `insight_embeddings.embedding`이 768차원이다.
2. 인사이트 생성과 제목·메모 변경은 작업을 등록하며, 제목·메모에 구분자로 쓰일 수 있는 문자가 있어도 서로 다른 입력은 다른 `source_hash`를 만든다.
3. 카테고리만 바꾸면 작업을 등록하지 않는다.
4. 검색 함수는 전달된 `user_id` 외의 벡터를 반환하지 않는다.
5. `0.59` 미만은 제외하고 동점은 최신 인사이트부터 정렬한다.
6. 일곱 개가 관련 있으면 일곱 개 모두 반환한다.
7. `anon`과 `authenticated`는 `SECURITY DEFINER` 검색·작업·비용 함수를 실행할 수 없다.
8. 남은 월 한도를 각각 소비하는 두 예약 중 첫 예약 뒤 두 번째 예약은 거부된다.

예상 검색 검증의 중심 SQL:

```sql
select extensions.results_eq(
  $$
    select insight_id
    from public.match_insight_embeddings(
      '00000000-0000-4000-8000-000000000001',
      array_fill(0.1::real, array[768])::extensions.vector,
      0.59,
      'gemini-embedding-2',
      1
    )
  $$,
  $$
    select id
    from public.insights
    where user_id = '00000000-0000-4000-8000-000000000001'
    order by updated_at desc, id
  $$,
  '관련 있는 자신의 인사이트를 개수 제한 없이 반환한다'
);
```

- [ ] **Step 2: 로컬 데이터베이스 테스트가 스키마 부재로 실패하는지 확인한다**

Run:

```powershell
supabase db start
supabase test db
```

Expected: `insight_embeddings` 또는 `match_insight_embeddings`가 없어 FAIL.

- [ ] **Step 3: 마이그레이션을 작성한다**

마이그레이션은 다음 객체를 만든다.

```sql
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.insight_embeddings (
  insight_id uuid primary key
    references public.insights(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding extensions.vector(768) not null,
  model_id text not null,
  projection_version smallint not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

create table public.insight_embedding_jobs (
  insight_id uuid primary key
    references public.insights(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null,
  projection_version smallint not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

create table public.embedding_usage_months (
  month_start date primary key,
  used_tokens bigint not null default 0 check (used_tokens >= 0),
  updated_at timestamptz not null default now()
);

create table public.embedding_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  month_start date not null,
  reserved_tokens bigint not null check (reserved_tokens > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
```

네 테이블은 RLS를 활성화하고 `anon`, `authenticated`의 직접 권한을 모두 회수한다. `service_role`에 필요한 권한만 부여한다.

제목·메모 변경 감지 함수는 같은 값으로 업데이트된 경우 작업을 만들지 않는다. `source_hash`는 서버 문서 입력과 같은 규칙으로 제목과 메모를 정규화한 뒤, 각 값의 바이트 길이를 붙인 표현을 SHA-256으로 변환한다. 제목이나 메모에 임의의 구분자가 들어 있어도 서로 다른 두 입력이 같은 해시 원문을 만들지 않는다.

```sql
create function public.get_insight_embedding_source_hash(
  source_title text,
  source_memo text
)
returns text
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select
      btrim(source_title) as title,
      coalesce(nullif(btrim(source_memo), ''), btrim(source_title)) as body
  )
  select encode(
    extensions.digest(
      octet_length(title)::text || ':' || title
        || octet_length(body)::text || ':' || body,
      'sha256'
    ),
    'hex'
  )
  from normalized;
$$;

create function public.enqueue_insight_embedding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.title is not distinct from new.title
    and old.memo is not distinct from new.memo then
    return new;
  end if;

  insert into public.insight_embedding_jobs (
    insight_id,
    user_id,
    model_id,
    projection_version,
    source_hash,
    updated_at
  ) values (
    new.id,
    new.user_id,
    'gemini-embedding-2',
    1,
    public.get_insight_embedding_source_hash(new.title, new.memo),
    now()
  )
  on conflict (insight_id) do update
  set
    user_id = excluded.user_id,
    model_id = excluded.model_id,
    projection_version = excluded.projection_version,
    source_hash = excluded.source_hash,
    updated_at = now();

  return new;
end;
$$;
```

정확 검색 함수는 HNSW나 결과 개수 제한을 두지 않는다.

```sql
create function public.match_insight_embeddings(
  requested_user_id uuid,
  query_embedding extensions.vector(768),
  match_threshold real,
  requested_model_id text,
  requested_projection_version smallint
)
returns table (insight_id uuid, similarity real)
language sql
security definer
set search_path = ''
as $$
  select
    embeddings.insight_id,
    (
      1 - (
        embeddings.embedding
        OPERATOR(extensions.<=>)
        query_embedding
      )
    )::real as similarity
  from public.insight_embeddings as embeddings
  join public.insights as insights
    on insights.id = embeddings.insight_id
  where embeddings.user_id = requested_user_id
    and embeddings.model_id = requested_model_id
    and embeddings.projection_version = requested_projection_version
    and 1 - (
      embeddings.embedding
      OPERATOR(extensions.<=>)
      query_embedding
    ) >= match_threshold
  order by
    embeddings.embedding OPERATOR(extensions.<=>) query_embedding,
    insights.updated_at desc,
    embeddings.insight_id;
$$;

revoke execute on function public.match_insight_embeddings(
  uuid,
  extensions.vector,
  real,
  text,
  smallint
) from public, anon, authenticated;
grant execute on function public.match_insight_embeddings(
  uuid,
  extensions.vector,
  real,
  text,
  smallint
) to service_role;
```

벡터 저장과 해당 버전의 작업 삭제는 `complete_insight_embedding_job` 함수 한 번으로 처리한다. 처리 중 제목·메모가 다시 바뀌면 `source_hash`, `model_id`, `projection_version`이 다른 새 작업은 삭제하지 않는다.

모든 `SECURITY DEFINER` 함수는 생성 직후 `PUBLIC`, `anon`, `authenticated`의 `EXECUTE`를 회수한다. 서버가 직접 호출하는 `list_pending_insight_embeddings`, `complete_insight_embedding_job`, `match_insight_embeddings`, 비용 예약·정산 함수만 `service_role`에 실행 권한을 부여한다. 트리거 함수는 직접 호출 권한을 누구에게도 부여하지 않는다.

월 비용 한도는 `reserve_embedding_usage`가 월 집계 행을 잠근 상태에서 활성 예약을 합산하고, 한도를 넘지 않을 때만 예약 행을 만드는 방식으로 집행한다. 만료된 예약은 실제 최대 사용량으로 보수적으로 확정해 서버 중단이 비용을 누락시키지 않으며, 성공한 호출은 `reconcile_embedding_usage`가 실제 `promptTokenCount`로 정산한다.

- [ ] **Step 4: 기존 인사이트를 검색 준비 대기열에 넣는다**

같은 마이그레이션 마지막에 다음 구문을 둔다.

```sql
insert into public.insight_embedding_jobs (
  insight_id,
  user_id,
  model_id,
  projection_version,
  source_hash
)
select
  id,
  user_id,
  'gemini-embedding-2',
  1,
  public.get_insight_embedding_source_hash(title, memo)
from public.insights
on conflict (insight_id) do update
set
  user_id = excluded.user_id,
  model_id = excluded.model_id,
  projection_version = excluded.projection_version,
  source_hash = excluded.source_hash,
  updated_at = now();
```

- [ ] **Step 5: 데이터베이스 테스트를 통과시키고 커밋한다**

Run:

```powershell
supabase db reset
supabase test db
git add supabase/migrations/20260724000000_add_semantic_retrieve.sql supabase/tests/database/semantic_retrieve.test.sql
git commit -m "feat: 꺼내보기 벡터 저장 구조"
```

Expected: 기존 RLS 테스트와 의미 검색 테스트 모두 PASS.

### Task 3: Gemini 단건 임베딩과 비용 한도

**Files:**

- Create: `server/retrieve/gemini_embedding_client.ts`
- Create: `server/retrieve/gemini_embedding_client.test.ts`

- [ ] **Step 1: 외부 호출 경계의 필수 동작만 테스트한다**

한 테스트 파일에서 다음을 검증한다.

- 모델 `gemini-embedding-2`와 `outputDimensionality: 768` 전달
- 768차원이 아닌 응답 거부
- 0 이상의 정수인 `usageMetadata.promptTokenCount`는 실제 사용량으로 반환
- 토큰 정보가 없으면 호출을 성공으로 처리하되 사용량을 `unavailable`로 반환하고, 음수나 정수가 아닌 값은 거부
- SDK 호출 실패와 잘못된 응답 모두 원문 입력이나 원래 오류 내용을 포함하지 않는 일반 오류로 변환

중심 테스트:

```ts
it('768차원 벡터와 입력 토큰 수를 반환한다', async () => {
  const embedContent = vi.fn().mockResolvedValue({
    embeddings: [{ values: Array(768).fill(0.01) }],
    usageMetadata: { promptTokenCount: 17 },
  });
  const client = createGeminiEmbeddingClient({
    embedContent,
  });

  await expect(client.embed('검색 입력')).resolves.toEqual({
    usage: { kind: 'actual', promptTokens: 17 },
    vector: Array(768).fill(0.01),
  });
  expect(embedContent).toHaveBeenCalledWith({
    config: { outputDimensionality: 768 },
    contents: '검색 입력',
    model: 'gemini-embedding-2',
  });
});
```

- [ ] **Step 2: 구현 부재로 실패하는지 확인한다**

Run:

```powershell
npx vitest run server/retrieve/gemini_embedding_client.test.ts
```

Expected: 모듈 부재로 FAIL.

- [ ] **Step 3: SDK를 감싼 작은 어댑터를 구현한다**

```ts
import { GoogleGenAI } from '@google/genai';

import {
  isEmbeddingVector,
  RETRIEVE_EMBEDDING_DIMENSIONS,
  RETRIEVE_EMBEDDING_MODEL,
} from './retrieve_embedding.js';

export type EmbeddingResult = {
  usage: { kind: 'actual'; promptTokens: number } | { kind: 'unavailable' };
  vector: number[];
};

export type GeminiEmbeddingClient = {
  embed(text: string): Promise<EmbeddingResult>;
};

type EmbedContent = (request: {
  config: { outputDimensionality: number };
  contents: string;
  model: string;
}) => Promise<{
  embeddings?: Array<{ values?: number[] }>;
  usageMetadata?: { promptTokenCount?: number };
}>;

type CreateGeminiEmbeddingClientOptions = {
  embedContent: EmbedContent;
};

export function createGeminiEmbeddingClient({
  embedContent,
}: CreateGeminiEmbeddingClientOptions): GeminiEmbeddingClient {
  return {
    async embed(text) {
      let response: Awaited<ReturnType<EmbedContent>>;

      try {
        response = await embedContent({
          config: { outputDimensionality: RETRIEVE_EMBEDDING_DIMENSIONS },
          contents: text,
          model: RETRIEVE_EMBEDDING_MODEL,
        });
      } catch {
        throw new Error('Gemini embedding request failed');
      }

      const vector = response.embeddings?.[0]?.values;
      const promptTokens = response.usageMetadata?.promptTokenCount;

      if (!isEmbeddingVector(vector)) {
        throw new Error('Gemini embedding response is invalid');
      }

      if (promptTokens === undefined) {
        return { usage: { kind: 'unavailable' }, vector };
      }

      if (!Number.isInteger(promptTokens) || promptTokens < 0) {
        throw new Error('Gemini embedding response is invalid');
      }

      return {
        usage: { kind: 'actual', promptTokens },
        vector,
      };
    },
  };
}

export function createGoogleGeminiEmbeddingClient(apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });

  return createGeminiEmbeddingClient({
    embedContent: (request) => ai.models.embedContent(request),
  });
}
```

테스트와 운영 코드가 같은 `createGeminiEmbeddingClient` 의존성 계약을 사용한다. 운영 조립만 `createGoogleGeminiEmbeddingClient`를 호출해 SDK를 연결한다. SDK 오류는 원래 오류 객체를 `cause`로 연결하거나 다시 던지지 않고 일반 오류로 바꾼다. 오류와 로그에는 입력 문장, 제목, 메모를 넣지 않는다.

- [ ] **Step 4: 비용 한도 정책을 서버 서비스가 사용하도록 타입으로 노출한다**

Gemini 호출 하나가 사용할 수 있는 최대 입력량은 모델 한도인 8,192토큰으로 계산한다. 서버는 외부 호출을 시작하기 전에 `호출 수 × 8,192`를 `reserve_embedding_usage`로 한 번에 예약한다. 데이터베이스 함수는 해당 월의 사용량 행을 잠그고 기존 사용량과 활성 예약을 합산해 2,500만 토큰을 넘지 않을 때만 예약 ID를 반환한다.

호출이 끝나면 `reconcile_embedding_usage`가 예약량을 해제한다. 모든 호출에서 0 이상의 실제 `promptTokenCount`를 확인했으면 그 합계를 사용량으로 확정한다. 하나라도 토큰 수를 반환하지 않았거나 호출 결과를 확인할 수 없으면 `reserved-maximum` 정산을 요청해 예약한 최대량을 사용한 것으로 확정한다. 만료된 예약도 다음 예약 시 최대량 사용으로 전환해 서버 중단 때문에 비용이 누락되지 않게 한다. 별도 토큰 계산 API는 호출하지 않는다.

- [ ] **Step 5: 테스트를 통과시키고 커밋한다**

Run:

```powershell
npx vitest run server/retrieve/gemini_embedding_client.test.ts
git add server/retrieve/gemini_embedding_client.ts server/retrieve/gemini_embedding_client.test.ts
git commit -m "feat: Gemini 검색 벡터 생성"
```

Expected: 대상 테스트 PASS, 커밋 생성.

### Task 4: Supabase 검색 저장소와 꺼내보기 서비스

**Files:**

- Create: `server/retrieve/insight_embedding_store.ts`
- Create: `server/retrieve/supabase_insight_embedding_store.ts`
- Create: `server/retrieve/insight_retrieve_service.ts`
- Create: `server/retrieve/insight_retrieve_service.test.ts`

- [ ] **Step 1: 저장소 계약을 정의한다**

```ts
export type PendingEmbeddingDocument = {
  insightId: string;
  memo: string | null;
  sourceHash: string;
  title: string;
};

export type InsightEmbeddingStore = {
  completeDocument(input: {
    insightId: string;
    sourceHash: string;
    vector: number[];
  }): Promise<void>;
  countPending(userId: string): Promise<number>;
  listPending(
    userId: string,
    limit: number
  ): Promise<PendingEmbeddingDocument[]>;
  match(input: {
    queryVector: number[];
    threshold: number;
    userId: string;
  }): Promise<string[]>;
  reconcileUsage(
    input:
      | {
          promptTokens: number;
          reservationId: string;
          settlement: 'actual';
        }
      | {
          reservationId: string;
          settlement: 'reserved-maximum';
        }
  ): Promise<void>;
  reserveUsage(
    maxTokens: number
  ): Promise<
    | { ok: true; reservationId: string }
    | { ok: false; reason: 'usage-limit-reached' }
  >;
};
```

- [ ] **Step 2: 서비스의 핵심 경계 여섯 개를 실패 테스트로 작성한다**

1. 인증 실패 시 Gemini와 DB를 호출하지 않는다.
2. 빈 문자열과 500자 초과 입력을 거부한다.
3. 문서 입력은 제목·메모만 사용하고 같은 `sourceHash` 작업만 완료한다.
4. 검색은 같은 사용자와 `0.59` 기준으로 요청하며 ID 순서를 보존한다.
5. Gemini 호출 실패 시 기존 인사이트와 작업을 손상시키지 않고 `retrieve-failed`를 반환한다. 토큰 정보만 없는 응답은 검색에 사용하되, 두 경우 모두 예약 최대량으로 정산한다.
6. 동시에 시작한 요청은 원자적 예약 결과에 따라 하나만 Gemini 호출을 시작한다.

대표 성공 흐름:

```ts
it('미처리 문서를 준비한 뒤 관련도순 ID를 반환한다', async () => {
  authenticator.getUserId.mockResolvedValue('user-1');
  store.reserveUsage.mockResolvedValue({
    ok: true,
    reservationId: 'reservation-1',
  });
  store.listPending.mockResolvedValue([
    {
      insightId: 'insight-1',
      memo: '로그인 오류 안내',
      sourceHash: 'a'.repeat(64),
      title: '오류 문구',
    },
  ]);
  embedder.embed
    .mockResolvedValueOnce({
      usage: { kind: 'actual', promptTokens: 10 },
      vector: documentVector,
    })
    .mockResolvedValueOnce({
      usage: { kind: 'actual', promptTokens: 4 },
      vector: queryVector,
    });
  store.match.mockResolvedValue(['insight-1', 'insight-2']);
  store.countPending.mockResolvedValue(0);

  await expect(
    service.retrieve('token', { query: '오류 안내' })
  ).resolves.toEqual({
    insightIds: ['insight-1', 'insight-2'],
    ok: true,
    pendingCount: 0,
  });
  expect(store.reconcileUsage).toHaveBeenCalledWith({
    promptTokens: 14,
    reservationId: 'reservation-1',
    settlement: 'actual',
  });
});
```

동시 요청 검증은 공유된 예약 대역이 첫 요청에만 예약 ID를 반환하도록 구성한다.

```ts
it('동시에 시작해도 예산을 예약한 요청만 Gemini를 호출한다', async () => {
  store.listPending.mockResolvedValue([]);
  store.reserveUsage
    .mockResolvedValueOnce({ ok: true, reservationId: 'reservation-1' })
    .mockResolvedValueOnce({ ok: false, reason: 'usage-limit-reached' });
  embedder.embed.mockResolvedValue({
    usage: { kind: 'actual', promptTokens: 4 },
    vector: queryVector,
  });
  store.match.mockResolvedValue([]);
  store.countPending.mockResolvedValue(0);

  const [accepted, rejected] = await Promise.all([
    service.retrieve('token', { query: '첫 요청' }),
    service.retrieve('token', { query: '두 번째 요청' }),
  ]);

  expect(accepted.ok).toBe(true);
  expect(rejected).toEqual({
    ok: false,
    reason: 'usage-limit-reached',
  });
  expect(embedder.embed).toHaveBeenCalledOnce();
});
```

- [ ] **Step 3: 테스트 실패를 확인한다**

Run:

```powershell
npx vitest run server/retrieve/insight_retrieve_service.test.ts
```

Expected: 서비스 모듈 부재로 FAIL.

- [ ] **Step 4: 서비스 흐름을 구현한다**

```ts
export type InsightRetrieveResult =
  | { insightIds: string[]; ok: true; pendingCount: number }
  | {
      ok: false;
      reason:
        | 'invalid-request'
        | 'permission-denied'
        | 'retrieve-failed'
        | 'usage-limit-reached';
    };
```

구현 순서:

1. 기존 `InsightCaptureAuthenticator`와 같은 Bearer 토큰 인증 경계로 `userId`를 얻는다.
2. 쿼리를 trim하고 길이 1~500을 검증한다.
3. 해당 사용자의 미처리 문서 최대 8개와 쿼리를 준비한다.
4. `(미처리 문서 수 + 쿼리 1개) × 8,192` 토큰을 원자적으로 예약하고, 한도 때문에 실패하면 외부 호출 전 중단한다.
5. 문서는 최대 4개씩 병렬로 Gemini에 보내고, 성공 건만 벡터 저장과 작업 완료를 처리한다.
6. 쿼리 벡터 생성이 실패하면 검색 실패로 반환한다.
7. 모든 호출이 끝나면 예약 ID를 반드시 정산한다. 모든 토큰 수를 확인했으면 `actual`과 실제 합계를, 호출 실패나 `unavailable`이 하나라도 있으면 `reserved-maximum`을 전달한다.
8. `userId`, `0.59`, 모델 ID, 입력 버전으로 정확 검색한다.
9. 남은 미처리 건수와 정렬된 ID를 반환한다.

문서 하나의 실패가 다른 문서까지 취소하지 않게 `Promise.allSettled`를 사용한다. 쿼리 실패는 결과 자체를 만들 수 없으므로 전체 검색 실패다. 성공·실패 응답을 반환하기 전 공통 종료 경로에서 실제 사용량 또는 예약 최대량을 정산한다. 동시에 시작한 요청은 각각 데이터베이스 예약을 먼저 통과해야 하므로 월 사용량 잔여분을 함께 소비할 수 없다.

- [ ] **Step 5: service role Supabase 저장소를 구현한다**

`createSupabaseInsightEmbeddingStore`는 모든 검색 쿼리에 인증으로 얻은 `userId`를 전달한다. `listPending`은 작업과 `insights`를 조인하는 보안 함수, `completeDocument`는 벡터 저장과 같은 `source_hash` 작업 완료 함수, `match`는 `match_insight_embeddings` RPC를 호출한다. 비용은 `reserve_embedding_usage`와 `reconcile_embedding_usage` RPC로 예약·정산한다. 브라우저용 publishable key 클라이언트는 사용하지 않는다.

- [ ] **Step 6: 대상 테스트를 통과시키고 커밋한다**

Run:

```powershell
npx vitest run server/retrieve/insight_retrieve_service.test.ts
git add server/retrieve
git commit -m "feat: 꺼내보기 의미 검색 서비스"
```

Expected: 서비스 테스트 PASS, 커밋 생성.

### Task 5: 인증된 검색 API와 서버 전용 설정

**Files:**

- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Modify: `server/operating_app.ts`
- Modify: `server/operating_app.test.ts`
- Create: `server/retrieve_config.ts`
- Create: `server/retrieve_config.test.ts`
- Create: `api/insights/retrieve.ts`
- Modify: `server/vercel_app.test.ts`

- [ ] **Step 1: POST `/api/insights/retrieve` 계약을 기존 API 테스트에 추가한다**

```ts
it('인증된 꺼내보기 요청을 검색 서비스에 전달한다', async () => {
  retrieveService.retrieve.mockResolvedValue({
    insightIds: ['insight-2', 'insight-1'],
    ok: true,
    pendingCount: 0,
  });

  const response = await request(createApp({ retrieveService }))
    .post('/api/insights/retrieve')
    .set('Authorization', 'Bearer access-token')
    .send({ query: '로그인 오류 안내' });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    insightIds: ['insight-2', 'insight-1'],
    ok: true,
    pendingCount: 0,
  });
});
```

HTTP 상태는 `permission-denied` 401, `invalid-request` 400, `retrieve-failed`와 `usage-limit-reached` 503으로 고정한다. 응답에는 Gemini 오류 본문이나 키를 넣지 않는다.

- [ ] **Step 2: 서버 전용 환경 설정 테스트를 작성한다**

```ts
expect(
  readOptionalRetrieveConfig({
    GEMINI_API_KEY: 'gemini-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    VITE_SUPABASE_URL: 'https://project.supabase.co',
  })
).toEqual({
  geminiApiKey: 'gemini-key',
  serviceRoleKey: 'service-role-key',
  supabaseUrl: 'https://project.supabase.co',
});
```

두 비밀 값이 모두 없으면 `null`을 반환해 저장·보관함 API는 계속 동작하게 한다. 둘 중 하나만 있으면 잘못된 배포 설정이므로 예외를 낸다.

- [ ] **Step 3: 테스트가 새 계약 부재로 실패하는지 확인한다**

Run:

```powershell
npx vitest run server/app.test.ts server/retrieve_config.test.ts server/operating_app.test.ts server/vercel_app.test.ts
```

Expected: 검색 라우트와 설정 모듈 부재로 FAIL.

- [ ] **Step 4: API 조립을 구현한다**

`CreateAppOptions`에 `retrieveService`를 추가하고 기존 8KB JSON 파서를 재사용한다. `createOperatingApp`은 검색 설정이 완전할 때만 Gemini client, service role store, retrieve service를 조립한다. 설정이 없으면 검색 라우트만 503을 반환하고 캡처·메모·health는 정상 동작한다.

Vercel 진입점은 기존 패턴을 그대로 따른다.

```ts
import { createOperatingApp } from '../../server/operating_app.js';

export default createOperatingApp();
```

- [ ] **Step 5: API 대상 테스트를 통과시키고 커밋한다**

Run:

```powershell
npx vitest run server/app.test.ts server/retrieve_config.test.ts server/operating_app.test.ts server/vercel_app.test.ts
git add server/app.ts server/app.test.ts server/operating_app.ts server/operating_app.test.ts server/retrieve_config.ts server/retrieve_config.test.ts api/insights/retrieve.ts server/vercel_app.test.ts
git commit -m "feat: 꺼내보기 서버 API 연결"
```

Expected: 지정한 테스트 PASS, 커밋 생성.

### Task 6: 브라우저 검색 어댑터와 요청 상태

**Files:**

- Create: `src/features/retrieve/model/retrieve.ts`
- Create: `src/features/retrieve/api/browser_retrieve_service.ts`
- Create: `src/features/retrieve/api/browser_retrieve_service.test.ts`
- Create: `src/features/retrieve/model/use_retrieve.ts`
- Create: `src/features/retrieve/model/use_retrieve.test.tsx`
- Create: `src/features/retrieve/index.ts`

- [ ] **Step 1: 브라우저 계약을 정의한다**

```ts
export type RetrieveFailureReason =
  | 'invalid-request'
  | 'permission-denied'
  | 'retrieve-failed'
  | 'usage-limit-reached';

export type RetrieveResult =
  | { insightIds: string[]; ok: true; pendingCount: number }
  | { ok: false; reason: RetrieveFailureReason };

export type RetrieveService = {
  retrieve(query: string): Promise<RetrieveResult>;
};
```

- [ ] **Step 2: HTTP 어댑터의 인증과 응답 검증을 테스트한다**

`browser_insight_capture_service.test.ts`의 세션·fetch 주입 방식을 따라 다음만 검증한다.

- 세션이 없으면 요청하지 않고 `permission-denied`
- Bearer 토큰과 `{query}`를 POST
- ID 배열, `pendingCount`, 실패 사유를 런타임에서 검증
- 네트워크·비정상 JSON은 `retrieve-failed`

- [ ] **Step 3: 요청 경합을 처리하는 훅 테스트를 작성한다**

늦게 끝난 이전 요청이 새 결과를 덮지 않는 한 가지 테스트와, 실패 시 입력과 이전 성공 결과를 유지하는 한 가지 테스트만 둔다.

```ts
expect(result.current.results.map((insight) => insight.id)).toEqual([
  'insight-2',
  'insight-1',
]);
expect(result.current.submittedQuery).toBe('새 검색');
```

- [ ] **Step 4: 실패를 확인한 뒤 어댑터와 훅을 구현한다**

Run:

```powershell
npx vitest run src/features/retrieve/api/browser_retrieve_service.test.ts src/features/retrieve/model/use_retrieve.test.tsx
```

Expected: 새 모듈 부재로 FAIL.

`useRetrieve`는 증가하는 요청 번호를 `useRef`에 저장한다. 성공 응답의 ID를 현재 `Insight[]`의 Map에서 찾아 서버 순서를 유지하며, 삭제되어 로컬에 없는 ID는 건너뛴다. 별도 진행률이나 모델 준비 화면은 만들지 않는다.

- [ ] **Step 5: 대상 테스트를 통과시키고 커밋한다**

Run:

```powershell
npx vitest run src/features/retrieve/api/browser_retrieve_service.test.ts src/features/retrieve/model/use_retrieve.test.tsx
git add src/features/retrieve
git commit -m "feat: 꺼내보기 브라우저 검색 상태"
```

Expected: 지정한 테스트 PASS, 커밋 생성.

### Task 7: 홈 화면을 서버 의미 검색으로 전환

**Files:**

- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`
- Modify: `src/pages/home/ui/home_page.tsx`
- Modify: `src/pages/home/ui/home_page.test.tsx`
- Modify: `src/pages/home/ui/retrieve_results.tsx`
- Modify: `src/pages/home/ui/home_page.css`
- Modify: `src/entities/insight/index.ts`
- Delete: `src/entities/insight/model/retrieve_insights.ts`
- Delete: `src/entities/insight/model/retrieve_insights.test.ts`

- [ ] **Step 1: 대표 사용자 흐름 테스트를 서버 검색 계약으로 바꾼다**

`AuthenticatedWorkspace`에 `retrieveService`를 주입할 수 있게 하고 아래 흐름 하나를 검증한다.

1. “로그인 오류를 어떻게 보여주지?”를 입력한다.
2. 서버가 `['insight-2', 'insight-1']`을 반환한다.
3. 화면 카드가 그 순서로 나온다.
4. 일곱 ID를 반환하면 일곱 카드가 모두 나온다.

기존 `HomePage` 테스트의 `RetrievedInsight`는 `Insight`로 바꾸고, 검색 준비 건수가 있을 때 안내 문구가 나타나는 테스트 한 개를 추가한다.

- [ ] **Step 2: 현재 동기 검색 때문에 테스트가 실패하는지 확인한다**

Run:

```powershell
npx vitest run src/app/authenticated_workspace.test.tsx src/pages/home/ui/home_page.test.tsx
```

Expected: `retrieveService` prop과 `pendingCount` 계약이 없어 FAIL.

- [ ] **Step 3: 홈 조합을 비동기 서비스로 바꾼다**

- `retrieveInsights` import와 `useMemo` 결과 계산을 제거한다.
- `createBrowserRetrieveService`와 `useRetrieve`를 사용한다.
- 폼 제출과 상황 버튼 모두 같은 `retrieve(query)` 함수를 호출한다.
- 성공한 검색에서만 `submittedQuery`와 결과를 교체한다.
- 검색 중에는 진행률·로딩 화면을 표시하지 않는다.
- 실패하면 입력을 유지하고 “꺼내보지 못했어요. 잠시 후 다시 시도해주세요.”를 보여준다.
- `usage-limit-reached`도 자동 단어 검색으로 바꾸지 않고 같은 재시도 가능한 오류로 처리한다.
- `pendingCount > 0`이면 “최근 저장한 일부 인사이트는 검색 준비 중이에요.”만 결과 위에 표시한다.

`RetrieveResults`의 결과 타입은 다음처럼 단순화한다.

```ts
export type RetrieveResultsProps = {
  errorMessage?: string;
  onOpenLibrary: () => void;
  pendingCount: number;
  results: Insight[];
  submittedQuery: string;
};
```

카드는 `InsightGrid insights={results}`로 직접 전달한다.

- [ ] **Step 4: 기존 로컬 꺼내보기 전용 코드를 제거한다**

`retrieve_insights.ts`와 그 테스트를 삭제하고 entity public API의 `retrieveInsights`, `RetrievedInsight` export를 제거한다. `search_insights.ts`는 보관함의 단어 검색에 계속 사용하므로 변경하지 않는다.

- [ ] **Step 5: 대상 테스트를 통과시키고 커밋한다**

Run:

```powershell
npx vitest run src/app/authenticated_workspace.test.tsx src/pages/home/ui/home_page.test.tsx src/features/retrieve
git add src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/pages/home src/entities/insight src/features/retrieve
git commit -m "feat: 꺼내보기 서버 의미 검색 전환"
```

Expected: 대상 테스트 PASS, 6개 제한 없이 서버 ID 순서 표시.

### Task 8: 기존 인사이트 Batch API 일괄 변환

**Files:**

- Create: `scripts/retrieve_backfill/submit.ts`
- Create: `scripts/retrieve_backfill/apply.ts`
- Modify: `package.json`

- [ ] **Step 1: 비용 발생 전 확인만 하는 명령을 만든다**

```json
{
  "scripts": {
    "retrieve:backfill:submit": "tsx --env-file-if-exists=.env.local scripts/retrieve_backfill/submit.ts",
    "retrieve:backfill:apply": "tsx --env-file-if-exists=.env.local scripts/retrieve_backfill/apply.ts"
  }
}
```

`submit.ts --dry-run`은 service role로 미처리 건수만 읽고 제목·메모·키를 출력하지 않는다.

Expected output:

```text
꺼내보기 기존 데이터 변환 대상: 42건
비용이 발생하는 제출은 실행하지 않았습니다.
```

- [ ] **Step 2: Batch 제출 명령을 구현한다**

사용자 승인 뒤 `--confirm`이 있을 때만 실행한다. 인라인 요청의 metadata에는 `insightId`, `sourceHash`, `modelId`, `projectionVersion`만 넣고, 문서 본문은 Task 1의 `createDocumentEmbeddingText`로 만든다.

```ts
const batch = await ai.batches.createEmbeddings({
  config: { displayName: `retrieve-backfill-${new Date().toISOString()}` },
  model: RETRIEVE_EMBEDDING_MODEL,
  src: {
    inlinedRequests: documents.map((document) => ({
      config: { outputDimensionality: RETRIEVE_EMBEDDING_DIMENSIONS },
      contents: [{ parts: [{ text: createDocumentEmbeddingText(document) }] }],
      metadata: {
        insightId: document.insightId,
        modelId: RETRIEVE_EMBEDDING_MODEL,
        projectionVersion: String(RETRIEVE_PROJECTION_VERSION),
        sourceHash: document.sourceHash,
      },
    })),
  },
});
```

명령은 batch 이름과 대상 건수만 출력한다. 원문과 API 키는 출력하지 않는다.

- [ ] **Step 3: Batch 결과 반영 명령을 구현한다**

```powershell
npm run retrieve:backfill:apply -- --batch batches/실제-배치-ID --dry-run
```

dry-run은 상태, 성공 수, 실패 수만 보여준다. 사용자 승인 뒤 `--confirm`을 붙이면 성공 응답의 768차원 벡터와 metadata를 검증하고 `complete_insight_embedding_job`으로 저장한다. 실패 응답의 작업은 대기열에 남긴다. 배치 입력 토큰은 `usageMetadata.promptTokenCount`를 합산해 월 사용량에 반영한다.

- [ ] **Step 4: 비용 없는 검증을 실행한다**

Run:

```powershell
npm run retrieve:backfill:submit -- --dry-run
npx tsc -p tsconfig.node.json --noEmit
```

Expected: 대상 건수만 출력, 타입 검사 PASS. 이 단계에서는 Gemini Batch 작업을 만들지 않는다.

- [ ] **Step 5: 스크립트를 커밋한다**

Run:

```powershell
git add package.json package-lock.json scripts/retrieve_backfill
git commit -m "feat: 꺼내보기 기존 데이터 변환 도구"
```

Expected: 커밋 생성. 실제 Batch 제출과 운영 DB 반영은 커밋 후 별도 승인 단계에서 실행.

### Task 9: 운영 문서와 전체 검증

**Files:**

- Modify: `docs/development-architecture.md`
- Modify: `docs/retrieve.md`
- Modify: `docs/deployment.md`
- Modify: `docs/backlog.md`
- Modify: `docs/checklist.md`

- [ ] **Step 1: 현행 문서에서 로컬 꺼내보기 설명을 교체한다**

`docs/development-architecture.md`의 다음 문장을 제거한다.

```text
검색과 꺼내보기는 원격 목록을 불러온 뒤 도메인 순수 함수로 실행해 저장 인프라와 결정적 랭킹 계약을 분리한다.
```

다음 내용으로 바꾼다.

```text
보관함의 단어 검색은 브라우저가 불러온 목록에서 실행한다. 꺼내보기는 로그인 토큰을 받은 서버가 제목·메모의 Gemini 벡터를 만들고, Supabase가 같은 사용자의 벡터만 비교한다. 브라우저는 서버가 반환한 인사이트 ID를 이미 불러온 보관함 데이터와 연결한다.
```

- [ ] **Step 2: 배포 순서와 복구 기준을 기록한다**

`docs/deployment.md`에 다음 순서를 추가한다.

1. Supabase 마이그레이션 적용
2. `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 Vercel 서버 환경에 저장
3. 앱 배포
4. backfill dry-run으로 건수 확인
5. 사용자 승인 뒤 Batch 제출
6. 완료 확인 뒤 dry-run
7. 사용자 승인 뒤 결과 반영
8. 대기 건수 0과 대표 검색 확인

복구할 때는 프론트에서 자동 단어 검색으로 우회하지 않는다. 검색 API를 비활성화하더라도 보관함 조회·저장 기능은 유지하며, 벡터와 작업 테이블은 원본 인사이트와 분리되어 있으므로 인사이트 데이터를 삭제하지 않는다.

- [ ] **Step 3: 백로그와 체크리스트를 구현 상태에 맞춘다**

- #23의 구현 항목과 배포 전 승인 항목을 구분한다.
- 카테고리 관리는 #71 링크만 남기고 이번 검색 구현 완료로 표시하지 않는다.
- 브라우저 E5, RRF, 생성형 LLM이 운영 경로에 들어가지 않았음을 기록한다.

- [ ] **Step 4: 좁은 검증부터 전체 검증까지 실행한다**

Run:

```powershell
npx vitest run server/retrieve src/features/retrieve src/app/authenticated_workspace.test.tsx src/pages/home/ui/home_page.test.tsx server/app.test.ts server/operating_app.test.ts server/vercel_app.test.ts
npm run test
npm run lint
npm run format:check
npm run build:web
supabase test db
git status --short
```

Expected:

- 새 검색 경계와 기존 전체 Vitest PASS
- lint, format, web build PASS
- 기존 RLS와 의미 검색 pgTAP PASS
- 의도한 파일 외 변경 없음
- `.env.local`, API 키, service role key가 추적 파일과 `dist`에 없음

- [ ] **Step 5: 문서와 최종 정리를 커밋한다**

Run:

```powershell
git add docs/development-architecture.md docs/retrieve.md docs/deployment.md docs/backlog.md docs/checklist.md
git commit -m "docs: 꺼내보기 의미 검색 운영 흐름"
```

Expected: 작업 트리에 사용자 소유의 기존 untracked 파일만 남음.

## 배포 승인 체크포인트

다음 세 작업은 자동으로 진행하지 않는다.

1. 운영 Supabase 마이그레이션
2. Gemini Batch API 제출
3. Batch 결과의 운영 Supabase 반영

각 단계에서 대상 프로젝트, 대상 건수, 예상 비용, 되돌릴 수 있는 범위를 먼저 사용자에게 보고한다. API 키나 service role key의 실제 값은 출력하지 않는다.

## 구현 완료 기준

- 사용자가 표현을 다르게 입력해도 제목·메모 의미가 가까운 인사이트를 찾을 수 있다.
- 관련도 `0.59` 이상이면 6개를 넘어도 모두 반환한다.
- 카테고리, 도메인, URL은 의미 벡터에 들어가지 않는다.
- 다른 사용자의 벡터나 인사이트 ID가 검색 결과에 섞이지 않는다.
- 제목·메모 변경만 재처리되고 카테고리 변경은 재처리되지 않는다.
- Gemini 장애와 사용 한도 도달이 인사이트 저장·보관함 조회를 막지 않는다.
- 브라우저가 모델, 토크나이저, Gemini 키, service role key를 받지 않는다.
- 기존 데이터 일괄 변환과 이후 소량 보완 경로가 모두 동작한다.
- 실험용 합성 평가셋, 하이퍼파라미터 탐색, 브라우저 E5 성능 측정은 새로 만들지 않는다.

## 참고한 공식 문서

- [Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Gemini Batch API](https://ai.google.dev/gemini-api/docs/batch-api)
- [Gemini Embeddings API](https://ai.google.dev/api/embeddings)
- [Supabase Semantic Search](https://supabase.com/docs/guides/ai/semantic-search)
- [Supabase Vector Indexes](https://supabase.com/docs/guides/ai/vector-indexes)
