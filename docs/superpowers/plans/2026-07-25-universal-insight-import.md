# 범용 인사이트 가져오기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 링크 붙여넣기, 범용 파일, Notion 계정 연결로 외부 저장물을 분석하고 확인한 뒤 기존 데이터를 덮어쓰지 않고 원자적으로 가져오며 작업 단위로 되돌릴 수 있게 한다.

**Architecture:** `features/insight-import`가 입력 어댑터 계약, 후보 분석, 사용자 흐름과 브라우저 Supabase 어댑터를 소유한다. 원본 파일은 브라우저 안에서만 파싱하고, Notion OAuth와 Provider 호출은 `server/insight_import` 경계에 둔다. 준비된 작업은 사용자 세션으로 호출하는 Supabase RPC가 현재 중복을 다시 검사해 한 트랜잭션으로 반영하고, 가져오기 작업과 항목 기록으로 멱등성·기록 삭제·안전한 Undo를 제공한다.

**Tech Stack:** React 19, TypeScript 6, Vitest/Testing Library, Express 5/Supertest, Supabase/PostgreSQL/pgTAP, `csv-parse` 7, `htmlparser2` 12, `@zip.js/zip.js` 2, `@notionhq/client` 5, Node `crypto`

---

## 실행 전제와 증분

이 계획은 [승인된 설계](../specs/2026-07-25-universal-insight-import-design.md)를 세 개의 독립 검증 가능한 증분으로 실행한다.

1. **증분 A — 공통 엔진과 링크 붙여넣기:** 준비·미리보기·카테고리 매핑·원자적 반영·기록·Undo의 종단 간 흐름
2. **증분 B — 범용 파일:** 북마크 HTML, CSV, JSON, HTML, Markdown, 일반 텍스트, ZIP
3. **증분 C — Notion OAuth:** 일회성 연결, 재개 가능한 분석, 토큰 철회·삭제

각 증분의 마지막 태스크에서 선택 테스트와 전체 빌드를 통과시킨 뒤 다음 증분으로 이동한다. 기능 브랜치는 최신 `main`에서 `feat/24-universal-insight-import`로 만들고, 현재 문서 worktree의 문서 커밋은 실행 브랜치에 cherry-pick한다.

## 파일 책임 지도

### 공통 feature

| 파일                                                                | 책임                                          |
| ------------------------------------------------------------------- | --------------------------------------------- |
| `src/features/insight-import/model/import_types.ts`                 | 공개 입력·후보·분석·작업·결과 타입            |
| `src/features/insight-import/model/import_limits.ts`                | 모든 어댑터가 공유하는 고정 운영 제한         |
| `src/features/insight-import/model/import_url.ts`                   | 가져오기 전용 HTTP(S), 로컬·사설망 검증       |
| `src/features/insight-import/model/import_adapter.ts`               | 어댑터 계약과 감지 결과                       |
| `src/features/insight-import/model/pasted_text_adapter.ts`          | 붙여넣은 텍스트의 URL 후보 추출               |
| `src/features/insight-import/model/import_analysis.ts`              | 입력 내부 중복, 오류와 컬렉션 요약            |
| `src/features/insight-import/model/insight_import_service.ts`       | 준비·반영·Undo·기록 저장 포트                 |
| `src/features/insight-import/model/use_insight_import.ts`           | 다이얼로그 단계와 비동기 명령 상태            |
| `src/features/insight-import/api/browser_insight_import_service.ts` | 로그인 세션과 Supabase RPC/조회 연결          |
| `src/features/insight-import/ui/insight_import_dialog.tsx`          | 입력 선택부터 결과까지 접근 가능한 다이얼로그 |
| `src/features/insight-import/ui/import_preview.tsx`                 | 요약, 예외 상세, 컬렉션 매핑                  |
| `src/features/insight-import/ui/import_history.tsx`                 | 완료 기록, Undo와 기록 삭제                   |
| `src/features/insight-import/index.ts`                              | feature named public API                      |

### 범용 파일

| 파일                                                           | 책임                                |
| -------------------------------------------------------------- | ----------------------------------- |
| `src/features/insight-import/model/file_adapter_registry.ts`   | 파일별 신뢰도 경쟁과 fallback 선택  |
| `src/features/insight-import/model/bookmark_html_adapter.ts`   | Netscape Bookmark HTML과 폴더 경로  |
| `src/features/insight-import/model/text_file_adapter.ts`       | HTML·Markdown·일반 텍스트 URL       |
| `src/features/insight-import/model/structured_file_adapter.ts` | CSV·JSON 필드 탐지와 명시적 매핑    |
| `src/features/insight-import/model/zip_file_adapter.ts`        | ZIP 사전 검사와 허용 파일 순차 해제 |
| `src/features/insight-import/ui/import_field_mapping.tsx`      | 모호한 URL·제목·메모 필드 선택      |
| `src/features/insight-import/testing/fixtures/**`              | 정상·경계·악성 입력 고정 픽스처     |

### 데이터베이스와 서버

| 파일                                                                    | 책임                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| `supabase/migrations/20260725000000_add_insight_import_jobs.sql`        | 작업·항목 테이블과 RLS                           |
| `supabase/migrations/20260725000100_prepare_insight_import.sql`         | 준비와 DB 중복 재분류 RPC                        |
| `supabase/migrations/20260725000200_commit_insight_import.sql`          | category mapping과 원자적 반영 RPC               |
| `supabase/migrations/20260725000300_undo_insight_import.sql`            | Undo·기록 삭제·만료 정리 RPC                     |
| `supabase/migrations/20260725010000_add_insight_import_connections.sql` | 암호화 OAuth 연결과 서버 전용 정리 RPC           |
| `supabase/migrations/20260725010100_analyze_notion_import.sql`          | Notion 분석 작업의 append·finalize RPC           |
| `supabase/tests/database/insight_imports.test.sql`                      | 원자성, 멱등성, RLS, 기존 데이터 보호, Undo      |
| `server/insight_import/import_server_config.ts`                         | 서버 전용 환경 변수의 전체/부분 설정 검증        |
| `server/insight_import/token_cipher.ts`                                 | AES-256-GCM 암·복호화                            |
| `server/insight_import/notion_client.ts`                                | Notion `2026-03-11` API와 재시도 정책            |
| `server/insight_import/notion_candidate_extractor.ts`                   | Page property와 block에서 표준 후보 생성         |
| `server/insight_import/notion_import_service.ts`                        | OAuth 시작·callback·재개·취소·완료 조정          |
| `server/insight_import/supabase_import_admin_store.ts`                  | callback과 만료 정리용 service-role 저장 경계    |
| `api/imports/notion/callback.ts`                                        | Notion Creator Dashboard에 등록할 HTTPS callback |
| `api/cron/import-cleanup.ts`                                            | Vercel Cron이 호출하는 만료 데이터 정리 진입점   |

### 앱 조합과 문서

| 파일                                             | 책임                                        |
| ------------------------------------------------ | ------------------------------------------- |
| `src/pages/library/ui/library_page.tsx`          | 빈/기존 보관함의 가져오기 진입 버튼만 노출  |
| `src/app/authenticated_workspace.tsx`            | feature 다이얼로그 조합과 목록 새로고침     |
| `src/app/model/use_insight_workspace.ts`         | 가져오기 뒤 원격 인사이트 재조회            |
| `src/app/model/use_category_workspace.ts`        | RPC에서 만든 카테고리 재조회                |
| `android/app/src/main/AndroidManifest.xml`       | Notion 완료 딥링크 수신                     |
| `src/shared/capacitor/notion_import_callback.ts` | Android 시스템 브라우저 복귀 신호           |
| `docs/development-architecture.md`               | 새 feature와 서버 경계 반영                 |
| `docs/deployment.md`                             | OAuth·암호화·Cron 환경 변수와 callback 등록 |
| `docs/tech-stack.md`                             | 실제 도입한 파서와 Notion SDK 기록          |

---

## 증분 A — 공통 엔진과 링크 붙여넣기

### Task 1: 실행 브랜치와 공통 계약 고정

**Files:**

- Create: `src/features/insight-import/model/import_types.ts`
- Create: `src/features/insight-import/model/import_limits.ts`
- Create: `src/features/insight-import/model/import_adapter.ts`
- Create: `src/features/insight-import/index.ts`
- Test: `src/features/insight-import/model/import_types.test.ts`

- [ ] **Step 1: 최신 main에서 격리 worktree 생성**

Run:

```powershell
git fetch origin main
git worktree add ..\hub-import -b feat/24-universal-insight-import origin/main
Set-Location ..\hub-import
$docCommits = git rev-list --reverse origin/main..docs/24-universal-insight-import
git cherry-pick $docCommits
```

Expected: 새 worktree가 `feat/24-universal-insight-import`에 있고 승인 설계와 이 구현 계획 문서 커밋이 적용된다.

- [ ] **Step 2: 프로젝트 문서 전체 숙지와 로컬 DB 준비**

Run:

```powershell
$docs = rg --files docs -g '*.md' | Sort-Object
foreach ($doc in $docs) {
  Get-Content -LiteralPath $doc -Raw -Encoding UTF8 | Out-Null
}
Get-Content -LiteralPath DESIGN.md -Raw -Encoding UTF8 | Out-Null
npx --yes supabase@2.109.1 db start
```

Expected: `docs/`의 모든 Markdown과 `DESIGN.md`를 UTF-8로 읽고 로컬 Supabase stack이 healthy 상태가 된다. 구현자는 출력 억제와 별개로 각 문서의 현재 규칙을 확인한 뒤 코드를 작성한다.

- [ ] **Step 3: 공개 계약의 런타임 검증 테스트 작성**

Create `src/features/insight-import/model/import_types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  createCollectionKey,
  isImportAdapterKey,
  isImportInputKind,
} from './import_types';

describe('가져오기 공개 계약', () => {
  it.each(['pasted-text', 'file', 'connected-account'] as const)(
    '%s 입력 종류를 허용한다',
    (kind) => expect(isImportInputKind(kind)).toBe(true)
  );

  it('알 수 없는 입력과 어댑터를 거부한다', () => {
    expect(isImportInputKind('clipboard')).toBe(false);
    expect(isImportAdapterKey('instagram-scraper')).toBe(false);
  });

  it('컬렉션 경로의 구분 문자를 손실하지 않는 키를 만든다', () => {
    expect(createCollectionKey(['개발 / 학습', 'React'])).toBe(
      '["개발 / 학습","React"]'
    );
  });
});
```

- [ ] **Step 4: 테스트를 실행해 계약이 없어서 실패하는지 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/import_types.test.ts
```

Expected: `Cannot find module './import_types'`로 FAIL.

- [ ] **Step 5: 타입과 제한을 한 곳에 작성**

Create `src/features/insight-import/model/import_limits.ts`:

```ts
export const IMPORT_LIMITS = Object.freeze({
  candidateCount: 10_000,
  collectionDepth: 20,
  fileBytes: 10 * 1024 * 1024,
  memoLength: 200,
  sourceLocationLength: 500,
  titleLength: 500,
  urlLength: 4096,
  zipCompressedBytes: 20 * 1024 * 1024,
  zipEntryBytes: 10 * 1024 * 1024,
  zipEntryCount: 100,
  zipUncompressedBytes: 50 * 1024 * 1024,
});
```

Create `src/features/insight-import/model/import_types.ts` with these exact unions and fields:

```ts
import type { CategoryColorKey } from '@/shared/config/design-system';

export const IMPORT_INPUT_KINDS = [
  'pasted-text',
  'file',
  'connected-account',
] as const;
export type ImportInputKind = (typeof IMPORT_INPUT_KINDS)[number];

export const IMPORT_ADAPTER_KEYS = [
  'pasted-text',
  'bookmark-html',
  'generic-csv',
  'generic-json',
  'generic-html',
  'generic-markdown',
  'generic-text',
  'zip',
  'notion',
] as const;
export type ImportAdapterKey = (typeof IMPORT_ADAPTER_KEYS)[number];

export type ImportInput =
  | { kind: 'connected-account'; connectionId: string }
  | { kind: 'file'; file: File; mappings?: ImportFieldMapping[] }
  | { kind: 'pasted-text'; text: string };

export type ImportWarningCode =
  'missing-title' | 'trimmed-title' | 'trimmed-memo' | 'ambiguous-field';

export type ImportCandidate = {
  candidateId: string;
  capturedAtCandidate: string | null;
  collectionPath: string[];
  explicitMemoCandidate: string | null;
  originalUrl: string;
  sourceLocation: string;
  titleCandidate: string | null;
  warnings: ImportWarningCode[];
};

export type ImportExclusionCode =
  'invalid-url' | 'unsupported-protocol' | 'private-address' | 'limit-exceeded';

export type AnalyzedImportItem = ImportCandidate & {
  classification: 'candidate' | 'excluded' | 'input_duplicate';
  domain: string | null;
  exclusionCode: ImportExclusionCode | null;
  normalizedUrl: string | null;
};

export type PreparedImportItem = Omit<AnalyzedImportItem, 'classification'> & {
  classification: 'new' | 'existing_duplicate' | 'input_duplicate' | 'excluded';
};

export type ImportFieldMapping = {
  memoField: string | null;
  sourceKey: string;
  titleField: string | null;
  urlField: string;
};

export type ImportCollectionTarget =
  | { kind: 'uncategorized' }
  | { categoryId: string; kind: 'existing' }
  | {
      colorKey: CategoryColorKey;
      kind: 'new';
      name: string;
    };

export type ImportCollectionMapping = {
  collectionKey: string;
  target: ImportCollectionTarget;
};

export type ImportJobStatus =
  'analyzing' | 'ready' | 'committing' | 'completed' | 'failed' | 'undone';

export type ImportSummary = {
  createdCount: number;
  duplicateCount: number;
  excludedCount: number;
  inputDuplicateCount: number;
  newCount: number;
  totalCount: number;
};

export type PreparedImport = {
  adapterKey: ImportAdapterKey;
  collections: string[][];
  expiresAt: string;
  id: string;
  items: PreparedImportItem[];
  status: 'ready';
  summary: ImportSummary;
};

export type ImportCommitResult = {
  createdCount: number;
  duplicateCount: number;
  excludedCount: number;
  jobId: string;
};

export type ImportUndoResult = {
  alreadyDeletedCount: number;
  deletedCount: number;
  jobId: string;
  preservedCount: number;
};

export type ImportHistoryEntry = {
  adapterKey: ImportAdapterKey;
  completedAt: string;
  id: string;
  status: 'completed' | 'undone';
  summary: ImportSummary;
  undoResult: ImportUndoResult | null;
};

export type ImportIssuePage = {
  items: PreparedImportItem[];
  nextOrdinal: number | null;
};

export function isImportInputKind(value: unknown): value is ImportInputKind {
  return IMPORT_INPUT_KINDS.includes(value as ImportInputKind);
}

export function isImportAdapterKey(value: unknown): value is ImportAdapterKey {
  return IMPORT_ADAPTER_KEYS.includes(value as ImportAdapterKey);
}

export function createCollectionKey(path: readonly string[]) {
  return JSON.stringify(path);
}
```

Create `src/features/insight-import/model/import_adapter.ts`:

```ts
import type {
  ImportAdapterKey,
  ImportCandidate,
  ImportFieldMapping,
  ImportInput,
} from './import_types';

export type ImportDetection =
  | {
      adapterKey: ImportAdapterKey;
      confidence: number;
      mappingRequests: null;
    }
  | {
      adapterKey: ImportAdapterKey;
      confidence: number;
      mappingRequests: Array<{
        fields: string[];
        sourceKey: string;
        suggested: ImportFieldMapping;
      }>;
    };

export type ImportSourceAdapter = {
  detect(input: ImportInput): Promise<ImportDetection | null>;
  extract(input: ImportInput): Promise<ImportCandidate[]>;
};
```

Create `src/features/insight-import/index.ts` with named type exports only; UI와 service export는 해당 태스크에서 추가한다.

- [ ] **Step 6: 계약 테스트와 포맷 검사**

Run:

```powershell
npm test -- src/features/insight-import/model/import_types.test.ts
npx prettier --check "src/features/insight-import/**/*.{ts,tsx,css}"
```

Expected: 3 tests PASS, Prettier가 모든 대상 파일의 형식을 통과시킨다.

- [ ] **Step 7: 커밋**

```powershell
git add src/features/insight-import
git commit -m "feat: 인사이트 가져오기 공통 계약"
```

### Task 2: 안전한 URL 분석과 붙여넣기 어댑터

**Files:**

- Create: `src/features/insight-import/model/import_url.ts`
- Create: `src/features/insight-import/model/import_url.test.ts`
- Create: `src/features/insight-import/model/pasted_text_adapter.ts`
- Create: `src/features/insight-import/model/pasted_text_adapter.test.ts`
- Create: `src/features/insight-import/model/import_analysis.ts`
- Create: `src/features/insight-import/model/import_analysis.test.ts`

- [ ] **Step 1: 위험 주소와 입력 내부 중복의 실패 테스트 작성**

Create tests that assert these complete cases:

```ts
it.each([
  ['javascript:alert(1)', 'unsupported-protocol'],
  ['data:text/plain,secret', 'unsupported-protocol'],
  ['file:///C:/secret.txt', 'unsupported-protocol'],
  ['ftp://example.com/a', 'unsupported-protocol'],
  ['http://localhost:3000/a', 'private-address'],
  ['http://127.0.0.1/a', 'private-address'],
  ['http://10.0.0.1/a', 'private-address'],
  ['http://172.16.0.1/a', 'private-address'],
  ['http://192.168.0.1/a', 'private-address'],
  ['http://[::1]/a', 'private-address'],
  ['http://[fc00::1]/a', 'private-address'],
] as const)('excludes %s as %s', (url, reason) => {
  expect(analyzeImportUrl(url)).toEqual({ ok: false, reason });
});

it('keeps two URLs but marks the second normalized duplicate', async () => {
  const candidates = await pastedTextAdapter.extract({
    kind: 'pasted-text',
    text: [
      'https://example.com/a?utm_source=x#top',
      '다시 https://example.com/a',
    ].join('\n'),
  });
  const analysis = analyzeImportCandidates(candidates);

  expect(
    analysis.items.map(({ classification, exclusionCode }) => [
      classification,
      exclusionCode,
    ])
  ).toEqual([
    ['candidate', null],
    ['input_duplicate', null],
  ]);
});
```

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/import_url.test.ts src/features/insight-import/model/pasted_text_adapter.test.ts src/features/insight-import/model/import_analysis.test.ts
```

Expected: 세 모듈을 찾지 못해 FAIL.

- [ ] **Step 3: 가져오기 URL 정책 작성**

`import_url.ts`는 `normalizeInsightUrl`을 먼저 호출한 뒤 DNS 조회 없이 문자열만으로 다음을 차단한다.

```ts
const PRIVATE_HOST_NAMES = new Set(['localhost', 'localhost.localdomain']);
const PRIVATE_SUFFIXES = ['.internal', '.local', '.localhost'];

export type ImportUrlResult =
  | {
      domain: string;
      normalizedUrl: string;
      ok: true;
      originalUrl: string;
    }
  | {
      ok: false;
      reason: 'invalid-url' | 'private-address' | 'unsupported-protocol';
    };
```

IPv4는 숫자 4개를 파싱해 `0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`, `172.16/12`, `192.0.0/24`, `192.0.2/24`, `192.168/16`, `198.18/15`, `198.51.100/24`, `203.0.113/24`, `224/4`, `240/4`를 차단한다. IPv6는 `::`, `::1`, `fc00::/7`, `fe80::/10`과 IPv4-mapped 사설 주소를 차단한다. 도메인의 DNS 결과는 분석 중 조회하지 않는다.

- [ ] **Step 4: 붙여넣기 추출기와 순수 분석기 작성**

`pasted_text_adapter.ts`는 전역 대소문자 무시 패턴 `/https?:\/\/[^\s<>"']+/giu`로 모든 URL을 왼쪽부터 찾고, 문장 끝 `.,!;:`와 짝이 없는 닫는 괄호만 제거한다. 후보는 다음 규칙으로 만든다.

```ts
{
  candidateId: `pasted-text:${match.index}`,
  capturedAtCandidate: null,
  collectionPath: [],
  explicitMemoCandidate: null,
  originalUrl,
  sourceLocation: `${lineNumber}번째 줄`,
  titleCandidate: null,
  warnings: ['missing-title'],
}
```

`import_analysis.ts`는 후보 순서를 보존하며 `analyzeImportUrl`을 적용하고, 먼저 나온 동일 `normalizedUrl`만 `candidate`, 이후 항목은 `input_duplicate`와 null exclusion code로 분류한다. URL 오류만 `excluded`와 구체적인 exclusion code를 가진다. 제목은 trim 후 500자, 명시적 메모는 trim 후 200자, source location은 500자, collection path는 20단계로 제한하고 잘린 값에 해당 warning을 추가한다. 반환값은 `{items, collections, summary}`이며 컬렉션은 `createCollectionKey` 기준으로 중복 제거한다.

- [ ] **Step 5: 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/import_url.test.ts src/features/insight-import/model/pasted_text_adapter.test.ts src/features/insight-import/model/import_analysis.test.ts
```

Expected: 위험 프로토콜·사설 주소·문장 URL·입력 내부 중복·필드 길이 테스트가 모두 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add src/features/insight-import/model
git commit -m "feat: 가져오기 URL 분석과 붙여넣기 추출"
```

### Task 3: 가져오기 작업·항목 스키마와 RLS

**Files:**

- Create: `supabase/migrations/20260725000000_add_insight_import_jobs.sql`
- Create: `supabase/tests/database/insight_imports.test.sql`

- [ ] **Step 1: 스키마와 사용자 격리 pgTAP 실패 테스트 작성**

`insight_imports.test.sql`의 첫 묶음은 다음 계약을 검증한다.

```sql
select extensions.has_table(
  'public',
  'insight_import_jobs',
  '가져오기 작업 테이블이 존재한다'
);
select extensions.has_table(
  'public',
  'insight_import_items',
  '가져오기 항목 테이블이 존재한다'
);
select extensions.ok(
  (select relrowsecurity from pg_class
   where oid = 'public.insight_import_jobs'::regclass),
  '가져오기 작업에 RLS가 활성화되어 있다'
);
select extensions.ok(
  (select relrowsecurity from pg_class
   where oid = 'public.insight_import_items'::regclass),
  '가져오기 항목에 RLS가 활성화되어 있다'
);
```

소유자와 다른 사용자를 `auth.users`에 만들고 각 JWT claim으로 전환해 다른 사용자의 작업·항목 조회 결과가 0개인지 검사한다. `anon`은 두 테이블과 모든 RPC를 사용할 수 없어야 한다.

- [ ] **Step 2: DB 테스트를 실행해 테이블 부재 실패 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
```

Expected: `relation "public.insight_import_jobs" does not exist`로 FAIL.

- [ ] **Step 3: 작업 테이블 작성**

Migration에 다음 열과 제약을 정확히 둔다.

```sql
create table public.insight_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_kind text not null
    check (input_kind in ('pasted-text', 'file', 'connected-account')),
  adapter_key text not null
    check (adapter_key in (
      'pasted-text', 'bookmark-html', 'generic-csv', 'generic-json',
      'generic-html', 'generic-markdown', 'generic-text', 'zip', 'notion'
    )),
  status text not null
    check (status in (
      'analyzing', 'ready', 'committing', 'completed', 'failed', 'undone'
    )),
  idempotency_key text not null
    check (idempotency_key ~ '^[0-9a-f]{64}$'),
  total_count integer not null default 0 check (total_count >= 0),
  new_count integer not null default 0 check (new_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  input_duplicate_count integer not null default 0
    check (input_duplicate_count >= 0),
  excluded_count integer not null default 0 check (excluded_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  preserved_count integer not null default 0 check (preserved_count >= 0),
  already_deleted_count integer not null default 0
    check (already_deleted_count >= 0),
  provider_cursor jsonb,
  failure_code text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insight_import_jobs_id_user_key unique (id, user_id),
  constraint insight_import_jobs_user_idempotency_key
    unique (user_id, idempotency_key)
);
```

`insight_import_items`는 `job_id`, `user_id`, `candidate_id`, nullable 후보 필드, `collection_path text[]`, `source_location`, `warnings jsonb`, `classification`, `exclusion_code`, `created_insight_id`, `imported_updated_at`, `selected_category_id`, `ordinal`을 가진다. `(job_id, candidate_id)`와 `(job_id, ordinal)`은 unique이며 `(job_id, user_id)`는 작업의 복합 FK, `selected_category_id/user_id`는 카테고리 복합 FK다. `created_insight_id`는 `insights(id) on delete set null`로 연결한다.

- [ ] **Step 4: 읽기 전용 RLS와 권한 작성**

두 테이블에 RLS를 활성화하고 authenticated SELECT policy를 `auth.uid() = user_id`로 둔다. `anon`과 `authenticated`의 직접 INSERT/UPDATE/DELETE는 revoke한다. 이후 태스크의 `security definer` RPC만 쓰기 권한을 가지며 각 함수는 `set search_path = ''`와 `auth.uid()` 검사를 사용한다.

작업 `updated_at` trigger는 기존 패턴과 같은 `now()`를 사용한다. `(user_id, created_at desc)` 작업 인덱스, `(job_id, classification, ordinal)` 항목 인덱스를 추가한다.

- [ ] **Step 5: 스키마·RLS 테스트 통과 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
npx --yes supabase@2.109.1 db lint --local
```

Expected: 기존 DB 테스트와 새 테이블/RLS 테스트 PASS, schema lint 오류 없음.

- [ ] **Step 6: 커밋**

```powershell
git add supabase/migrations/20260725000000_add_insight_import_jobs.sql supabase/tests/database/insight_imports.test.sql
git commit -m "feat: 가져오기 작업과 항목 저장 구조"
```

### Task 4: 준비 RPC의 멱등성과 DB 중복 재분류

**Files:**

- Create: `supabase/migrations/20260725000100_prepare_insight_import.sql`
- Modify: `supabase/tests/database/insight_imports.test.sql`

- [ ] **Step 1: 준비 행동의 실패 테스트 추가**

pgTAP에 `public.prepare_insight_import(text, text, text, jsonb)`를 호출하는 테스트를 추가한다.

검증 순서는 다음과 같다.

1. 기존 `insights`에 같은 `normalized_url` 한 건을 미리 만든다.
2. 신규, 기존 중복, 입력 내부 중복, 잘못된 URL 항목을 JSON 배열로 전달한다.
3. 작업은 `ready`, 집계는 `total=4/new=1/duplicate=1/input_duplicate=1/excluded=1`이다.
4. 같은 idempotency key로 재호출하면 같은 작업 ID를 반환하고 항목 수가 늘지 않는다.
5. 다른 사용자가 같은 key를 쓰면 별도 작업이 만들어진다.
6. 10,001개 항목, 잘못된 adapter, 4,096자를 넘는 URL, 소유하지 않은 user ID 주입은 안전한 SQLSTATE로 거부된다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
```

Expected: `function public.prepare_insight_import` 부재로 FAIL.

- [ ] **Step 3: 준비 RPC 작성**

함수는 `security definer set search_path = ''`로 작성하고 `current_user_id := (select auth.uid())`가 null이면 `42501`을 발생시킨다. `jsonb_array_elements(p_items) with ordinality`로 최대 10,000개를 읽으며 JSON 필드를 길이·타입·배열 깊이까지 검증한다.

분류 규칙은 다음 SQL 순서를 유지한다.

```sql
case
  when exclusion_code is not null then 'excluded'
  when row_number() over (
    partition by normalized_url order by ordinal
  ) > 1 then 'input_duplicate'
  when exists (
    select 1
    from public.insights
    where user_id = current_user_id
      and normalized_url = parsed.normalized_url
  ) then 'existing_duplicate'
  else 'new'
end
```

이미 같은 `(user_id, idempotency_key)` 작업이 있으면 잠근 뒤 기존 작업 ID와 현재 저장 집계를 반환한다. 신규 작업은 `expires_at = now() + interval '24 hours'`로 만들고 항목을 넣은 뒤 집계를 갱신한다. 반환 JSON은 TypeScript `PreparedImport`의 camelCase와 맞춘다.

함수 실행 권한은 authenticated에만 부여한다.

- [ ] **Step 4: 준비 테스트 통과 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
```

Expected: 준비·멱등성·기존 중복·입력 중복·사용자 격리 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add supabase/migrations/20260725000100_prepare_insight_import.sql supabase/tests/database/insight_imports.test.sql
git commit -m "feat: 가져오기 준비와 중복 재분류 RPC"
```

### Task 5: 카테고리 매핑을 포함한 원자적 반영 RPC

**Files:**

- Create: `supabase/migrations/20260725000200_commit_insight_import.sql`
- Modify: `supabase/tests/database/insight_imports.test.sql`

- [ ] **Step 1: 원자성·보호 정책 실패 테스트 추가**

pgTAP에서 `public.commit_insight_import(uuid, jsonb)`를 검증한다.

필수 시나리오는 다음과 같다.

- 준비 뒤 경쟁 insert가 생긴 URL은 commit에서 중복으로 바뀌고 기존 제목·메모·카테고리가 그대로다.
- 기존 카테고리 매핑은 소유한 카테고리에만 연결된다.
- 새 카테고리 매핑 `{kind:"new",name:"연구",colorKey:"violet-2"}`은 카테고리와 신규 인사이트를 같은 트랜잭션에 만든다.
- 매핑하지 않은 컬렉션은 `category_id is null`이다.
- 다른 사용자 카테고리, 잘못된 color key, 준비 작업에 없는 collection key가 하나라도 있으면 인사이트와 카테고리가 0건 생성된다.
- 같은 완료 작업 재호출은 같은 결과를 반환하며 추가 인사이트가 없다.
- `analyzing`, `committing`, `undone` 작업은 반영하지 않는다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
```

Expected: commit 함수 부재로 FAIL.

- [ ] **Step 3: 반영 RPC 작성**

함수는 소유 작업을 `for update`로 잠그고 `ready`만 `committing`으로 바꾼다. 완료 작업이면 저장한 집계를 바로 반환한다.

내부 `begin … exception when others … end` 블록에서 다음 순서로 처리한다.

1. 매핑 JSON을 검증하고 해당 작업에 실제 존재하는 `collection_path`만 허용한다.
2. 기존 카테고리 ID는 `(id, user_id)`로 검증한다.
3. 새 카테고리 이름은 DB와 같은 trim/공백 축약/소문자 기준으로 중복 제거하고, 현재 최대 `sort_order` 뒤에 결정적 순서로 생성한다. 같은 이름의 카테고리가 경쟁 생성되면 기존 소유 카테고리를 사용한다.
4. 현재 `insights`의 unique constraint를 기준으로 항목을 다시 `existing_duplicate` 또는 `new`로 분류한다.
5. 신규 항목마다 UUID를 미리 만들고 `insights`에 insert한다. 외부 제목이 없으면 `domain`, 있으면 500자 이내 제목과 `title_origin='capture'`, 명시적 메모만 200자 이내로 저장한다.
6. insert한 ID와 실제 `updated_at`을 항목에 기록한다.
7. 작업 집계와 `completed_at=now()`, `expires_at=null`에 해당하는 완료 의미를 기록한다. 이 migration에서 `expires_at`을 nullable로 바꾸고 completed/undone에서 null만 허용하는 check를 함께 둔다.

하위 블록이 실패하면 그 블록의 카테고리·인사이트·항목 갱신을 롤백하고 작업만 `failed`, `failure_code='commit-failed'`, `expires_at=now()+interval '24 hours'`로 남긴 뒤 `{ok:false,reason:"commit-failed"}`를 반환한다. `failed` 작업은 별도 `retry_insight_import` 함수가 `ready`로 되돌린 뒤 같은 commit 함수를 호출하게 해 재시도 가능성을 명시한다.

- [ ] **Step 4: 테스트와 migration lint**

Run:

```powershell
npx --yes supabase@2.109.1 test db
npx --yes supabase@2.109.1 db lint --local
```

Expected: 경쟁 중복, 기존 데이터 무변경, 카테고리 원자성, 실패 롤백, 멱등성 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add supabase/migrations/20260725000200_commit_insight_import.sql supabase/tests/database/insight_imports.test.sql
git commit -m "feat: 가져오기 원자적 반영과 카테고리 매핑"
```

### Task 6: 사용자 수정 보호 Undo, 기록 삭제와 만료 정리

**Files:**

- Create: `supabase/migrations/20260725000300_undo_insight_import.sql`
- Modify: `supabase/tests/database/insight_imports.test.sql`
- Create: `api/cron/import-cleanup.ts`
- Create: `server/insight_import/import_server_config.ts`
- Create: `server/insight_import/import_server_config.test.ts`
- Create: `server/insight_import/import_cleanup_service.ts`
- Create: `server/insight_import/import_cleanup_service.test.ts`
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Modify: `server/operating_app.ts`
- Modify: `server/operating_app.test.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Undo·삭제·만료 실패 테스트 작성**

DB 테스트에 다음 결과를 고정한다.

- 완료 작업이 만든 인사이트 중 `updated_at = imported_updated_at`인 것만 삭제한다.
- 사용자가 제목·메모·카테고리를 바꿔 `updated_at`이 달라진 인사이트는 보존한다.
- 사용자가 먼저 삭제한 인사이트는 `alreadyDeletedCount`로 집계한다.
- 가져오기 전부터 존재한 중복 인사이트는 삭제하지 않는다.
- commit에서 만든 새 카테고리는 Undo 뒤에도 삭제하지 않는다.
- Undo 재호출은 추가 삭제 없이 같은 결과를 반환한다.
- 기록 삭제는 작업과 항목만 cascade 삭제하고 인사이트와 카테고리를 유지한다.
- 24시간이 지난 `ready`, `failed`, `analyzing` 작업은 cleanup 대상이며 `completed`, `undone`은 남는다.

Supertest에는 `CRON_SECRET`이 없거나 틀린 요청은 401, 올바른 Bearer 값은 cleanup service를 한 번 호출하고 개수만 반환하며 예외 세부를 노출하지 않는 테스트를 쓴다.

설정 테스트는 `SUPABASE_SERVICE_ROLE_KEY`와 `CRON_SECRET`이 둘 다 없으면 cleanup service만 비활성화하고, 하나만 있으면 서버 시작을 실패시키며, 둘 다 있으면 server-only config를 반환하는지 검증한다. 두 값은 `VITE_` 접두 변수에서 읽지 않는다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
npm test -- server/app.test.ts server/operating_app.test.ts
```

Expected: Undo/cleanup 함수와 route 부재로 FAIL.

- [ ] **Step 3: DB 함수 작성**

다음 함수를 모두 `security definer set search_path=''`로 작성한다.

```sql
public.undo_insight_import(p_job_id uuid) returns jsonb
public.delete_insight_import_record(p_job_id uuid) returns void
public.cleanup_expired_insight_imports() returns integer
```

Undo와 기록 삭제는 `auth.uid()` 소유권을 검사하고 authenticated만 실행한다. Cleanup은 현재 시각보다 만료된 미완료 작업을 삭제하고 `service_role`만 실행한다. Undo는 `created_insight_id`가 null인 생성 항목을 이미 삭제됨으로, 현재 insight가 있지만 timestamp가 다른 항목을 보존으로 집계한다.

- [ ] **Step 4: Cron API 작성**

`CreateAppOptions`에 다음 포트를 추가한다.

```ts
export type ImportCleanupService = {
  cleanup(): Promise<{ deletedJobCount: number }>;
};
```

`import_cleanup_service.ts`는 service role client로 `cleanup_expired_insight_imports` RPC만 호출한다. client auth option은 `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false`이고 RPC 오류의 details/hint를 응답이나 log로 전달하지 않는다.

`GET /api/cron/import-cleanup`은 `Authorization: Bearer ${CRON_SECRET}`을 constant-time 비교하고, 성공 시 `{ok:true,deletedJobCount}`만 반환한다. 경로·개수 외에 URL, 제목, 파일명과 토큰을 log하지 않는다.

Create `api/cron/import-cleanup.ts`:

```ts
import { createOperatingApp } from '../../server/operating_app.js';

export default createOperatingApp();
```

`vercel.json`에 매일 UTC 18:10, 한국 시간 03:10 cleanup을 추가한다.

```json
"crons": [
  {
    "path": "/api/cron/import-cleanup",
    "schedule": "10 18 * * *"
  }
]
```

- [ ] **Step 5: 테스트 통과 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
npm test -- server/insight_import/import_server_config.test.ts server/insight_import/import_cleanup_service.test.ts server/app.test.ts server/operating_app.test.ts server/vercel_config.test.ts
```

Expected: Undo/기록 삭제/만료 정리와 Cron 인증 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add supabase/migrations/20260725000300_undo_insight_import.sql supabase/tests/database/insight_imports.test.sql api/cron server vercel.json
git commit -m "feat: 가져오기 Undo와 만료 정리"
```

### Task 7: 브라우저 Supabase 서비스와 응답 검증

**Files:**

- Create: `src/features/insight-import/model/insight_import_service.ts`
- Create: `src/features/insight-import/api/browser_insight_import_service.ts`
- Create: `src/features/insight-import/api/browser_insight_import_service.test.ts`
- Modify: `src/features/insight-import/index.ts`

- [ ] **Step 1: 브라우저 서비스 실패 테스트 작성**

Supabase client mock으로 다음 공개 행동을 검증한다.

```ts
it('prepares analyzed candidates with the authenticated RPC', async () => {
  const result = await service.prepare({
    adapterKey: 'pasted-text',
    idempotencyKey: 'a'.repeat(64),
    inputKind: 'pasted-text',
    items: analyzedItems,
  });

  expect(client.rpc).toHaveBeenCalledWith('prepare_insight_import', {
    p_adapter_key: 'pasted-text',
    p_idempotency_key: 'a'.repeat(64),
    p_input_kind: 'pasted-text',
    p_items: expect.any(Array),
  });
  expect(result.ok).toBe(true);
});

it('rejects malformed RPC and history rows', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: null });
  expect(await service.prepare(prepareInput)).toEqual({
    ok: false,
    reason: 'read-failed',
  });

  rpc.mockResolvedValueOnce({
    data: { createdCount: -1, duplicateCount: 0, excludedCount: 0 },
    error: null,
  });
  expect(await service.commit(JOB_ID, [])).toEqual({
    ok: false,
    reason: 'read-failed',
  });

  rpc.mockResolvedValueOnce({
    data: { alreadyDeletedCount: 0, deletedCount: -1, preservedCount: 0 },
    error: null,
  });
  expect(await service.undo(JOB_ID)).toEqual({
    ok: false,
    reason: 'read-failed',
  });

  historyQuery.mockResolvedValueOnce({
    data: [{ id: JOB_ID, status: 'unknown' }],
    error: null,
  });
  expect(await service.listHistory()).toEqual({
    ok: false,
    reason: 'read-failed',
  });
});
```

`deleteRecord`에는 RPC가 `{data:null,error:null}`이면 성공하고 PostgreSQL 오류가 있으면 안전한 reason으로 바뀌는 별도 테스트를 쓴다. Supabase 오류 객체의 `message`, `details`, `hint`가 사용자 결과나 `console`에 포함되지 않는지도 검사한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/api/browser_insight_import_service.test.ts
```

Expected: service 모듈 부재로 FAIL.

- [ ] **Step 3: 저장 포트 작성**

Create `insight_import_service.ts`:

```ts
import type {
  AnalyzedImportItem,
  ImportAdapterKey,
  ImportCollectionMapping,
  ImportCommitResult,
  ImportHistoryEntry,
  ImportInputKind,
  ImportIssuePage,
  ImportUndoResult,
  PreparedImport,
} from './import_types';

export type PrepareImportInput = {
  adapterKey: ImportAdapterKey;
  idempotencyKey: string;
  inputKind: ImportInputKind;
  items: AnalyzedImportItem[];
};

export type ImportServiceFailureReason =
  'invalid-request' | 'permission-denied' | 'read-failed' | 'write-failed';

export type ImportServiceResult<T> =
  { ok: true; value: T } | { ok: false; reason: ImportServiceFailureReason };

export type InsightImportService = {
  commit(
    jobId: string,
    mappings: ImportCollectionMapping[]
  ): Promise<ImportServiceResult<ImportCommitResult>>;
  deleteRecord(jobId: string): Promise<ImportServiceResult<void>>;
  listHistory(): Promise<ImportServiceResult<ImportHistoryEntry[]>>;
  listIssues(
    jobId: string,
    afterOrdinal: number | null
  ): Promise<ImportServiceResult<ImportIssuePage>>;
  prepare(
    input: PrepareImportInput
  ): Promise<ImportServiceResult<PreparedImport>>;
  retry(jobId: string): Promise<ImportServiceResult<PreparedImport>>;
  undo(jobId: string): Promise<ImportServiceResult<ImportUndoResult>>;
};
```

- [ ] **Step 4: Supabase 어댑터 작성**

`browser_insight_import_service.ts`는 주입받은 `SupabaseClient`만 사용한다. RPC 결과와 history row를 `unknown`에서 좁히며 UUID, ISO timestamp, enum, 0 이상의 정수, 후보 필드 길이를 모두 검사한다. malformed 응답은 throw하지 않고 `read-failed`, PostgreSQL `42501`은 `permission-denied`, 입력 검증 SQLSTATE `22023`은 `invalid-request`, 나머지는 `write-failed`로 매핑한다.

History는 다음 select만 수행한다.

```ts
client
  .from('insight_import_jobs')
  .select(
    [
      'id',
      'adapter_key',
      'status',
      'total_count',
      'new_count',
      'duplicate_count',
      'input_duplicate_count',
      'excluded_count',
      'created_count',
      'preserved_count',
      'already_deleted_count',
      'completed_at',
    ].join(',')
  )
  .in('status', ['completed', 'undone'])
  .order('completed_at', { ascending: false })
  .limit(20);
```

`listIssues`는 해당 job의 `classification in ('excluded','input_duplicate')` 항목만 `ordinal > afterOrdinal`, `ordinal` 오름차순, 50개씩 조회한다. RLS와 job ID filter를 함께 사용하고 51번째 row가 있으면 그 전 ordinal을 `nextOrdinal`로 반환한다. 브라우저 기본 factory는 `getSupabaseClient()`를 feature 내부 API 경계에서만 호출한다. `index.ts`는 `createBrowserInsightImportService`, 포트 타입, UI에서 필요한 결과 타입을 named export한다.

- [ ] **Step 5: 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/api/browser_insight_import_service.test.ts
```

Expected: RPC payload, 정상 파싱, 권한·입력·저장 오류, malformed 응답 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add src/features/insight-import
git commit -m "feat: 브라우저 가져오기 저장 서비스"
```

### Task 8: 가져오기 상태 훅과 경합 방지

**Files:**

- Create: `src/features/insight-import/model/use_insight_import.ts`
- Create: `src/features/insight-import/model/use_insight_import.test.tsx`
- Modify: `src/features/insight-import/index.ts`

- [ ] **Step 1: 사용자 흐름 실패 테스트 작성**

`renderHook`으로 다음 상태 전이를 고정한다.

```ts
expect(result.current.stage).toBe('source');

await act(() =>
  result.current.analyzePastedText(
    'https://example.com/a\nhttps://example.com/a'
  )
);
expect(result.current.stage).toBe('preview');
expect(result.current.prepared?.summary).toMatchObject({
  inputDuplicateCount: 1,
  newCount: 1,
});

await act(() => result.current.commit());
expect(result.current.stage).toBe('result');

await act(() => result.current.undo(result.current.result!.jobId));
expect(result.current.result?.undo).toMatchObject({ deletedCount: 1 });
```

추가로 다음을 검증한다.

- 분석 중 두 번째 입력은 시작하지 않는다.
- 사용자가 분석 중 다이얼로그를 닫아도 늦게 도착한 결과가 다시 열지 않는다.
- commit 실패는 preview와 매핑을 보존한다.
- 0개 신규 작업은 commit 버튼을 비활성화할 수 있는 상태다.
- idempotency key는 `adapterKey + NUL + 원본 UTF-8 bytes`의 SHA-256 64자리 소문자 hex다.
- history reload 실패는 현재 preview/result를 지우지 않는다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/use_insight_import.test.tsx
```

Expected: hook 부재로 FAIL.

- [ ] **Step 3: 명시적 상태 기계 작성**

훅의 공개 상태는 다음 union을 사용한다.

```ts
export type InsightImportState =
  | { stage: 'source'; errorMessage: string | null }
  | { stage: 'analyzing'; errorMessage: null }
  | {
      stage: 'preview';
      errorMessage: string | null;
      mappings: ImportCollectionMapping[];
      prepared: PreparedImport;
    }
  | {
      stage: 'committing';
      mappings: ImportCollectionMapping[];
      prepared: PreparedImport;
    }
  | {
      stage: 'result';
      commit: ImportCommitResult;
      prepared: PreparedImport;
      undo: ImportUndoResult | null;
      errorMessage: string | null;
    };
```

비동기 명령마다 증가하는 `operationRevisionRef`를 캡처하고, 완료 시 현재 revision과 다르면 state를 갱신하지 않는다. `analyzePastedText`는 `pastedTextAdapter.extract → analyzeImportCandidates → service.prepare` 순서로 호출한다. service reason은 URL·제목·토큰을 포함하지 않는 고정 한국어 메시지로 매핑한다.

훅은 `setCollectionMapping`, `commit`, `undo`, `deleteRecord`, `refreshHistory`, `reset`, `cancelCurrentOperation`을 반환한다. commit 성공 뒤 `onLibraryChanged`와 `onCategoriesChanged`를 `Promise.all`로 호출한다.

- [ ] **Step 4: 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/use_insight_import.test.tsx
```

Expected: 상태 전이, 경합 취소, 입력 보존, SHA-256 키 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add src/features/insight-import/model src/features/insight-import/index.ts
git commit -m "feat: 인사이트 가져오기 상태 흐름"
```

### Task 9: 링크 붙여넣기 미리보기·결과·기록 UI

**Files:**

- Create: `src/features/insight-import/ui/insight_import_dialog.tsx`
- Create: `src/features/insight-import/ui/insight_import_dialog.css`
- Create: `src/features/insight-import/ui/import_preview.tsx`
- Create: `src/features/insight-import/ui/import_history.tsx`
- Create: `src/features/insight-import/ui/insight_import_dialog.test.tsx`
- Create: `src/features/insight-import/ui/insight_import_dialog_contract.test.ts`
- Modify: `src/features/insight-import/index.ts`

- [ ] **Step 1: 접근 가능한 사용자 행동 테스트 작성**

Testing Library 테스트는 서비스 mock과 실제 hook을 사용해 다음 흐름을 클릭한다.

1. `링크 붙여넣기`를 선택한다.
2. visible label `가져올 링크`가 있는 TextArea에 두 URL을 넣는다.
3. `분석하기` 뒤 보관함 변경 callback이 아직 호출되지 않았음을 확인한다.
4. `신규`, `기존 중복`, `입력 중복`, `제외` 집계를 확인한다.
5. 예외가 있을 때만 `제외된 항목 확인` details가 나타나는지 확인한다.
6. 컬렉션별 Select의 visible label과 기존/새 카테고리 선택을 확인한다.
7. `가져오기` 한 번으로 commit이 한 번 호출되는지 확인한다.
8. commit 직전 경쟁 중복이 없으면 preview 신규 수와 created 수가 같고, 경쟁 중복이 생기면 완료 화면이 “분석 후 다른 경로에서 저장된 1개를 중복으로 제외했어요”라고 실제 재분류를 설명한다.
9. 결과의 `가져오기 되돌리기`를 누르면 confirm 없이 다이얼로그 안의 2단계 확인 문구와 최종 버튼을 거치는지 확인한다.
10. 기록 삭제는 `인사이트는 유지되고 Undo 권한이 사라집니다` 문구를 보여준 뒤 실행한다.

키보드 Tab 순서, `role=status`/`aria-live=polite`, 오류 `role=alert`, 로딩 중 버튼 disabled도 검사한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog.test.tsx src/features/insight-import/ui/insight_import_dialog_contract.test.ts
```

Expected: UI 모듈 부재로 FAIL.

- [ ] **Step 3: source·preview·result 화면 작성**

`InsightImportDialog` props는 다음으로 고정한다.

```ts
export type InsightImportDialogProps = {
  categories: readonly Category[];
  onCategoriesChanged: () => void | Promise<void>;
  onLibraryChanged: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  service?: InsightImportService;
};
```

외부 패키지는 직접 import하지 않고 `Button`, `Modal`, `Select`, `StatusMessage`, `TextArea`, `TextField`를 `@/shared/ui`에서 가져온다. source 화면에는 증분 A에서 `링크 붙여넣기`만 활성화한다. 파일과 Notion 버튼은 숨기며 비활성 자리표시 UI를 노출하지 않는다.

Preview는 긴 목록보다 `<dl>` 집계를 먼저 보여준다. collection path마다 기본값 `uncategorized`인 Select를 두고 `기존 카테고리`, `새 카테고리`, `미분류`를 선택하게 한다. 새 카테고리는 이름과 `CATEGORY_COLOR_KEYS` 기반 색상 Select를 보여주며 `normalizeCategoryInput`이 null이면 commit을 막고 오류를 연결한다.

History는 source 화면의 `최근 가져오기` section에 최신 20건을 보여준다. 각 행의 `제외된 항목 확인`을 펼칠 때만 `listIssues`를 50건씩 호출하고 `nextOrdinal`이 있을 때만 `더 보기`를 노출한다. 기록 삭제 뒤 해당 issue page state도 즉시 지운다. 방금 완료한 result는 state의 `prepared`로 같은 제외 상세를 즉시 보여주고, 다이얼로그를 다시 연 뒤에는 paginated service를 사용한다.

- [ ] **Step 4: White Canvas CSS 계약 작성**

CSS는 token 변수만 사용하고 다음 계약을 만족시킨다.

```css
.insight-import-dialog__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-3);
}

.insight-import-dialog__summary > div {
  border: 1px solid var(--color-ash);
  border-radius: var(--radius-card);
  padding: var(--spacing-4);
  background: var(--color-canvas);
}

@media (max-width: 767px) {
  .insight-import-dialog__summary {
    grid-template-columns: 1fr 1fr;
  }

  .insight-import-dialog__actions {
    align-items: stretch;
    flex-direction: column;
  }
}
```

입력과 버튼은 최소 높이 44px, 반복 animation·shadow·gradient는 사용하지 않는다.

- [ ] **Step 5: UI 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui
```

Expected: 분석 전 무변경, preview, 매핑, commit, result, Undo, 기록 삭제와 접근성 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add src/features/insight-import
git commit -m "feat: 인사이트 가져오기 확인과 결과 UI"
```

### Task 10: 보관함 진입점과 목록 재조회 연결

**Files:**

- Modify: `src/app/model/use_insight_workspace.ts`
- Modify: `src/app/model/use_insight_workspace.test.tsx`
- Modify: `src/app/model/use_category_workspace.ts`
- Modify: `src/app/model/use_category_workspace.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/pages/library/ui/library_page.test.tsx`
- Modify: `src/pages/library/ui/library_page.css`

- [ ] **Step 1: 재조회와 진입점 실패 테스트 작성**

두 workspace hook 테스트에 `reload()` 호출이 repository를 다시 읽어 현재 state를 교체하고, 이전 요청보다 늦은 응답은 무시하는 테스트를 추가한다.

LibraryPage 테스트는 다음 두 상태를 검증한다.

```tsx
expect(
  screen.getByRole('button', { name: '내 저장물 가져오기' })
).not.toBeNull();
```

- 빈 보관함: `링크 저장` primary와 `내 저장물 가져오기` secondary가 함께 보인다.
- 기존 보관함: header 아래 보조 action으로 `내 저장물 가져오기`가 계속 보인다.
- unavailable/loading: 가져오기 버튼을 노출하지 않는다.

AuthenticatedWorkspace 테스트는 버튼 클릭 시 `InsightImportDialog`가 열리고 commit callback 뒤 insight/category repository가 각각 다시 조회되는지 확인한다. 재조회된 가져오기 인사이트가 보관함 category filter와 검색에 나타나고, 홈 `꺼내보기`가 같은 일반 `Insight`로 반환하는 회귀 테스트도 추가한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/app/model/use_insight_workspace.test.tsx src/app/model/use_category_workspace.test.tsx src/app/authenticated_workspace.test.tsx src/pages/library/ui/library_page.test.tsx
```

Expected: reload와 `onOpenImport` 계약 부재로 FAIL.

- [ ] **Step 3: hook에 안정적인 reload 추가**

두 hook은 effect와 public `reload`가 같은 `loadRevisionRef` 기반 함수를 사용하게 한다. unmount 또는 더 최신 load가 시작되면 이전 응답을 버린다. 기존 mutation 경합 계약은 유지한다.

반환값에 다음 named field를 추가한다.

```ts
reloadInsights: () => Promise<void>;
reloadCategories: () => Promise<void>;
```

- [ ] **Step 4: page에는 콜백만 추가하고 app에서 feature 조합**

`LibraryPageProps`에 `onOpenImport: () => void`를 추가한다. page가 feature 내부를 import하지 않게 유지한다. 빈 EmptyState에는 secondary action으로, 기존 보관함에는 `library-page__import-action` Button으로 callback을 연결한다.

`AuthenticatedWorkspace`는 `importOpen` state를 소유하고 `InsightImportDialog`를 `CategoryManager`와 같은 app 조합 위치에 렌더링한다.

```tsx
<InsightImportDialog
  categories={categories}
  onCategoriesChanged={reloadCategories}
  onLibraryChanged={reloadInsights}
  onOpenChange={setImportOpen}
  open={importOpen}
/>
```

- [ ] **Step 5: 선택 테스트와 증분 A 전체 검증**

Run:

```powershell
npm test -- src/features/insight-import src/app src/pages/library server
npx --yes supabase@2.109.1 test db
npm run lint
npx prettier --check <이 PR에서 변경한 Prettier 대상 파일>
npm run build
git diff --check
```

Expected: 모든 선택 Vitest/pgTAP 테스트, lint, format, 웹·확장 build와 diff check PASS.

- [ ] **Step 6: 증분 A 커밋**

```powershell
git add src/app src/pages/library
git commit -m "feat: 보관함 가져오기 진입과 새로고침 연결"
```

증분 A 완료 시 URL 붙여넣기로 분석→미리보기→카테고리 매핑→원자적 반영→Undo를 실제 사용할 수 있어야 한다.

---

## 증분 B — 범용 파일 어댑터

### Task 11: 파일 감지 registry와 안전한 텍스트 디코딩

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/insight-import/model/file_adapter_registry.ts`
- Create: `src/features/insight-import/model/file_adapter_registry.test.ts`
- Create: `src/features/insight-import/model/read_import_file.ts`
- Create: `src/features/insight-import/model/read_import_file.test.ts`
- Modify: `src/features/insight-import/model/use_insight_import.ts`
- Modify: `src/features/insight-import/model/use_insight_import.test.tsx`

- [ ] **Step 1: 필요한 파서만 설치**

Run:

```powershell
npm install csv-parse@7.0.1 htmlparser2@12.0.0 '@zip.js/zip.js@2.8.34'
```

Expected: 세 패키지가 `dependencies`에 추가되고 lockfile만 기계적으로 갱신된다.

- [ ] **Step 2: 크기·인코딩·registry 실패 테스트 작성**

테스트는 다음을 고정한다.

- 10 MiB 이하 UTF-8/UTF-8 BOM 텍스트는 BOM 없이 읽는다.
- UTF-16LE/BE BOM 파일은 정확히 디코드한다.
- BOM 없는 UTF-16처럼 보이거나 replacement character가 생기는 입력은 `unsupported-encoding`으로 막는다.
- 10 MiB 초과 일반 파일과 20 MiB 초과 ZIP은 `file-too-large`로 읽지 않는다.
- registry는 confidence가 큰 adapter를 고르고 동률이면 `bookmark-html → structured → generic text`의 등록 순서를 따른다.
- 전용 adapter extract가 `unsupported-structure`를 반환한 경우에만 generic fallback을 한 번 시도한다. 제한 초과·손상 오류는 fallback하지 않는다.

- [ ] **Step 3: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/read_import_file.test.ts src/features/insight-import/model/file_adapter_registry.test.ts
```

Expected: 파일 reader와 registry 모듈 부재로 FAIL.

- [ ] **Step 4: 안전한 읽기와 registry 작성**

`read_import_file.ts`의 오류 union을 고정한다.

```ts
export class ImportFileError extends Error {
  constructor(
    readonly code:
      | 'file-too-large'
      | 'unsupported-encoding'
      | 'unsupported-structure'
      | 'corrupted-file'
      | 'limit-exceeded'
  ) {
    super(code);
    this.name = 'ImportFileError';
  }
}
```

`readTextFile(file)`은 먼저 size를 검사하고 `arrayBuffer()` 한 번만 읽는다. BOM 기준 UTF-8/UTF-16을 디코드하며 BOM이 없으면 fatal UTF-8 `TextDecoder`만 허용한다. 원본 byte와 전체 text를 log하거나 서버에 전달하지 않는다.

`file_adapter_registry.ts`는 `detectFileInput(file, adapters)`와 `extractFileCandidates(input, adapters)`를 제공한다. confidence는 0~1 유한수만 허용하며 가장 높은 결과를 선택한다. adapter가 하나 이상의 `mappingRequests`를 반환하면 extract를 호출하지 않고 UI에 모든 field mapping request를 반환한다.

- [ ] **Step 5: hook에 파일 분석 진입 추가**

`useInsightImport`에 다음 명령을 추가한다.

```ts
analyzeFile(file: File, mappings?: ImportFieldMapping[]): Promise<void>;
```

idempotency hash는 adapter key, `sourceKey`로 정렬한 mapping JSON, 원본 file bytes를 순서대로 넣는다. File 객체와 원본 bytes는 hook state나 Supabase payload에 저장하지 않고 hash와 표준 후보만 넘긴다.

- [ ] **Step 6: 테스트와 커밋**

Run:

```powershell
npm test -- src/features/insight-import/model
```

Expected: 디코딩, 제한, 감지 우선순위, fallback, hook 경합 테스트 PASS.

```powershell
git add package.json package-lock.json src/features/insight-import/model
git commit -m "feat: 가져오기 파일 감지와 안전한 읽기"
```

### Task 12: 북마크 HTML과 HTML·Markdown·텍스트 어댑터

**Files:**

- Create: `src/features/insight-import/model/bookmark_html_adapter.ts`
- Create: `src/features/insight-import/model/bookmark_html_adapter.test.ts`
- Create: `src/features/insight-import/model/text_file_adapter.ts`
- Create: `src/features/insight-import/model/text_file_adapter.test.ts`
- Create: `src/features/insight-import/testing/fixtures/chrome_bookmarks.html`
- Create: `src/features/insight-import/testing/fixtures/firefox_bookmarks.html`
- Create: `src/features/insight-import/testing/fixtures/malicious_links.html`
- Create: `src/features/insight-import/testing/fixtures/links.md`
- Create: `src/features/insight-import/testing/fixtures/links.txt`

- [ ] **Step 1: 익명화 fixture와 계약 테스트 작성**

Chrome fixture는 다음 구조를 포함한다.

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3 ADD_DATE="1770000000">개발</H3>
  <DL><p>
    <DT><H3>React / 학습</H3>
    <DL><p>
      <DT><A HREF="https://example.com/react?utm_source=chrome" ADD_DATE="1770000100">React 문서</A>
      <DT><A HREF="javascript:alert(1)">위험 링크</A>
    </DL><p>
  </DL><p>
</DL><p>
```

테스트는 `React 문서`, `['개발','React / 학습']`, Unix 초→ISO capturedAt, sourceLocation을 검증한다. `script`, `iframe`, `img src`, inline event handler가 있는 malicious fixture를 파싱할 때 global fetch, DOM 삽입, script 실행이 0회인지 검사한다.

Markdown fixture는 `[제목](URL)`, angle URL, 일반 문장 URL을 포함하고 같은 문자 위치 URL을 한 번만 추출한다. 일반 텍스트는 문장 안 여러 URL과 줄 번호를 검증한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/bookmark_html_adapter.test.ts src/features/insight-import/model/text_file_adapter.test.ts
```

Expected: adapter 부재로 FAIL.

- [ ] **Step 3: inert SAX 방식 북마크 파서 작성**

`htmlparser2.Parser`의 `onopentag`, `ontext`, `onclosetag` callback만 사용하고 DOM을 만들지 않는다. `H3` text를 다음 `DL`의 폴더명으로 push하고 해당 `DL` 종료 시 pop한다. `A`의 `href`, text, `add_date`만 읽는다. `script`, `style`, `iframe`, `embed`, `object`, media tag의 내용과 속성은 후보로 사용하지 않는다.

감지 조건은 앞 4 KiB 안의 `NETSCAPE-Bookmark-file-1`과 `HREF`이며 confidence `1`. 다른 브라우저가 같은 표준을 쓰면 제품 서비스명과 무관하게 처리한다.

- [ ] **Step 4: 범용 HTML·Markdown·텍스트 파서 작성**

HTML은 같은 SAX parser로 `<a href>`의 href와 text만 읽고, text node의 HTTP(S) URL도 추출한다. URL 속성 외의 `src`, `action`, `poster`, CSS URL은 후보로 만들지 않는다. Markdown은 inline link와 autolink를 먼저 추출하고 전체 text URL을 보충한다. Text는 Task 2의 다중 URL 추출 규칙을 재사용한다.

후보 ID는 `${adapterKey}:${byteOrCharacterOffset}`이고 sourceLocation은 파일명 대신 `HTML 링크 3`, `Markdown 12번째 줄`, `7번째 줄`처럼 개인정보가 적은 위치만 쓴다.

- [ ] **Step 5: 테스트 통과와 커밋**

Run:

```powershell
npm test -- src/features/insight-import/model/bookmark_html_adapter.test.ts src/features/insight-import/model/text_file_adapter.test.ts
```

Expected: Chrome/Firefox형 Netscape HTML, 안전한 HTML, Markdown, text, 악성 tag 무실행 테스트 PASS.

```powershell
git add src/features/insight-import
git commit -m "feat: 북마크와 범용 텍스트 파일 어댑터"
```

### Task 13: CSV·JSON 구조 탐지와 명시적 필드 매핑

**Files:**

- Create: `src/features/insight-import/model/structured_file_adapter.ts`
- Create: `src/features/insight-import/model/structured_file_adapter.test.ts`
- Create: `src/features/insight-import/ui/import_field_mapping.tsx`
- Create: `src/features/insight-import/ui/import_field_mapping.test.tsx`
- Create: `src/features/insight-import/testing/fixtures/links.csv`
- Create: `src/features/insight-import/testing/fixtures/links.json`
- Create: `src/features/insight-import/testing/fixtures/ambiguous_links.csv`
- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx`
- Modify: `src/features/insight-import/ui/insight_import_dialog.test.tsx`

- [ ] **Step 1: 자동 탐지와 모호성 실패 테스트 작성**

CSV fixture는 quoted comma, embedded newline, 빈 행, 한글 header를 포함한다. JSON fixture는 top-level array와 `{items:[...]}` 두 구조, row 안의 `{resource:{url,title}}` 중첩 object를 각각 검증한다.

필드 점수 계약을 테스트로 고정한다.

```ts
const URL_FIELD_NAMES = ['url', 'uri', 'link', 'href', '주소', '링크'];
const TITLE_FIELD_NAMES = ['title', 'name', 'label', '제목', '이름'];
const MEMO_FIELD_NAMES = ['memo', 'note', 'notes', '메모', '노트'];
```

최대 100개 표본에서 비어 있지 않은 값 중 80% 이상이 `analyzeImportUrl().ok`이면 URL 값 필드다. 이름 점수와 값 점수를 합쳐 URL 필드가 하나면 자동 선택하고, 최고 점수 차가 0.1 미만이거나 URL 필드가 둘 이상이면 mapping request를 반환한다. 제목·메모는 자동 제안만 하며 사용자가 바꿀 수 있다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/structured_file_adapter.test.ts src/features/insight-import/ui/import_field_mapping.test.tsx
```

Expected: parser와 UI 부재로 FAIL.

- [ ] **Step 3: CSV와 JSON 레코드 정규화 작성**

CSV는 `csv-parse/sync`를 다음 옵션으로 호출한다.

```ts
parse(text, {
  bom: true,
  columns: true,
  max_record_size: IMPORT_LIMITS.fileBytes,
  relax_column_count: false,
  skip_empty_lines: true,
  trim: false,
});
```

중복 header, 열 개수 불일치, object가 아닌 JSON row, 10,000개 초과 row는 파일 단위 오류다. JSON은 top-level array 또는 정확히 하나의 array property를 가진 object만 자동 처리한다. 두 개 이상의 array property가 있으면 파일 구조를 확정하지 않고 오류로 안내한다. Row 안의 중첩 object는 scalar leaf를 RFC 6901 JSON Pointer(`/resource/url`) field key로 평탄화하며, 중첩 array와 object 자체를 URL/title/memo 문자열로 변환하지 않는다.

직접 선택한 파일의 `sourceKey`는 `file`, ZIP entry는 정규화한 entry path를 사용한다. 명시적 mapping 뒤 각 row는 URL을 필수, 제목·메모를 선택 필드로 변환한다. 컬렉션 필드는 1차 계약에 없으므로 추측하지 않는다. sourceLocation은 `CSV 12번째 행`, `JSON items[11]`로 만든다.

- [ ] **Step 4: 필드 매핑 UI 작성**

`ImportFieldMapping`은 mapping request마다 source label과 visible label `URL 필드`, `제목 필드`, `메모 필드` 세 Select를 한 화면에 렌더링한다. URL은 필수이며 제목·메모에는 `사용하지 않음` 옵션을 둔다. ZIP 안에 모호한 CSV/JSON이 여러 개면 `sourceKey`별 field group을 모두 보여주고 사용자는 한 번의 `계속`으로 제출한다. 같은 schema와 선택은 재사용한다. 사용자가 `계속`을 누르면 같은 File을 다시 읽는 대신 hook이 분석 중에만 보관한 `File` 참조로 `analyzeFile(file, mappings)`을 호출하고, 완료·취소·닫기 시 참조를 즉시 지운다.

선택한 설명/caption을 memo로 자동 승격하지 않으며 memo는 사용자가 명시적으로 선택한 필드만 전달한다.

- [ ] **Step 5: 테스트 통과와 커밋**

Run:

```powershell
npm test -- src/features/insight-import/model/structured_file_adapter.test.ts src/features/insight-import/ui/import_field_mapping.test.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx
```

Expected: CSV quoting, JSON shape, 자동 선택, 모호한 필드 1회 매핑, 명시적 memo 테스트 PASS.

```powershell
git add src/features/insight-import
git commit -m "feat: CSV와 JSON 필드 매핑 가져오기"
```

### Task 14: ZIP 사전 검사와 파일 UI 완성

**Files:**

- Create: `src/features/insight-import/model/zip_file_adapter.ts`
- Create: `src/features/insight-import/model/zip_file_adapter.test.ts`
- Create: `src/features/insight-import/model/import_adapter_contract.test.ts`
- Create: `src/features/insight-import/testing/fixtures/create_zip_fixtures.ts`
- Modify: `src/features/insight-import/model/file_adapter_registry.ts`
- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx`
- Modify: `src/features/insight-import/ui/insight_import_dialog.test.tsx`
- Modify: `src/features/insight-import/ui/insight_import_dialog.css`

- [ ] **Step 1: ZIP 공격 회귀 테스트 작성**

테스트 안에서 `ZipWriter`로 다음 archive를 메모리에 만든다.

- 정상: `bookmarks.html`, `export/links.csv`, `notes/links.md`
- 경로 이탈: `../outside.txt`, `folder/../../outside.txt`, `C:\outside.txt`, `/absolute.txt`
- NUL과 역슬래시 혼합 경로
- nested `inner.zip`
- Unix external attribute가 symbolic link인 entry
- password로 암호화된 entry
- 101개 파일
- 단일 entry 10 MiB 초과
- 합계 uncompressed 50 MiB 초과
- 후보 합계 10,000개 초과

각 악성 ZIP은 어느 entry도 추출 adapter에 전달하지 않고 파일 단위 오류가 되는지 검사한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/model/zip_file_adapter.test.ts
```

Expected: adapter 부재로 FAIL.

- [ ] **Step 3: 중앙 디렉터리 사전 검사 작성**

`ZipReader(new BlobReader(file))`로 `getEntries()`한 뒤 어떤 `getData()`도 호출하기 전에 모든 entry를 검사한다.

```ts
function isUnsafeZipPath(filename: string) {
  const normalized = filename.replaceAll('\\', '/');
  return (
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    /^[a-z]:\//iu.test(normalized) ||
    normalized.split('/').some((segment) => segment === '..')
  );
}
```

허용 확장자는 `.csv`, `.json`, `.html`, `.htm`, `.md`, `.markdown`, `.txt`다. `.zip`은 중첩 압축으로 즉시 거부한다. directory는 건너뛴다. `entry.encrypted`는 password 입력을 요청하지 않고 거부한다. `entry.unixMode`의 file type bits가 `0o120000`이면 symlink로 거부한다. entry 수, 각 `uncompressedSize`, 전체 합계와 compressed file size를 모두 사전 검사한다.

사전 검사가 끝난 뒤 허용 entry를 하나씩 byte-counting `WritableStream<Uint8Array>`에 추출한다. stream은 실제 단일 entry가 10 MiB 또는 누적 실제 해제량이 50 MiB를 넘는 순간 abort해 중앙 디렉터리의 거짓 크기도 차단한다. 완료한 entry의 chunk만 Blob으로 묶어 하위 registry로 넘기고 처리 직후 chunk와 Blob 참조를 버린다. archive path를 candidate collection path 앞에 붙이지 않고 `sourceLocation`에만 `ZIP export/links.csv · CSV 3번째 행`처럼 보존한다.

- [ ] **Step 4: 파일 선택 UI 활성화**

source 화면에 visible label `가져올 파일`이 있는 input을 추가한다.

```tsx
<input
  accept=".csv,.json,.html,.htm,.md,.markdown,.txt,.zip"
  aria-describedby={fileHelpId}
  disabled={isBusy}
  onChange={handleFileChange}
  type="file"
/>
```

안내에는 지원 형식, 원본 파일이 서버에 업로드되지 않음, 10 MiB 일반 파일/20 MiB ZIP 제한을 표시한다. 오류는 `파일이 너무 큽니다`, `손상되었거나 지원하지 않는 구조입니다`, `안전하지 않은 ZIP입니다`처럼 복구 행동이 있는 고정 문구로 매핑한다.

- [ ] **Step 5: 증분 B 전체 검증**

`import_adapter_contract.test.ts`는 pasted text, bookmark HTML, generic HTML, Markdown, text, CSV, JSON, ZIP adapter를 같은 parameterized suite에 넣고 다음 공통 계약을 검증한다.

- 같은 input을 두 번 추출하면 candidate 순서와 `candidateId`가 같다.
- 모든 candidate가 `originalUrl`, nullable title/memo/time, 20단계 이하 collection path, 비어 있지 않은 source location, warning enum만 가진다.
- adapter는 Supabase, fetch, DOM insertion과 외부 URL request를 호출하지 않는다.
- 10,000개 limit을 넘으면 잘라서 성공하지 않고 명시적 `limit-exceeded` 파일 오류를 반환한다.

Run:

```powershell
npm test -- src/features/insight-import
npm run lint
npm run format:check
npm run build
git diff --check
```

Expected: 정상·악성 fixture, 파일 UI, 기존 URL 흐름, lint, format, build PASS. 테스트와 네트워크 mock에서 원본 파일 byte가 Supabase RPC payload에 없는지 확인된다.

- [ ] **Step 6: 증분 B 커밋**

```powershell
git add src/features/insight-import
git commit -m "feat: 안전한 ZIP과 범용 파일 가져오기"
```

증분 B 완료 시 Chrome을 포함한 Netscape Bookmark HTML과 지원 파일을 서비스명 선택 없이 자동 감지해 공통 preview와 commit으로 보낼 수 있어야 한다.

---

## 증분 C — Notion OAuth 어댑터

### Task 15: Notion SDK, 서버 전용 설정과 AES-256-GCM

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `server/insight_import/import_server_config.ts`
- Modify: `server/insight_import/import_server_config.test.ts`
- Create: `server/insight_import/token_cipher.ts`
- Create: `server/insight_import/token_cipher.test.ts`
- Modify: `server/operating_app.ts`
- Modify: `server/operating_app.test.ts`
- Modify: `scripts/verify_client_bundle.ts`
- Modify: `scripts/verify_client_bundle.test.ts`

- [ ] **Step 1: 공식 Notion SDK 설치**

Run:

```powershell
npm install @notionhq/client@5.23.2
```

Expected: SDK가 production dependency에 추가된다.

- [ ] **Step 2: 설정과 암호화 실패 테스트 작성**

Task 6의 cleanup 설정에 다음 Notion 설정을 확장한다.

```text
IMPORT_APP_ORIGIN
IMPORT_TOKEN_ENCRYPTION_KEY
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_REDIRECT_URI
```

테스트는 cleanup만 완전하게 설정된 경우 URL/file import는 활성 상태로 유지하고 Notion만 `undefined`, Notion 변수 일부만 있으면 안전한 설정 오류, 모두 유효하면 parsed Notion config를 반환하는지 검증한다. origin과 redirect URI는 HTTPS만 허용하되 `http://localhost`와 `http://127.0.0.1`은 development에서 허용한다. service role key와 client secret은 `VITE_` 이름으로 주어지면 거부한다.

Cipher 테스트는 다음을 검증한다.

```ts
const encrypted = cipher.encrypt('secret-token', {
  connectionId: CONNECTION_ID,
  provider: 'notion',
  userId: USER_ID,
});

expect(encrypted).toMatchObject({ keyVersion: 1 });
expect(encrypted.ciphertext).not.toContain('secret-token');
expect(cipher.decrypt(encrypted, aad)).toBe('secret-token');
expect(() => cipher.decrypt(encrypted, otherUserAad)).toThrow(
  '토큰을 복호화하지 못했습니다.'
);
```

같은 평문을 두 번 암호화한 nonce와 ciphertext가 다른지, 잘못된 31/33 byte key, 변조 ciphertext/tag를 거부하는지도 검사한다.

- [ ] **Step 3: 실패 확인**

Run:

```powershell
npm test -- server/insight_import/import_server_config.test.ts server/insight_import/token_cipher.test.ts
```

Expected: token cipher 부재와 아직 확장되지 않은 Notion 설정 계약으로 FAIL.

- [ ] **Step 4: 설정 파서와 cipher 작성**

`IMPORT_TOKEN_ENCRYPTION_KEY`는 base64 decode 결과가 정확히 32 bytes여야 한다. `token_cipher.ts`는 Node `createCipheriv('aes-256-gcm', key, randomBytes(12))`, `setAAD(Buffer.from(JSON.stringify(aad)))`, 16 byte auth tag를 사용한다.

저장 객체는 다음과 같다.

```ts
export type EncryptedToken = {
  authTag: string;
  ciphertext: string;
  keyVersion: 1;
  nonce: string;
};
```

세 byte 값은 base64 문자열로 분리한다. 오류에는 토큰, connection ID, crypto 내부 메시지를 포함하지 않는다.

`createOperatingApp`은 import 설정이 없으면 기존 health/capture/memo 기능을 그대로 조립한다. 일부만 설정된 production 환경은 시작 시 실패해 잘못 구성된 OAuth를 노출하지 않는다.

- [ ] **Step 5: 번들 secret 회귀 범위 확장**

`verify_client_bundle`이 다음 marker 이름과 실제 test secret 값을 dist에서 거부하도록 추가한다.

```ts
[
  'SUPABASE_SERVICE_ROLE_KEY',
  'NOTION_CLIENT_SECRET',
  'IMPORT_TOKEN_ENCRYPTION_KEY',
  'CRON_SECRET',
];
```

서버 파일 문자열 자체는 검사 대상이 아니며 browser build 산출물만 검사한다.

- [ ] **Step 6: 테스트와 커밋**

Run:

```powershell
npm test -- server/insight_import server/operating_app.test.ts scripts/verify_client_bundle.test.ts
npm run build:web
```

Expected: 설정·암호화·변조·secret bundle 테스트 PASS.

```powershell
git add package.json package-lock.json server scripts
git commit -m "feat: Notion 연결 서버 설정과 토큰 암호화"
```

### Task 16: 일회성 OAuth 연결 스키마와 서버 저장소

**Files:**

- Create: `supabase/migrations/20260725010000_add_insight_import_connections.sql`
- Modify: `supabase/tests/database/insight_imports.test.sql`
- Create: `server/insight_import/supabase_import_admin_store.ts`
- Create: `server/insight_import/supabase_import_admin_store.test.ts`

- [ ] **Step 1: state·token 보존 실패 테스트 작성**

pgTAP에 다음 계약을 추가한다.

- `insight_import_connections`에 RLS가 켜져 있고 사용자는 자신의 status/workspace name만 조회한다.
- authenticated와 anon은 token, nonce, tag 열을 직접 조회할 수 없다. authenticated에는 공개 view가 참조하는 비민감 base column과 `my_insight_import_connections` view SELECT만 grant하고 secret column 권한은 revoke한다.
- state hash는 unique, 정확히 64자리 hex, 만료는 생성 후 10분 이하다.
- pending state는 한 번만 `exchanging`으로 바뀌며 두 번째 consume은 결과가 없다.
- connected token은 완료·취소 시 삭제되고 status가 바뀐다.
- 24시간 만료 cleanup은 token/미완료 job/items를 삭제한다.

Admin store 테스트는 service-role client mock으로 insert, consume, encrypted token 저장, status 조회, delete를 검증하고 `.select('*')`를 사용하지 않는지 확인한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db
npm test -- server/insight_import/supabase_import_admin_store.test.ts
```

Expected: connection relation과 store 부재로 FAIL.

- [ ] **Step 3: connection migration 작성**

Base table은 다음 핵심 열을 가진다.

```sql
create table public.insight_import_connections (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  provider text not null check (provider = 'notion'),
  status text not null check (
    status in (
      'pending', 'exchanging', 'connected', 'analyzing',
      'completed', 'canceled', 'failed'
    )
  ),
  return_mode text not null check (return_mode in ('web', 'android')),
  include_page_urls boolean not null default false,
  state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'),
  state_expires_at timestamptz not null,
  access_ciphertext text,
  access_nonce text,
  access_auth_tag text,
  refresh_ciphertext text,
  refresh_nonce text,
  refresh_auth_tag text,
  key_version smallint check (key_version = 1),
  workspace_name text check (
    workspace_name is null or char_length(workspace_name) <= 200
  ),
  workspace_id text check (
    workspace_id is null or char_length(workspace_id) <= 100
  ),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insight_import_connections_job_user_fkey
    foreign key (job_id, user_id)
    references public.insight_import_jobs (id, user_id)
    on delete cascade
);
```

access token의 ciphertext/nonce/tag는 connected/analyzing에서 모두 존재해야 한다. refresh token은 Notion 응답이 nullable이므로 세 열이 모두 null이거나 모두 존재해야 한다. terminal status에서는 access/refresh 암호화 열이 모두 null이어야 한다는 check를 둔다. 공개 view는 `id,user_id,job_id,provider,status,return_mode,include_page_urls,workspace_name,expires_at,created_at,updated_at`만 노출하고 `security_invoker=true`를 사용한다. authenticated에는 base table 전체 SELECT가 아니라 view가 참조하는 비민감 열의 column-level SELECT와 view SELECT만 부여해 security-invoker 조회와 비밀 열 차단을 동시에 만족시킨다.

서버 전용 함수는 service_role만 실행한다.

```sql
public.consume_insight_import_oauth_state(p_state_hash text) returns jsonb
public.store_insight_import_oauth_tokens(p_connection_id uuid, p_tokens jsonb) returns void
public.finish_insight_import_connection(p_connection_id uuid, p_status text) returns void
```

기존 cleanup 함수는 만료 connection을 먼저 삭제하고 관련 미완료 job을 cascade 삭제하도록 교체한다.

- [ ] **Step 4: admin store 작성**

Store의 public methods는 다음 계약을 따른다.

```ts
export type ImportAdminStore = {
  consumeState(stateHash: string): Promise<ConsumedConnection | null>;
  createConnection(input: CreateConnectionInput): Promise<void>;
  finishConnection(
    connectionId: string,
    status: 'canceled' | 'completed' | 'failed'
  ): Promise<void>;
  getConnection(connectionId: string): Promise<EncryptedConnection | null>;
  listExpiredConnections(currentTime: string): Promise<EncryptedConnection[]>;
  storeTokens(
    connectionId: string,
    tokens: StoredEncryptedTokens
  ): Promise<void>;
};
```

`SUPABASE_SERVICE_ROLE_KEY` client는 서버 파일 안에서만 만들고 auth option은 `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false`다. 응답 파서는 모든 필드를 unknown에서 검증한다.

- [ ] **Step 5: 테스트와 커밋**

Run:

```powershell
npx --yes supabase@2.109.1 test db
npm test -- server/insight_import/supabase_import_admin_store.test.ts
```

Expected: state 일회성, RLS/view, token lifecycle, cleanup, store 응답 검증 PASS.

```powershell
git add supabase server/insight_import
git commit -m "feat: Notion 일회성 연결 저장 구조"
```

### Task 17: Notion API client와 표준 후보 추출

**Files:**

- Create: `server/insight_import/notion_client.ts`
- Create: `server/insight_import/notion_client.test.ts`
- Create: `server/insight_import/notion_candidate_extractor.ts`
- Create: `server/insight_import/notion_candidate_extractor.test.ts`
- Create: `server/insight_import/testing/notion_search.json`
- Create: `server/insight_import/testing/notion_data_source.json`
- Create: `server/insight_import/testing/notion_pages.json`
- Create: `server/insight_import/testing/notion_blocks.json`
- Create: `server/insight_import/testing/notion_rate_limit.json`

- [ ] **Step 1: API 버전·pagination·재시도 실패 테스트 작성**

Provider transport mock으로 다음을 검증한다.

- 모든 REST 요청에 `Notion-Version: 2026-03-11`, Bearer token, JSON content type을 보낸다.
- search의 `page`와 `data_source`, data source query, block children의 `has_more/next_cursor`를 이어간다.
- 선택한 `rich_text` page property는 Retrieve a page property item의 pagination을 끝까지 이어가 25개 reference 제한 뒤의 값도 읽는다.
- 429는 정수 `Retry-After`를 우선하며, 없으면 500ms·1s·2s의 지수 backoff와 주입한 jitter를 사용한다.
- 500/502/503/504만 최대 3회 재시도한다.
- 400/401/403/404는 재시도하지 않고 `invalid-request`, `reauthorize`, `forbidden`, `not-found`의 안전한 코드로 바꾼다.
- 한 analyze slice는 최대 8개 Provider request 또는 주입 clock 기준 8초에서 cursor를 반환한다.
- request/response logging에는 URL property, page title, OAuth token과 Notion request body가 없다.

- [ ] **Step 2: 후보 추출 실패 테스트 작성**

고정 fixture에서 다음 후보를 기대한다.

```ts
expect(candidates).toContainEqual({
  candidateId: 'notion:block:block-id:bookmark',
  capturedAtCandidate: null,
  collectionPath: ['업무 자료', '개발'],
  explicitMemoCandidate: null,
  originalUrl: 'https://example.com/bookmark',
  sourceLocation: 'Notion 업무 자료 / 개발 · 북마크 블록',
  titleCandidate: '아키텍처 문서',
  warnings: [],
});
```

다음 추출 위치를 각각 검증한다.

- page property type `url`
- 사용자가 URL field로 선택한 `rich_text`의 전체 값과 각 rich text `href`
- paragraph/heading/list/quote/callout/to_do/toggle/table cell rich text의 `href`와 plain text URL
- bookmark, embed, link_preview block URL
- child page와 data source의 collection path

다음은 후보로 만들지 않는다.

- Notion page의 자체 `url`
- image/video/file/pdf/audio source URL
- page 본문 전체를 memo로 승격한 값
- caption/description
- relation, email, phone, formula URL 추측

- [ ] **Step 3: 실패 확인**

Run:

```powershell
npm test -- server/insight_import/notion_client.test.ts server/insight_import/notion_candidate_extractor.test.ts
```

Expected: client와 extractor 부재로 FAIL.

- [ ] **Step 4: Notion transport 작성**

공식 SDK `Client`는 `notionVersion:'2026-03-11'`로 만들되, sleep·clock·fetch를 테스트에 주입할 수 있는 얇은 `NotionImportClient`로 감싼다.

```ts
export type NotionAnalysisCursor = {
  blockQueue: Array<{
    blockId: string;
    collectionPath: string[];
    cursor: string | null;
  }>;
  dataSourceQueue: Array<{ dataSourceId: string; cursor: string | null }>;
  searchCursor: string | null;
  stage: 'search' | 'data-sources' | 'blocks' | 'complete';
  visitedBlockIds: string[];
  visitedDataSourceIds: string[];
  visitedPageIds: string[];
};
```

visited 배열과 queue 합계는 각각 10,000개를 넘지 못한다. cursor는 마지막으로 성공한 Provider 응답 뒤에만 저장해 재시작 시 항목을 빠뜨리지 않는다.

- [ ] **Step 5: 순수 후보 추출기 작성**

SDK 타입을 그대로 저장하지 않고 `unknown` fixture를 type guard로 좁힌 뒤 `ImportCandidate[]`만 반환한다. candidate ID는 Notion object ID, property/block type, rich text index를 조합해 재실행해도 같게 만든다. collection path는 20단계까지만 유지한다.

Data source schema에서 type `url`은 URL 후보 필드다. `rich_text`는 첫 100개 row의 non-empty 값 80% 이상이 HTTP(S) URL일 때 후보 필드다. 후보가 둘 이상이면 다음 mapping request를 반환하고 추출을 멈춘다.

```ts
export type NotionFieldMappingRequest = {
  dataSourceId: string;
  fields: Array<{ id: string; name: string; type: 'rich_text' | 'url' }>;
  suggestedUrlPropertyId: string;
};

export type NotionFieldMapping = {
  dataSourceId: string;
  memoPropertyId: string | null;
  titlePropertyId: string | null;
  urlPropertyId: string;
};
```

URL property는 필수다. title은 기본 page title을 쓰며 사용자가 다른 field를 고른 경우에만 바꾼다. memo는 기본 null이고 사용자가 명시적으로 고른 rich-text field만 `explicitMemoCandidate`로 승격한다.

기본 분석에서는 Notion page 자체 `url`을 제외한다. `includePageUrls=true`가 명시된 경우에만 선택한 page의 자체 URL을 `candidateId: notion:page:<page-id>:self`, page title, 현재 collection path로 후보에 추가한다.

- [ ] **Step 6: 테스트와 커밋**

Run:

```powershell
npm test -- server/insight_import/notion_client.test.ts server/insight_import/notion_candidate_extractor.test.ts
```

Expected: 최신 API version, data source, pagination, cursor, 429, 후보·제외 위치 테스트 PASS.

```powershell
git add server/insight_import
git commit -m "feat: Notion API 탐색과 후보 추출"
```

### Task 18: OAuth 시작·callback·재개·철회 서버 흐름

**Files:**

- Create: `server/insight_import/notion_import_service.ts`
- Create: `server/insight_import/notion_import_service.test.ts`
- Modify: `server/insight_import/import_cleanup_service.ts`
- Modify: `server/insight_import/import_cleanup_service.test.ts`
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Modify: `server/operating_app.ts`
- Modify: `server/operating_app.test.ts`
- Create: `api/imports/notion/start.ts`
- Create: `api/imports/notion/callback.ts`
- Create: `api/imports/notion/[connectionId]/status.ts`
- Create: `api/imports/notion/[connectionId]/analyze.ts`
- Create: `api/imports/notion/[connectionId]/complete.ts`
- Create: `api/imports/notion/[connectionId]/cancel.ts`
- Modify: `server/vercel_config.test.ts`
- Create: `supabase/migrations/20260725010100_analyze_notion_import.sql`
- Modify: `supabase/tests/database/insight_imports.test.sql`

- [ ] **Step 1: OAuth와 API route 실패 테스트 작성**

Service 테스트는 다음 순서를 검증한다.

1. start가 Supabase bearer token을 인증하고 32 random bytes의 state 원문을 한 번만 응답 URL에 넣으며 DB에는 SHA-256 hash와 사용자가 선택한 `includePageUrls` boolean만 둔다.
2. authorize URL은 `owner=user`, configured `client_id`, exact `redirect_uri`, `response_type=code`, `state`만 가진다.
3. callback은 state를 먼저 atomic consume한 뒤 code를 token endpoint에 Basic auth로 교환한다.
4. token은 AES-GCM 저장 뒤 평문 참조를 유지하지 않고 web 또는 Android의 고정 return URL로 redirect한다.
5. error callback, 만료/재사용 state, 다른 provider state는 token endpoint를 호출하지 않는다.
6. analyze는 connection 소유 bearer만 허용하고 8-request slice 뒤 cursor와 안전한 progress count를 반환한다.
7. Provider 401이면 저장한 refresh token으로 `POST /v1/oauth/token`의 `grant_type=refresh_token`을 한 번 호출하고, 회전된 access/refresh token을 다시 암호화해 저장한 뒤 원래 요청을 한 번 재시도한다.
8. refresh token 부재·`invalid_grant`·재시도 401은 token 열을 삭제하고 `reauthorize`를 반환한다.
9. complete/cancel은 access token을 `POST /v1/oauth/revoke`로 철회한 뒤 암호화 열을 삭제한다.
10. revoke가 일시 실패해도 token은 24시간 cleanup 대상으로 남고 사용자에게 `cleanup-pending`을 반환한다.
11. Cron cleanup은 만료된 Notion connection의 access token을 복호화해 revoke를 best-effort 호출한 뒤, revoke 성공 여부와 관계없이 24시간 보존 한도를 넘긴 암호화 token과 미완료 후보를 DB에서 삭제한다.

App 테스트는 body 64 KiB 제한, 인증 누락 401, 소유권 실패 404, Provider 제한 429, 재연결 필요 409, 안전한 503, callback redirect를 검증한다. 로그에는 state/code/token/URL/title가 없어야 한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- server/insight_import/notion_import_service.test.ts server/app.test.ts server/operating_app.test.ts server/vercel_config.test.ts
```

Expected: service와 route 부재로 FAIL.

- [ ] **Step 3: 분석 append/finalize RPC 추가**

Migration에 authenticated 전용 함수를 추가한다.

```sql
public.start_notion_insight_import(
  p_job_id uuid,
  p_idempotency_key text
) returns uuid

public.append_notion_import_items(
  p_job_id uuid,
  p_items jsonb,
  p_provider_cursor jsonb
) returns jsonb

public.finalize_notion_import_analysis(
  p_job_id uuid,
  p_provider_cursor jsonb
) returns jsonb
```

start는 analyzing job을 만들고, append는 소유권·한 slice 최대 500개·전체 최대 10,000개를 검증해 `(job_id,candidate_id)` conflict 시 동일 payload만 허용한다. finalize는 Task 4와 같은 입력 내부/기존 중복 분류와 집계를 수행해 ready로 바꾼다. 모든 호출은 bearer 기반 user Supabase client를 사용하며 service role은 OAuth callback token 저장과 cleanup에만 사용한다.

- [ ] **Step 4: Notion service 작성**

`NotionImportService`의 공개 계약을 고정한다.

```ts
export type NotionImportService = {
  analyze(
    accessToken: string,
    connectionId: string,
    mappings: NotionFieldMapping[]
  ): Promise<NotionAnalyzeResult>;
  cancel(
    accessToken: string,
    connectionId: string
  ): Promise<NotionFinishResult>;
  complete(
    accessToken: string,
    connectionId: string
  ): Promise<NotionFinishResult>;
  handleCallback(query: unknown): Promise<{ redirectUrl: string }>;
  start(
    accessToken: string,
    includePageUrls: boolean,
    returnMode: 'android' | 'web'
  ): Promise<{ authorizeUrl: string; connectionId: string }>;
  status(
    accessToken: string,
    connectionId: string
  ): Promise<NotionConnectionStatus>;
};
```

OAuth start는 server가 만든 connection UUID를 job UUID로도 사용하고 idempotency key는 `sha256("notion\0"+connectionId)`다. callback redirect는 request header나 query의 return URL을 사용하지 않고 config의 `IMPORT_APP_ORIGIN` 또는 고정 `com.ppre1ude.amadda://import/notion`만 사용한다.

- [ ] **Step 5: Express와 Vercel entry 연결**

각 route는 `createApp`의 service port를 호출한다. 동적 `connectionId`는 UUID가 아니면 service 호출 전에 400이다. Callback은 OAuth code/error/state query만 받고 JSON body parser를 사용하지 않는다.

Vercel entry는 모두 같은 `createOperatingApp()` default export이며 `server/vercel_config.test.ts`가 실제 파일 경로와 공개 URL을 일치시키는지 검사한다.

- [ ] **Step 6: 테스트와 커밋**

Run:

```powershell
npm test -- server
npx --yes supabase@2.109.1 test db
npm run build:web
```

Expected: state CSRF, token 교환/암호화, cursor 재개, mapping 요청, revoke, 안전한 오류와 Vercel 경로 테스트 PASS.

```powershell
git add server api/imports supabase
git commit -m "feat: Notion OAuth와 재개 가능한 분석 API"
```

### Task 19: Notion 연결 UI와 Android 복귀

**Files:**

- Create: `src/features/insight-import/api/notion_import_api.ts`
- Create: `src/features/insight-import/api/notion_import_api.test.ts`
- Create: `src/features/insight-import/model/use_notion_import.ts`
- Create: `src/features/insight-import/model/use_notion_import.test.tsx`
- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx`
- Modify: `src/features/insight-import/ui/insight_import_dialog.test.tsx`
- Create: `src/shared/capacitor/notion_import_callback.ts`
- Create: `src/shared/capacitor/notion_import_callback.test.ts`
- Modify: `src/shared/capacitor/index.ts`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`

- [ ] **Step 1: 웹·Android 복귀와 재개 실패 테스트 작성**

API client 테스트는 Supabase `auth.getSession()`의 access token을 모든 start/status/analyze/complete/cancel 요청에 Bearer로 넣고, URL·title·token을 오류에 포함하지 않는지 검증한다.

Hook/UI 테스트는 다음 흐름을 고정한다.

- `Notion에서 가져오기` 클릭→공식 연결 안내→authorize URL 이동
- callback의 `?import=notion&connection=<uuid>`를 읽어 다이얼로그 자동 열기
- status connected→analyze slice 반복→mapping-required이면 data source별 URL field 한 번 선택→계속
- 기본값이 꺼진 `Notion 페이지 자체 주소도 가져오기`를 사용자가 켠 경우에만 page URL 후보가 포함됨
- 페이지를 reload해도 connection ID query로 status와 job을 재개
- preview commit 성공 뒤 complete/revoke 호출
- OAuth 취소/권한 거부는 인사이트 작업 없이 source 화면과 복구 안내로 복귀
- dialog 닫기 확인 뒤 cancel/revoke

Android adapter 테스트는 `Browser.open`, `App.addListener('appUrlOpen')`, `getLaunchUrl`, `Browser.close`를 mock하고 `com.ppre1ude.amadda://import/notion?connection=<uuid>`만 받아 connection ID를 알린다. auth callback이나 다른 scheme/host는 무시한다.

- [ ] **Step 2: 실패 확인**

Run:

```powershell
npm test -- src/features/insight-import/api/notion_import_api.test.ts src/features/insight-import/model/use_notion_import.test.tsx src/shared/capacitor/notion_import_callback.test.ts src/features/insight-import/ui/insight_import_dialog.test.tsx
```

Expected: API, hook, callback adapter 부재로 FAIL.

- [ ] **Step 3: 인증 API client와 Notion hook 작성**

API client는 상대 API path만 사용한다. Start body의 `includePageUrls`는 server connection row에 저장되며 callback 뒤 status에서 복원하므로 full-page redirect나 Android 프로세스 재생성에 의존하지 않는다.

```ts
POST /api/imports/notion/start
GET  /api/imports/notion/:connectionId/status
POST /api/imports/notion/:connectionId/analyze
POST /api/imports/notion/:connectionId/complete
POST /api/imports/notion/:connectionId/cancel
```

analyze 429는 `Retry-After` 후 최대 3회, `analyzing` 응답은 500ms 뒤 다음 slice를 호출한다. hook unmount/닫기에서는 timer와 fetch `AbortController`를 취소한다. 연결 ID만 URL/query 또는 Android 메모리에 있고 state/code/token은 브라우저 앱에 전달되지 않는다.

- [ ] **Step 4: Notion source와 field mapping UI 활성화**

source 화면에 `Notion에서 가져오기` Button과 다음 안내를 제공한다.

> Notion 공식 화면에서 가져올 페이지를 직접 선택합니다. 읽기 권한만 사용하고 가져오기가 끝나면 연결을 해제합니다.

연결 전 source 화면에 기본값이 꺼진 checkbox `Notion 페이지 자체 주소도 가져오기`와 “Notion 안에 저장한 외부 링크가 아니라 선택한 페이지도 원문으로 보관할 때만 사용” 안내를 둔다. 분석 중에는 workspace name, 완료한 요청/후보 개수와 `연결 취소`를 보여주고 반복 animation은 사용하지 않는다. mapping request는 data source name과 URL·선택적 제목·선택적 메모 후보 field를 visible label Select로 보여준다.

- [ ] **Step 5: Android 딥링크 연결**

Manifest에 기존 auth filter와 별도로 다음 data를 추가한다.

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="com.ppre1ude.amadda"
        android:host="import"
        android:path="/notion" />
</intent-filter>
```

`notion_import_callback.ts`는 Capacitor Android에서만 시스템 Browser를 열고 callback listener를 설치한다. OAuth state나 원본 URL은 localStorage에 저장하지 않는다. 프로세스 종료 뒤 `getLaunchUrl()`로 connection ID만 복구한다.

- [ ] **Step 6: 증분 C 선택 검증**

Run:

```powershell
npm test -- src/features/insight-import src/shared/capacitor src/app server
npx --yes supabase@2.109.1 test db
npm run sync:android
Push-Location android
.\gradlew.bat testDebugUnitTest
Pop-Location
```

Expected: 웹/Android callback, resume, cancel, revoke, DB/RLS와 Gradle 테스트 PASS.

- [ ] **Step 7: 증분 C 커밋**

```powershell
git add src android
git commit -m "feat: Notion 연결 가져오기와 Android 복귀"
```

증분 C 완료 시 사용자가 Notion 공식 페이지 선택기를 거쳐 허용한 콘텐츠만 분석하고, 완료·취소 후 연결 토큰이 철회·삭제되어야 한다.

### Task 20: 운영 설정, 문서와 전체 검증

**Files:**

- Modify: `docs/development-architecture.md`
- Modify: `docs/deployment.md`
- Modify: `docs/tech-stack.md`
- Modify: `docs/backlog.md`
- Modify: `docs/checklist.md`
- Modify: `README.md`

- [ ] **Step 1: 구현 사실을 문서에 반영**

`docs/development-architecture.md`의 tree와 책임 표에 `features/insight-import`를 추가하고 다음 경계를 명시한다.

```markdown
- `features/insight-import`는 출처별 입력을 표준 후보로 바꾸는 어댑터, 분석·반영·Undo 사용자 행동과 UI를 소유한다.
- 원본 파일은 브라우저에서만 읽으며 Notion OAuth와 Provider 호출은 `server/insight_import`에 둔다.
- `pages/library`는 feature를 직접 import하지 않고 진입 callback만 노출하며 `app`이 다이얼로그와 원격 목록 재조회를 조합한다.
```

`docs/tech-stack.md`에 실제 lockfile 버전의 `csv-parse`, `htmlparser2`, `@zip.js/zip.js`, `@notionhq/client` 네 행을 추가하고 각각 CSV 구조 파싱, inert HTML SAX 파싱, ZIP 사전검사/순차해제, 최신 Notion API 타입 경계라고 기록한다.

- [ ] **Step 2: 배포 비밀과 외부 설정 절차 문서화**

`docs/deployment.md`에 다음 Sensitive 환경 변수를 Development/Preview/Production별로 기록한다. 값 자체는 문서에 넣지 않는다.

```text
IMPORT_APP_ORIGIN
IMPORT_TOKEN_ENCRYPTION_KEY
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_REDIRECT_URI
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

Notion Creator Dashboard 설정은 `Any workspace`, `Read content`만 활성화, update/insert/user email/comment capability 비활성, callback은 `${안정주소}/api/imports/notion/callback`로 고정한다. Marketplace listing은 OAuth 사용에 필수가 아니므로 이번 출시 조건에서 제외한다.

Vercel Cron은 daily schedule과 `CRON_SECRET` Bearer 자동 전달을 기록한다. Hobby plan에서는 지정 시간의 해당 1시간 안에 실행될 수 있으므로 정확한 분 단위 삭제를 약속하지 않고, 만료 판정은 DB timestamp로 수행한다고 명시한다.

- [ ] **Step 3: 백로그·체크리스트·README 갱신**

완료한 항목만 `[x]`로 바꾼다. YouTube, 카카오톡, Pinterest, Instagram은 구현되지 않았으므로 후속 항목으로 유지한다. README 문서 표에는 승인 설계와 이 구현 계획의 상대 링크를 추가한다.

- [ ] **Step 4: 전체 자동 검증**

깨끗한 로컬 Supabase 환경과 프로젝트 root에서 실행한다.

```powershell
npm test
npx --yes supabase@2.109.1 test db
npx --yes supabase@2.109.1 db lint --local
npm run lint
npm run format:check
npm run build
npm run sync:android
Push-Location android
.\gradlew.bat testDebugUnitTest
.\gradlew.bat assembleDebug
Pop-Location
git diff --check
```

Expected:

```text
모든 Vitest suite PASS
모든 pgTAP 파일 PASS
Supabase schema lint 오류 없음
ESLint exit code 0
이 PR에서 변경한 Prettier 대상 파일 PASS
웹과 Chrome extension build PASS
Android unit test와 debug APK build PASS
git diff --check exit code 0
```

전체 `npm run format:check`는 이 작업과 무관한 기존
`src/features/category-management/ui/category_manager.test.tsx` 불일치로 실패하며
[#78](https://github.com/ppre1ude/hub/issues/78)에서 별도로 정리한다. #78 완료 뒤에는
변경 파일 검증 대신 전체 formatting gate를 다시 적용한다.

- [ ] **Step 5: Preview 환경 수동 검증**

Notion Public Connection에 현재 Preview callback URL을 명시적으로 등록한 뒤 승인된 테스트 계정으로 검증한다.

1. 빈 보관함 390px 화면에서 `링크 저장`과 `내 저장물 가져오기`가 함께 보인다.
2. URL 붙여넣기 분석 전에는 `insights`가 바뀌지 않는다.
3. Chrome bookmark HTML, CSV, JSON, Markdown, ZIP을 각각 분석하고 집계와 폴더 경로를 확인한다.
4. DevTools Network에서 원본 file body가 `/api` 또는 Supabase 요청에 포함되지 않는다.
5. 기존 URL의 제목·메모·카테고리가 commit 뒤 그대로다.
6. Notion에서 두 page와 한 data source만 선택했을 때 그 하위 링크만 후보가 된다.
7. Notion 권한 취소, 브라우저 닫기, 429 mock과 네트워크 단절에서 입력·보관함을 유지한 복구 안내가 나온다.
8. 완료와 취소 뒤 connection row의 암호화 token 열이 null이고 revoke endpoint가 호출된다.
9. 가져온 인사이트 하나를 수정한 뒤 Undo하면 수정 항목은 남고 나머지만 삭제된다.
10. 기록 삭제 뒤 인사이트는 남고 Undo action과 item detail은 사라진다.
11. 500자 제목과 20단계 collection path를 포함한 결과가 1280px, 768px, 390px에서 가로 overflow 없이 줄바꿈되고, 키보드만으로 입력→매핑→commit→Undo를 완료한다.
12. Android 시스템 브라우저 Notion 승인 뒤 `com.ppre1ude.amadda://import/notion`으로 앱에 돌아와 분석을 이어간다.

- [ ] **Step 6: 운영 보안 설정 확인**

배포 권한이 있는 담당자가 다음 외부 상태를 확인한다.

- Notion client secret, service role key, AES key, Cron secret이 Vercel Sensitive 변수이며 Preview 로그와 build output에 없다.
- Vercel Firewall에 `/api/imports/` start/analyze/cancel/complete를 IP·리전당 60초 30회로 제한한다. callback과 cron은 각각 state/CRON_SECRET 검증을 사용하므로 이 사용자 rate rule에서 제외한다.
- Supabase migration integration이 두 새 migration을 순서대로 적용한다.
- Cron Jobs 화면에 `/api/cron/import-cleanup` daily job이 활성화되어 있다.
- 안정 주소 callback 한 건으로 token 교환, 분석, revoke가 모두 성공한다.

- [ ] **Step 7: 문서와 검증 커밋**

```powershell
git add docs README.md
git commit -m "docs: 범용 가져오기 운영과 검증 절차"
```

---

## Self-Review

### Spec coverage

- 서비스명에 종속되지 않는 표준 후보와 선택적 adapter: Tasks 1, 11~14, 17
- URL 붙여넣기와 unknown text fallback: Tasks 2, 11~12
- Chrome을 첫 fixture로 한 브라우저 bookmark HTML: Task 12
- CSV·JSON·HTML·Markdown·text와 모호한 field mapping: Tasks 12~13
- ZIP path traversal, symlink, nested archive, zip bomb 제한: Task 14
- 분석 전 보관함 무변경, 요약, 예외 상세와 명시적 category mapping: Tasks 8~10
- DB unique 기준 재검사, 멱등성, 기존 제목·memo·category 비덮어쓰기: Tasks 4~5
- 작업 기록, 안전한 Undo, 기록 삭제: Task 6
- Notion Public Connection, page picker, read-only, 최신 data source API: Tasks 15~19
- 10분 single-use state, AES-256-GCM, server-only secret, 24시간 정리: Tasks 15~16, 18, 20
- Provider cursor 재개, Retry-After와 exponential backoff: Tasks 17~19
- RLS, pgTAP, malicious fixture, 접근성과 responsive 검증: Tasks 3~~6, 9, 11~~14, 20
- YouTube, 카카오톡, Pinterest, Instagram과 scraping 제외: Task 20에서 후속 backlog로 유지

### 자리표시자 점검

- 코드 변경 태스크마다 정확한 파일 경로, 공개 계약, 검증 명령과 기대 결과가 있다.
- 구현 범위에 미정 표식, 임시 우회 또는 후속 구현을 가장한 빈 단계가 없다.
- 후속 서비스는 현재 계획에서 구현된 것으로 표시하지 않는다.

### Type consistency

- `ImportAdapterKey`, `ImportInputKind`, job status는 TypeScript union과 SQL check가 일치한다.
- `ImportCandidate → AnalyzedImportItem → prepare_insight_import` 필드명과 길이 제한이 일치한다.
- `ImportCollectionMapping`의 existing/new/uncategorized target은 commit RPC JSON과 일치한다.
- `ImportCommitResult`, `ImportUndoResult`, `PreparedImport`는 RPC의 camelCase JSON과 일치한다.
- Notion connection status는 DB check, server result, browser hook에서 같은 값을 쓴다.
- `2026-03-11`은 Notion client, fixture와 운영 문서에서 같은 API version이다.

## References

- [승인된 범용 가져오기 설계](../specs/2026-07-25-universal-insight-import-design.md)
- [개발 아키텍처](../../development-architecture.md)
- [운영 배포](../../deployment.md)
- [디자인 계약](../../../DESIGN.md)
- [Notion Public connections](https://developers.notion.com/guides/get-started/public-connections)
- [Notion authorization](https://developers.notion.com/guides/get-started/authorization)
- [Notion API version changes](https://developers.notion.com/reference/changes-by-version)
- [Notion query a data source](https://developers.notion.com/reference/query-a-data-source)
- [Notion request limits](https://developers.notion.com/reference/request-limits)
- [Notion revoke token](https://developers.notion.com/reference/revoke-token)
- [Vercel Cron security and Hobby timing](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Supabase API grants and RLS](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase pgTAP database testing](https://supabase.com/docs/guides/database/testing)

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-25-universal-insight-import.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고 각 태스크 사이에 요구사항 검토와 코드 품질 검토를 수행한다.

**2. Inline Execution** - 현재 세션에서 `superpowers:executing-plans` 방식으로 실행하고 증분별 checkpoint에서 검토한다.

실행 방식은 사용자가 선택한다.
