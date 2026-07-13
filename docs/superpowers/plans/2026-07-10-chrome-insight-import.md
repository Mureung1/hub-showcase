# Chrome 인사이트 가져오기 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 Chrome 북마크 HTML을 분석하고 한 번의 확인으로 인사이트를 가져오며, 작업 묶음을 안전하게 Undo할 수 있게 한다.

**Architecture:** Chrome HTML은 브라우저 메모리에서만 파싱하고 원본 파일은 서버에 업로드하지 않는다. `src/features/insight-import`가 파일 분석과 사용자 흐름을 담당하고, Supabase Postgres RPC가 중복 방지·묶음 반영·Undo를 하나의 논리적 작업으로 처리한다. 파서와 저장소는 작은 공개 인터페이스 뒤에 두고 실제 Chrome 픽스처와 pgTAP을 사용해 행동 단위 TDD로 구현한다.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, WDS, Supabase Postgres, PL/pgSQL, pgTAP

---

## 계획 범위

이 계획은 승인된 [인사이트 마이그레이션과 원문 복원력 설계](../specs/2026-07-10-insight-migration-design.md)의 첫 번째 실행 계획이다.

각 행동은 테스트 하나를 먼저 실패시키고 최소 구현으로 통과시킨 뒤 정리하는 `RED → GREEN → REFACTOR` 순서로 진행한다. 모든 테스트를 먼저 작성한 다음 구현을 몰아서 작성하지 않는다.

포함 범위:

- Chrome 북마크 HTML 파일 선택
- 브라우저 메모리 안에서 파일 파싱
- Chrome 폴더 경로를 가져오기 작업 데이터로 보존
- URL 검증과 정규화
- 파일 내부 및 기존 보관함 중복 분석
- 신규·중복·오류 묶음 요약
- 한 번의 확인 후 원자적 DB 반영
- 가져오기 기록 조회
- 가져오기 기록과 연결된 임시 작업 데이터 삭제
- 사용자가 수정하지 않은 가져온 인사이트의 작업 단위 Undo
- 원본 HTML을 서버에 저장하지 않는 구조

제외 범위:

- Notion과 범용 필드 매퍼
- Chrome 폴더를 카테고리로 일괄 연결하는 UI
- Pinterest와 Instagram 아카이브
- 원문 접근 상태 상세 UX
- 원격 썸네일 갤러리
- 직접 OAuth 연결

Chrome 폴더 경로는 후속 카테고리 일괄 연결을 위해 이 계획부터 가져오기 작업 데이터에 보존한다. `ADD_DATE`를 어떤 시간 의미로 사용할지는 Notion·범용 매퍼 계획에서 다른 서비스의 시간 필드와 함께 결정한다.

## 실행 전제

현재 저장소는 단일 프로토타입 상태이므로 이 계획을 바로 실행하지 않는다. 다음 기존 계획을 순서대로 완료한 뒤 실행한다.

1. `docs/superpowers/plans/amadda-p0-app-shell.md`
2. `docs/superpowers/plans/amadda-auth.md`
3. `docs/superpowers/plans/amadda-data-model.md`
4. `docs/superpowers/plans/amadda-insight-save.md`
5. `docs/superpowers/plans/amadda-library.md`
6. `docs/superpowers/plans/amadda-insight-edit.md`

실행 전에 다음 PowerShell 검사를 통과해야 한다.

```powershell
$required = @(
  'supabase/migrations/0001_init_amadda_schema.sql',
  'src/entities/insight/lib/url.ts',
  'src/entities/insight/api/insightQueries.ts',
  'src/features/auth/model/AuthProvider.tsx',
  'src/pages/library/ui/LibraryPage.tsx',
  'src/shared/api/database.types.ts',
  'src/shared/api/supabase.ts'
)
$missing = @($required | Where-Object { -not (Test-Path $_) })
if ($missing.Count -gt 0) {
  throw "선행 구현이 필요합니다: $($missing -join ', ')"
}
```

Expected: 명령이 출력 없이 종료된다.

## 파일 구조

- Create: `src/features/insight-import/__fixtures__/chrome-bookmarks.html`
  - 익명화한 실제 Chrome 형식 테스트 픽스처다.
- Create: `src/features/insight-import/model/importTypes.ts`
  - 분석, 반영, Undo 공개 타입을 정의한다.
- Create: `src/features/insight-import/model/analyzeChromeImport.ts`
  - Chrome HTML을 임시 후보로 변환하고 중복·오류를 분석한다.
- Create: `src/features/insight-import/model/commitInsightImport.ts`
  - 승인된 분석 결과만 저장 포트에 전달한다.
- Create: `src/features/insight-import/model/chromeImportFlow.test.ts`
  - 실제 픽스처를 통한 첫 tracer bullet과 분석 규칙을 검증한다.
- Create: `src/features/insight-import/api/importRepository.ts`
  - 기존 URL 조회, RPC 반영, 기록 조회, Undo를 담당한다.
- Create: `src/features/insight-import/ui/InsightImportPanel.tsx`
  - 파일 선택, 요약, 반영, 결과, Undo UI를 담당한다.
- Create: `src/features/insight-import/ui/InsightImportPanel.test.tsx`
  - 사용자가 관찰하는 가져오기 흐름을 검증한다.
- Create: `src/features/insight-import/ui/InsightImportPanel.css`
  - 기능 전용 레이아웃과 상태 표현을 정의한다.
- Create: `src/features/insight-import/index.ts`
  - feature public API다.
- Create: `supabase/migrations/0002_insight_imports.sql`
  - 가져오기 테이블, RLS, commit/undo RPC, 사용자 수정 추적을 정의한다.
- Create: `supabase/tests/database/insight_import_commit.test.sql`
  - 묶음 반영, 중복, 원자성, RLS를 pgTAP으로 검증한다.
- Create: `supabase/tests/database/insight_import_undo.test.sql`
  - Undo와 사용자 수정 보호를 pgTAP으로 검증한다.
- Modify: `src/shared/api/database.types.ts`
  - 가져오기 row 타입과 `insights.user_edited_at`을 추가한다.
- Modify: `src/shared/api/index.ts`
  - 새 DB 타입을 public API로 공개한다.
- Modify: `src/pages/library/ui/LibraryPage.tsx`
  - 비어 있는 보관함과 보관함 메뉴에 가져오기 진입점을 연결한다.
- Modify: `docs/backlog.md`
  - Chrome 가져오기 기반과 후속 마이그레이션 세부 작업을 기록한다.
- Modify: `docs/checklist.md`
  - 4주차 작업과 완료 기준에 기존 저장물 가져오기를 요약한다.
- Modify: `README.md`
  - 설계와 구현 계획 문서 링크를 추가한다.

---

### Task 1: Chrome tracer bullet 작성

**Files:**

- Create: `src/features/insight-import/__fixtures__/chrome-bookmarks.html`
- Create: `src/features/insight-import/model/importTypes.ts`
- Create: `src/features/insight-import/model/analyzeChromeImport.ts`
- Create: `src/features/insight-import/model/commitInsightImport.ts`
- Create: `src/features/insight-import/model/chromeImportFlow.test.ts`
- Create: `src/features/insight-import/index.ts`

- [ ] **Step 1: 실제 형식의 최소 Chrome 픽스처 작성**

Create `src/features/insight-import/__fixtures__/chrome-bookmarks.html`:

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Bookmarks</title>
<h1>Bookmarks</h1>
<dl>
  <p>
    <dt>
      <h3>개발</h3>
      <dl>
        <p>
          <dt><a href="https://React.dev/learn#start">React 공식 문서</a></dt>
        </p>
      </dl>
    </dt>
    <dt>
      <h3>디자인</h3>
      <dl>
        <p>
          <dt>
            <a href="https://example.com/design?utm_source=chrome"
              >디자인 참고</a
            >
          </dt>
        </p>
      </dl>
    </dt>
  </p>
</dl>
```

- [ ] **Step 2: 전체 경로를 관통하는 실패 테스트 작성**

Create `src/features/insight-import/model/chromeImportFlow.test.ts`:

```ts
/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import chromeBookmarksHtml from '../__fixtures__/chrome-bookmarks.html?raw';
import { analyzeChromeImport, commitInsightImport } from '../index';
import type { ImportCandidate, InsightImportPort } from './importTypes';

function createMemoryPort() {
  const stored: ImportCandidate[] = [];

  const port: InsightImportPort = {
    async commit(input) {
      stored.push(...input.candidates);

      return {
        batchId: '11111111-1111-4111-8111-111111111111',
        createdCount: input.candidates.length,
        duplicateCount: input.duplicateCount,
        invalidCount: input.invalidCount,
        totalCount: input.totalCount,
      };
    },
  };

  return {
    listNormalizedUrls: () => stored.map((item) => item.normalizedUrl),
    port,
  };
}

describe('Chrome insight import public flow', () => {
  it('analyzes and commits Chrome bookmarks through the public interface', async () => {
    const memory = createMemoryPort();
    const analysis = analyzeChromeImport({
      existingNormalizedUrls: new Set(),
      fileSizeBytes: new Blob([chromeBookmarksHtml]).size,
      html: chromeBookmarksHtml,
    });

    const result = await commitInsightImport({
      analysis,
      port: memory.port,
    });

    expect(result.createdCount).toBe(2);
    expect(memory.listNormalizedUrls()).toEqual([
      'https://react.dev/learn',
      'https://example.com/design',
    ]);
    expect(analysis.newCandidates.map((item) => item.collectionPath)).toEqual([
      ['개발'],
      ['디자인'],
    ]);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run:

```bash
npm test -- src/features/insight-import/model/chromeImportFlow.test.ts
```

Expected:

```text
FAIL src/features/insight-import/model/chromeImportFlow.test.ts
Cannot find module '../index'
```

- [ ] **Step 4: 공개 타입 작성**

Create `src/features/insight-import/model/importTypes.ts`:

```ts
export type ImportCandidate = {
  collectionPath: string[];
  domain: string;
  normalizedUrl: string;
  originalUrl: string;
  title: string;
};

export type ImportIssue = {
  code: 'invalid-url';
  message: string;
  rawUrl: string;
  title: string;
};

export type ImportSummary = {
  duplicateCount: number;
  invalidCount: number;
  newCount: number;
  totalCount: number;
};

export type ChromeImportAnalysis = {
  issues: ImportIssue[];
  newCandidates: ImportCandidate[];
  sourceFormat: 'chrome_html';
  summary: ImportSummary;
};

export type ImportCommitInput = {
  candidates: ImportCandidate[];
  duplicateCount: number;
  invalidCount: number;
  issues: ImportIssue[];
  totalCount: number;
};

export type ImportCommitResult = {
  batchId: string;
  createdCount: number;
  duplicateCount: number;
  invalidCount: number;
  totalCount: number;
};

export type ImportUndoResult = {
  batchId: string;
  deletedCount: number;
  preservedCount: number;
};

export type InsightImportPort = {
  commit: (input: ImportCommitInput) => Promise<ImportCommitResult>;
};
```

- [ ] **Step 5: 최소 분석과 반영 유스케이스 작성**

Create `src/features/insight-import/model/analyzeChromeImport.ts`:

```ts
import { parseInsightUrl } from '@/entities/insight';
import type { ChromeImportAnalysis } from './importTypes';

type AnalyzeChromeImportInput = {
  existingNormalizedUrls: ReadonlySet<string>;
  fileSizeBytes: number;
  html: string;
};

export function analyzeChromeImport({
  existingNormalizedUrls,
  html,
}: AnalyzeChromeImportInput): ChromeImportAnalysis {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const anchors = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
  const newCandidates = anchors.map((anchor) => {
    const parsed = parseInsightUrl(anchor.getAttribute('href') ?? '');

    return {
      collectionPath: readCollectionPath(anchor),
      domain: parsed.domain,
      normalizedUrl: parsed.normalizedUrl,
      originalUrl: parsed.originalUrl,
      title: anchor.textContent?.trim() || parsed.domain,
    };
  });

  return {
    issues: [],
    newCandidates: newCandidates.filter(
      (candidate) => !existingNormalizedUrls.has(candidate.normalizedUrl)
    ),
    sourceFormat: 'chrome_html',
    summary: {
      duplicateCount: 0,
      invalidCount: 0,
      newCount: newCandidates.length,
      totalCount: anchors.length,
    },
  };
}

function readCollectionPath(anchor: HTMLAnchorElement) {
  const path: string[] = [];
  let current: Element | null = anchor.parentElement;

  while (current) {
    if (current.tagName === 'DT') {
      const heading = [...current.children].find(
        (child) => child.tagName === 'H3'
      );
      const name = heading?.textContent?.trim();

      if (name) {
        path.unshift(name);
      }
    }

    current = current.parentElement;
  }

  return path;
}
```

Create `src/features/insight-import/model/commitInsightImport.ts`:

```ts
import type {
  ChromeImportAnalysis,
  ImportCommitResult,
  InsightImportPort,
} from './importTypes';

type CommitInsightImportInput = {
  analysis: ChromeImportAnalysis;
  port: InsightImportPort;
};

export async function commitInsightImport({
  analysis,
  port,
}: CommitInsightImportInput): Promise<ImportCommitResult> {
  if (analysis.newCandidates.length === 0) {
    throw new Error('가져올 신규 인사이트가 없습니다.');
  }

  return port.commit({
    candidates: analysis.newCandidates,
    duplicateCount: analysis.summary.duplicateCount,
    invalidCount: analysis.summary.invalidCount,
    issues: analysis.issues,
    totalCount: analysis.summary.totalCount,
  });
}
```

Create `src/features/insight-import/index.ts`:

```ts
export { analyzeChromeImport } from './model/analyzeChromeImport';
export { commitInsightImport } from './model/commitInsightImport';
export type {
  ChromeImportAnalysis,
  ImportCandidate,
  ImportCommitInput,
  ImportCommitResult,
  ImportIssue,
  ImportSummary,
  ImportUndoResult,
  InsightImportPort,
} from './model/importTypes';
```

- [ ] **Step 6: tracer bullet이 통과하는지 확인**

Run:

```bash
npm test -- src/features/insight-import/model/chromeImportFlow.test.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 7: 커밋**

```bash
git add src/features/insight-import
git commit -m "feat: Chrome 가져오기 tracer bullet 추가"
```

---

### Task 2: 분석 예외와 안전 한도 추가

**Files:**

- Modify: `src/features/insight-import/model/importTypes.ts`
- Modify: `src/features/insight-import/model/analyzeChromeImport.ts`
- Modify: `src/features/insight-import/model/chromeImportFlow.test.ts`

- [ ] **Step 1: 중복·오류·파일 차단 실패 테스트 추가**

Add these imports to `chromeImportFlow.test.ts`:

```ts
import {
  analyzeChromeImport,
  commitInsightImport,
  ImportFileError,
} from '../index';
```

Add these tests inside the existing `describe`:

```ts
it('counts existing, in-file duplicates, and invalid URLs without blocking valid URLs', () => {
  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
    <a href="https://example.com/a#one">A</a>
    <a href="https://example.com/a#two">A duplicate</a>
    <a href="https://existing.example.com">Existing</a>
    <a href="javascript:alert(1)">Unsafe</a>
    <a href="https://example.com/b?utm_source=test">B</a>`;

  const analysis = analyzeChromeImport({
    existingNormalizedUrls: new Set(['https://existing.example.com/']),
    fileSizeBytes: new Blob([html]).size,
    html,
  });

  expect(analysis.summary).toEqual({
    duplicateCount: 2,
    invalidCount: 1,
    newCount: 2,
    totalCount: 5,
  });
  expect(analysis.newCandidates.map((item) => item.normalizedUrl)).toEqual([
    'https://example.com/a',
    'https://example.com/b',
  ]);
  expect(analysis.issues).toHaveLength(1);
});

it('rejects files that are not Chrome bookmark exports', () => {
  expect(() =>
    analyzeChromeImport({
      existingNormalizedUrls: new Set(),
      fileSizeBytes: 20,
      html: '<html><a href="https://example.com">Example</a></html>',
    })
  ).toThrowError(ImportFileError);
});

it('rejects files larger than five megabytes', () => {
  expect(() =>
    analyzeChromeImport({
      existingNormalizedUrls: new Set(),
      fileSizeBytes: 5 * 1024 * 1024 + 1,
      html: '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    })
  ).toThrow('5MB 이하');
});

it('rejects exports containing more than five thousand bookmark rows', () => {
  const rows = '<a href="https://example.com">Example</a>'.repeat(5001);

  expect(() =>
    analyzeChromeImport({
      existingNormalizedUrls: new Set(),
      fileSizeBytes: rows.length,
      html: `<!DOCTYPE NETSCAPE-Bookmark-file-1>${rows}`,
    })
  ).toThrow('5,000개 이하');
});
```

- [ ] **Step 2: 새 테스트가 실패하는지 확인**

Run:

```bash
npm test -- src/features/insight-import/model/chromeImportFlow.test.ts
```

Expected: 새 4개 테스트가 `ImportFileError` 누락과 잘못된 집계 때문에 실패한다.

- [ ] **Step 3: 파일 오류 타입과 완전한 분석 규칙 구현**

Replace `src/features/insight-import/model/importTypes.ts` with:

```ts
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ITEMS = 5000;

export type ImportFileErrorCode =
  'file-too-large' | 'invalid-chrome-export' | 'too-many-items';

export class ImportFileError extends Error {
  constructor(
    public readonly code: ImportFileErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ImportFileError';
  }
}

export type ImportCandidate = {
  collectionPath: string[];
  domain: string;
  normalizedUrl: string;
  originalUrl: string;
  title: string;
};

export type ImportIssue = {
  code: 'invalid-url';
  message: string;
  rawUrl: string;
  title: string;
};

export type ImportSummary = {
  duplicateCount: number;
  invalidCount: number;
  newCount: number;
  totalCount: number;
};

export type ChromeImportAnalysis = {
  issues: ImportIssue[];
  newCandidates: ImportCandidate[];
  sourceFormat: 'chrome_html';
  summary: ImportSummary;
};

export type ImportCommitInput = {
  candidates: ImportCandidate[];
  duplicateCount: number;
  invalidCount: number;
  issues: ImportIssue[];
  totalCount: number;
};

export type ImportCommitResult = {
  batchId: string;
  createdCount: number;
  duplicateCount: number;
  invalidCount: number;
  totalCount: number;
};

export type ImportUndoResult = {
  batchId: string;
  deletedCount: number;
  preservedCount: number;
};

export type InsightImportPort = {
  commit: (input: ImportCommitInput) => Promise<ImportCommitResult>;
};
```

Replace `src/features/insight-import/model/analyzeChromeImport.ts` with:

```ts
import { parseInsightUrl } from '@/entities/insight';
import {
  ImportFileError,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ITEMS,
} from './importTypes';
import type {
  ChromeImportAnalysis,
  ImportCandidate,
  ImportIssue,
} from './importTypes';

type AnalyzeChromeImportInput = {
  existingNormalizedUrls: ReadonlySet<string>;
  fileSizeBytes: number;
  html: string;
};

export function analyzeChromeImport({
  existingNormalizedUrls,
  fileSizeBytes,
  html,
}: AnalyzeChromeImportInput): ChromeImportAnalysis {
  if (fileSizeBytes > MAX_IMPORT_FILE_BYTES) {
    throw new ImportFileError(
      'file-too-large',
      'Chrome 북마크 파일은 5MB 이하만 가져올 수 있습니다.'
    );
  }

  if (!html.includes('NETSCAPE-Bookmark-file-1')) {
    throw new ImportFileError(
      'invalid-chrome-export',
      'Chrome에서 내보낸 북마크 HTML 파일을 선택해 주세요.'
    );
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const anchors = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];

  if (anchors.length === 0) {
    throw new ImportFileError(
      'invalid-chrome-export',
      '파일에서 북마크 URL을 찾지 못했습니다.'
    );
  }

  if (anchors.length > MAX_IMPORT_ITEMS) {
    throw new ImportFileError(
      'too-many-items',
      '한 번에 5,000개 이하의 북마크를 가져올 수 있습니다.'
    );
  }

  const seen = new Set(existingNormalizedUrls);
  const issues: ImportIssue[] = [];
  const newCandidates: ImportCandidate[] = [];
  let duplicateCount = 0;

  for (const anchor of anchors) {
    const rawUrl = anchor.getAttribute('href')?.trim() ?? '';
    const title = anchor.textContent?.trim() ?? '';

    try {
      const parsed = parseInsightUrl(rawUrl);

      if (seen.has(parsed.normalizedUrl)) {
        duplicateCount += 1;
        continue;
      }

      seen.add(parsed.normalizedUrl);
      newCandidates.push({
        collectionPath: readCollectionPath(anchor),
        domain: parsed.domain,
        normalizedUrl: parsed.normalizedUrl,
        originalUrl: parsed.originalUrl,
        title: title || parsed.domain,
      });
    } catch (error) {
      issues.push({
        code: 'invalid-url',
        message:
          error instanceof Error ? error.message : 'URL을 해석할 수 없습니다.',
        rawUrl,
        title,
      });
    }
  }

  return {
    issues,
    newCandidates,
    sourceFormat: 'chrome_html',
    summary: {
      duplicateCount,
      invalidCount: issues.length,
      newCount: newCandidates.length,
      totalCount: anchors.length,
    },
  };
}

function readCollectionPath(anchor: HTMLAnchorElement) {
  const path: string[] = [];
  let current: Element | null = anchor.parentElement;

  while (current) {
    if (current.tagName === 'DT') {
      const heading = [...current.children].find(
        (child) => child.tagName === 'H3'
      );
      const name = heading?.textContent?.trim();

      if (name) {
        path.unshift(name);
      }
    }

    current = current.parentElement;
  }

  return path;
}
```

Add exports to `src/features/insight-import/index.ts`:

```ts
export {
  ImportFileError,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ITEMS,
} from './model/importTypes';
export type { ImportFileErrorCode } from './model/importTypes';
```

- [ ] **Step 4: 분석 테스트 확인**

Run:

```bash
npm test -- src/features/insight-import/model/chromeImportFlow.test.ts
```

Expected:

```text
5 passed
```

- [ ] **Step 5: 커밋**

```bash
git add src/features/insight-import
git commit -m "feat: Chrome 가져오기 분석 규칙 추가"
```

---

### Task 3: 원자적 반영 RPC와 RLS 작성

**Files:**

- Create: `supabase/tests/database/insight_import_commit.test.sql`
- Create: `supabase/migrations/0002_insight_imports.sql`

- [ ] **Step 1: commit RPC의 실패하는 pgTAP 테스트 작성**

Create `supabase/tests/database/insight_import_commit.test.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'import-user@example.com',
    '',
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'other-user@example.com',
    '',
    now(),
    now()
  )
on conflict (id) do nothing;

create temporary table commit_result (value jsonb);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.insights (
  user_id,
  original_url,
  normalized_url,
  title,
  domain
) values (
  '11111111-1111-4111-8111-111111111111',
  'https://existing.example.com',
  'https://existing.example.com/',
  'Existing',
  'existing.example.com'
);

select has_table('public', 'import_batches', 'import_batches table exists');
select has_table('public', 'import_batch_items', 'import_batch_items table exists');

insert into commit_result (value)
select public.commit_insight_import(
  '[
    {
      "originalUrl": "https://existing.example.com",
      "normalizedUrl": "https://existing.example.com/",
      "title": "Existing duplicate",
      "domain": "existing.example.com",
      "collectionPath": ["기존"]
    },
    {
      "originalUrl": "https://react.dev/learn",
      "normalizedUrl": "https://react.dev/learn",
      "title": "React",
      "domain": "react.dev",
      "collectionPath": ["개발"]
    },
    {
      "originalUrl": "https://example.com/design",
      "normalizedUrl": "https://example.com/design",
      "title": "Design",
      "domain": "example.com",
      "collectionPath": ["디자인", "모바일"]
    }
  ]'::jsonb,
  4,
  0,
  1,
  '[{
    "code": "invalid-url",
    "rawUrl": "javascript:alert(1)",
    "title": "Unsafe",
    "message": "지원하지 않는 URL 형식입니다."
  }]'::jsonb
);

select is(
  ((select value from commit_result)->>'createdCount')::integer,
  2,
  'commit creates only new insights'
);

select is(
  ((select value from commit_result)->>'duplicateCount')::integer,
  1,
  'commit reports a race-time duplicate'
);

select is(
  (
    select count(*)::integer
    from public.insights
    where user_id = '11111111-1111-4111-8111-111111111111'
  ),
  3,
  'existing and imported insights coexist without duplicate rows'
);

select is(
  (
    select count(*)::integer
    from public.import_batch_items
    where user_id = '11111111-1111-4111-8111-111111111111'
  ),
  2,
  'batch items track created insights'
);

select results_eq(
  $$
    select collection_path
    from public.import_batch_items
    where normalized_url = 'https://react.dev/learn'
  $$,
  $$ values (array['개발']::text[]) $$,
  'batch items preserve the Chrome folder path'
);

select is(
  (
    select jsonb_array_length(issues)
    from public.import_batches
    where id = ((select value from commit_result)->>'batchId')::uuid
  ),
  1,
  'batch keeps minimal invalid-item details for post-completion review'
);

select throws_ok(
  $$
    select public.commit_insight_import(
      '[{
        "originalUrl": "javascript:alert(1)",
        "normalizedUrl": "javascript:alert(1)",
        "title": "Unsafe",
        "domain": "unsafe"
      }]'::jsonb,
      1,
      0,
      0,
      '[]'::jsonb
    )
  $$,
  '22023',
  'invalid import candidate',
  'invalid candidates fail the whole statement'
);

select is(
  (
    select count(*)::integer
    from public.insights
    where user_id = '11111111-1111-4111-8111-111111111111'
  ),
  3,
  'failed commit leaves no partial insight'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select is(
  (select count(*)::integer from public.import_batches),
  0,
  'RLS hides another user import batches'
);

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

delete from public.import_batches
where id = ((select value from commit_result)->>'batchId')::uuid;

select is(
  (
    select count(*)::integer
    from public.insights
    where user_id = '11111111-1111-4111-8111-111111111111'
  ),
  3,
  'deleting import history keeps imported insights'
);

select * from finish();
rollback;
```

- [ ] **Step 2: DB 테스트가 실패하는지 확인**

Run:

```bash
npx supabase start
npx supabase db reset
npx supabase test db supabase/tests/database/insight_import_commit.test.sql
```

Expected: `import_batches` 또는 `commit_insight_import`가 없어서 실패한다.

- [ ] **Step 3: 테이블, RLS, commit RPC 마이그레이션 작성**

Create `supabase/migrations/0002_insight_imports.sql`:

```sql
alter table public.insights
add column if not exists user_edited_at timestamptz;

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_format text not null,
  status text not null default 'committing',
  total_count integer not null,
  created_count integer not null default 0,
  duplicate_count integer not null default 0,
  invalid_count integer not null default 0,
  issues jsonb not null default '[]'::jsonb,
  preserved_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  undone_at timestamptz,
  constraint import_batches_source_format_check
    check (source_format in ('chrome_html')),
  constraint import_batches_status_check
    check (status in ('committing', 'completed', 'undone')),
  constraint import_batches_issues_check
    check (jsonb_typeof(issues) = 'array'),
  constraint import_batches_counts_check
    check (
      total_count >= 0
      and created_count >= 0
      and duplicate_count >= 0
      and invalid_count >= 0
      and preserved_count >= 0
    )
);

create index if not exists import_batches_user_created_idx
  on public.import_batches (user_id, created_at desc);

create table if not exists public.import_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  insight_id uuid references public.insights(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  normalized_url text not null,
  collection_path text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists import_batch_items_batch_idx
  on public.import_batch_items (batch_id);

alter table public.import_batches enable row level security;
alter table public.import_batch_items enable row level security;

create policy "Users can read own import batches"
on public.import_batches for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own import batches"
on public.import_batches for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own import batches"
on public.import_batches for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own import batches"
on public.import_batches for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own import batch items"
on public.import_batch_items for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own import batch items"
on public.import_batch_items for insert
to authenticated
with check ((select auth.uid()) = user_id);

create or replace function public.commit_insight_import(
  p_items jsonb,
  p_total_count integer,
  p_duplicate_count integer,
  p_invalid_count integer,
  p_issues jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid;
  v_created_count integer := 0;
  v_distinct_count integer;
  v_duplicate_count integer := p_duplicate_count;
  v_insight_id uuid;
  v_item record;
  v_payload_count integer;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = '22023', message = 'items must be an array';
  end if;

  v_payload_count := jsonb_array_length(p_items);

  if v_payload_count > 5000 then
    raise exception using errcode = '22023', message = 'too many import items';
  end if;

  if p_total_count < 0 or p_duplicate_count < 0 or p_invalid_count < 0 then
    raise exception using errcode = '22023', message = 'invalid import counts';
  end if;

  if jsonb_typeof(p_issues) <> 'array' or jsonb_array_length(p_issues) <> p_invalid_count then
    raise exception using errcode = '22023', message = 'import issues do not match';
  end if;

  if p_total_count <> v_payload_count + p_duplicate_count + p_invalid_count then
    raise exception using errcode = '22023', message = 'import counts do not match';
  end if;

  select count(*)
  into v_distinct_count
  from (
    select distinct item."normalizedUrl"
    from jsonb_to_recordset(p_items) as item(
      "originalUrl" text,
      "normalizedUrl" text,
      title text,
      domain text,
      "collectionPath" jsonb
    )
  ) as distinct_items;

  if v_distinct_count <> v_payload_count then
    raise exception using errcode = '22023', message = 'candidate list contains duplicates';
  end if;

  insert into public.import_batches (
    user_id,
    source_format,
    status,
    total_count,
    duplicate_count,
    invalid_count,
    issues
  ) values (
    v_user_id,
    'chrome_html',
    'committing',
    p_total_count,
    p_duplicate_count,
    p_invalid_count,
    p_issues
  )
  returning id into v_batch_id;

  for v_item in
    select
      btrim(item."originalUrl") as original_url,
      btrim(item."normalizedUrl") as normalized_url,
      btrim(item.title) as title,
      btrim(item.domain) as domain,
      coalesce(item."collectionPath", '[]'::jsonb) as collection_path
    from jsonb_to_recordset(p_items) as item(
      "originalUrl" text,
      "normalizedUrl" text,
      title text,
      domain text,
      "collectionPath" jsonb
    )
    order by item."normalizedUrl"
  loop
    if
      v_item.original_url !~ '^https?://'
      or v_item.normalized_url !~ '^https?://'
      or coalesce(v_item.domain, '') = ''
      or jsonb_typeof(v_item.collection_path) <> 'array'
    then
      raise exception using errcode = '22023', message = 'invalid import candidate';
    end if;

    v_insight_id := null;

    insert into public.insights (
      user_id,
      original_url,
      normalized_url,
      title,
      description,
      thumbnail_url,
      domain,
      memo,
      metadata_status
    ) values (
      v_user_id,
      v_item.original_url,
      v_item.normalized_url,
      coalesce(nullif(v_item.title, ''), v_item.domain),
      null,
      null,
      v_item.domain,
      null,
      'pending'
    )
    on conflict (user_id, normalized_url) do nothing
    returning id into v_insight_id;

    if v_insight_id is null then
      v_duplicate_count := v_duplicate_count + 1;
    else
      v_created_count := v_created_count + 1;

      insert into public.import_batch_items (
        batch_id,
        insight_id,
        user_id,
        normalized_url,
        collection_path
      ) values (
        v_batch_id,
        v_insight_id,
        v_user_id,
        v_item.normalized_url,
        array(
          select jsonb_array_elements_text(v_item.collection_path)
        )
      );
    end if;
  end loop;

  update public.import_batches
  set
    status = 'completed',
    created_count = v_created_count,
    duplicate_count = v_duplicate_count,
    completed_at = now()
  where id = v_batch_id;

  return jsonb_build_object(
    'batchId', v_batch_id,
    'createdCount', v_created_count,
    'duplicateCount', v_duplicate_count,
    'invalidCount', p_invalid_count,
    'totalCount', p_total_count
  );
end;
$$;

revoke all on function public.commit_insight_import(
  jsonb,
  integer,
  integer,
  integer,
  jsonb
) from public;

grant execute on function public.commit_insight_import(
  jsonb,
  integer,
  integer,
  integer,
  jsonb
) to authenticated;
```

- [ ] **Step 4: DB 초기화와 commit 테스트 확인**

Run:

```bash
npx supabase db reset
npx supabase test db supabase/tests/database/insight_import_commit.test.sql
npx supabase db lint --local
```

Expected:

```text
All tests successful.
Result: PASS
No schema errors found
```

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/0002_insight_imports.sql supabase/tests/database/insight_import_commit.test.sql
git commit -m "feat: 인사이트 가져오기 원자적 반영 추가"
```

---

### Task 4: 사용자 수정 보호와 Undo RPC 작성

**Files:**

- Create: `supabase/tests/database/insight_import_undo.test.sql`
- Modify: `supabase/migrations/0002_insight_imports.sql`

- [ ] **Step 1: Undo의 실패하는 pgTAP 테스트 작성**

Create `supabase/tests/database/insight_import_undo.test.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at
) values
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'undo-user@example.com',
    '',
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'undo-other@example.com',
    '',
    now(),
    now()
  )
on conflict (id) do nothing;

create temporary table undo_state (
  batch_id uuid,
  result jsonb
);

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

insert into undo_state (batch_id)
select (
  public.commit_insight_import(
    '[
      {
        "originalUrl": "https://example.com/keep",
        "normalizedUrl": "https://example.com/keep",
        "title": "Keep",
        "domain": "example.com"
      },
      {
        "originalUrl": "https://example.com/delete",
        "normalizedUrl": "https://example.com/delete",
        "title": "Delete",
        "domain": "example.com"
      }
    ]'::jsonb,
    2,
    0,
    0,
    '[]'::jsonb
  )->>'batchId'
)::uuid;

update public.insights
set title = '사용자가 수정한 제목'
where normalized_url = 'https://example.com/keep';

select ok(
  (
    select user_edited_at is not null
    from public.insights
    where normalized_url = 'https://example.com/keep'
  ),
  'editing a user field marks the insight as user edited'
);

update undo_state
set result = public.undo_insight_import(batch_id);

select is(
  ((select result from undo_state)->>'deletedCount')::integer,
  1,
  'undo deletes an untouched imported insight'
);

select is(
  ((select result from undo_state)->>'preservedCount')::integer,
  1,
  'undo preserves a user-edited imported insight'
);

select results_eq(
  $$
    select normalized_url
    from public.insights
    where user_id = '33333333-3333-4333-8333-333333333333'
    order by normalized_url
  $$,
  $$ values ('https://example.com/keep'::text) $$,
  'only the edited imported insight remains'
);

select throws_ok(
  format(
    'select public.undo_insight_import(%L::uuid)',
    (select batch_id from undo_state)
  ),
  'P0001',
  'import batch is not undoable',
  'the same batch cannot be undone twice'
);

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';

select throws_ok(
  format(
    'select public.undo_insight_import(%L::uuid)',
    (select batch_id from undo_state)
  ),
  'P0001',
  'import batch not found',
  'another user cannot undo the batch'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Undo 테스트가 실패하는지 확인**

Run:

```bash
npx supabase test db supabase/tests/database/insight_import_undo.test.sql
```

Expected: `undo_insight_import`가 없어서 실패한다.

- [ ] **Step 3: 사용자 수정 추적 trigger와 Undo RPC 추가**

Append to `supabase/migrations/0002_insight_imports.sql`:

```sql
create or replace function public.track_imported_insight_user_edit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if
    (select auth.uid()) = old.user_id
    and (
      new.title is distinct from old.title
      or new.memo is distinct from old.memo
    )
  then
    new.user_edited_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists insights_track_import_user_edit on public.insights;
create trigger insights_track_import_user_edit
before update on public.insights
for each row execute function public.track_imported_insight_user_edit();

create or replace function public.track_imported_category_edit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_insight_id uuid;
begin
  if tg_op = 'DELETE' then
    v_insight_id := old.insight_id;
  else
    v_insight_id := new.insight_id;
  end if;

  if (select auth.uid()) is not null then
    update public.insights
    set user_edited_at = now()
    where id = v_insight_id
      and user_id = (select auth.uid());
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists insight_categories_track_import_insert
on public.insight_categories;
create trigger insight_categories_track_import_insert
after insert on public.insight_categories
for each row execute function public.track_imported_category_edit();

drop trigger if exists insight_categories_track_import_delete
on public.insight_categories;
create trigger insight_categories_track_import_delete
after delete on public.insight_categories
for each row execute function public.track_imported_category_edit();

create or replace function public.undo_insight_import(p_batch_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch public.import_batches%rowtype;
  v_deleted_count integer := 0;
  v_preserved_count integer := 0;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select *
  into v_batch
  from public.import_batches
  where id = p_batch_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'import batch not found';
  end if;

  if v_batch.status <> 'completed' then
    raise exception 'import batch is not undoable';
  end if;

  select count(*)::integer
  into v_preserved_count
  from public.import_batch_items as item
  join public.insights as insight on insight.id = item.insight_id
  where item.batch_id = p_batch_id
    and item.user_id = v_user_id
    and insight.user_edited_at is not null;

  delete from public.insights as insight
  using public.import_batch_items as item
  where item.batch_id = p_batch_id
    and item.user_id = v_user_id
    and item.insight_id = insight.id
    and insight.user_id = v_user_id
    and insight.user_edited_at is null;

  get diagnostics v_deleted_count = row_count;

  update public.import_batches
  set
    status = 'undone',
    preserved_count = v_preserved_count,
    undone_at = now()
  where id = p_batch_id;

  return jsonb_build_object(
    'batchId', p_batch_id,
    'deletedCount', v_deleted_count,
    'preservedCount', v_preserved_count
  );
end;
$$;

revoke all on function public.undo_insight_import(uuid) from public;
grant execute on function public.undo_insight_import(uuid) to authenticated;
```

- [ ] **Step 4: 전체 DB 테스트와 lint 확인**

Run:

```bash
npx supabase db reset
npx supabase test db
npx supabase db lint --local
```

Expected:

```text
All tests successful.
Result: PASS
No schema errors found
```

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/0002_insight_imports.sql supabase/tests/database/insight_import_undo.test.sql
git commit -m "feat: 가져오기 작업 Undo 추가"
```

---

### Task 5: 프론트엔드 DB 타입과 Repository 연결

**Files:**

- Modify: `src/shared/api/database.types.ts`
- Modify: `src/shared/api/index.ts`
- Create: `src/features/insight-import/api/importRepository.ts`
- Modify: `src/features/insight-import/index.ts`

- [ ] **Step 1: 데이터베이스 row 타입 확장**

Add `user_edited_at` to `InsightRow` in `src/shared/api/database.types.ts`:

```ts
export type InsightRow = {
  created_at: string;
  description: string | null;
  domain: string;
  id: string;
  memo: string | null;
  metadata_status: 'pending' | 'ready' | 'failed';
  normalized_url: string;
  original_url: string;
  thumbnail_url: string | null;
  title: string;
  updated_at: string;
  user_edited_at: string | null;
  user_id: string;
};
```

Replace `InsightInsert` so server-managed edit state is omitted:

```ts
export type InsightInsert = Omit<
  InsightRow,
  'created_at' | 'id' | 'updated_at' | 'user_edited_at'
>;
```

Add these types:

```ts
export type ImportBatchStatus = 'committing' | 'completed' | 'undone';

export type ImportBatchIssue = {
  code: string;
  message: string;
  rawUrl: string;
  title: string;
};

export type ImportBatchRow = {
  completed_at: string | null;
  created_at: string;
  created_count: number;
  duplicate_count: number;
  id: string;
  invalid_count: number;
  issues: ImportBatchIssue[];
  preserved_count: number;
  source_format: 'chrome_html';
  status: ImportBatchStatus;
  total_count: number;
  undone_at: string | null;
  user_id: string;
};

export type ImportBatchItemRow = {
  batch_id: string;
  collection_path: string[];
  created_at: string;
  id: string;
  insight_id: string | null;
  normalized_url: string;
  user_id: string;
};
```

Replace `src/shared/api/index.ts` with the complete public API:

```ts
export { supabase } from './supabase';
export type {
  CategoryInsert,
  CategoryRow,
  ImportBatchItemRow,
  ImportBatchIssue,
  ImportBatchRow,
  ImportBatchStatus,
  InsightCategoryRow,
  InsightInsert,
  InsightRow,
  ProfileRow,
} from './database.types';
```

- [ ] **Step 2: Repository 구현**

Create `src/features/insight-import/api/importRepository.ts`:

```ts
import { z } from 'zod';
import { supabase } from '@/shared/api';
import type { ImportBatchRow } from '@/shared/api';
import type {
  ImportCommitInput,
  ImportCommitResult,
  ImportUndoResult,
  InsightImportPort,
} from '../model/importTypes';

const commitResultSchema = z.object({
  batchId: z.string().uuid(),
  createdCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  invalidCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

const undoResultSchema = z.object({
  batchId: z.string().uuid(),
  deletedCount: z.number().int().nonnegative(),
  preservedCount: z.number().int().nonnegative(),
});

export async function listMyNormalizedUrls(userId: string) {
  const { data, error } = await supabase
    .from('insights')
    .select('normalized_url')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return new Set(
    (data ?? []).map((row) => String(row.normalized_url))
  ) as ReadonlySet<string>;
}

export async function commitInsightImportToDatabase(
  input: ImportCommitInput
): Promise<ImportCommitResult> {
  const { data, error } = await supabase.rpc('commit_insight_import', {
    p_duplicate_count: input.duplicateCount,
    p_invalid_count: input.invalidCount,
    p_issues: input.issues,
    p_items: input.candidates.map((candidate) => ({
      collectionPath: candidate.collectionPath,
      domain: candidate.domain,
      normalizedUrl: candidate.normalizedUrl,
      originalUrl: candidate.originalUrl,
      title: candidate.title,
    })),
    p_total_count: input.totalCount,
  });

  if (error) {
    throw error;
  }

  return commitResultSchema.parse(data);
}

export const databaseInsightImportPort: InsightImportPort = {
  commit: commitInsightImportToDatabase,
};

export async function listMyImportBatches(userId: string) {
  const { data, error } = await supabase
    .from('import_batches')
    .select(
      'id,user_id,source_format,status,total_count,created_count,duplicate_count,invalid_count,issues,preserved_count,created_at,completed_at,undone_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)
    .returns<ImportBatchRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function undoInsightImportInDatabase(
  batchId: string
): Promise<ImportUndoResult> {
  const { data, error } = await supabase.rpc('undo_insight_import', {
    p_batch_id: batchId,
  });

  if (error) {
    throw error;
  }

  return undoResultSchema.parse(data);
}

export async function deleteInsightImportRecord(batchId: string) {
  const { error } = await supabase
    .from('import_batches')
    .delete()
    .eq('id', batchId);

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 3: feature public API 갱신**

Add to `src/features/insight-import/index.ts`:

```ts
export {
  databaseInsightImportPort,
  deleteInsightImportRecord,
  listMyImportBatches,
  listMyNormalizedUrls,
  undoInsightImportInDatabase,
} from './api/importRepository';
```

- [ ] **Step 4: 타입과 기존 저장 흐름 회귀 확인**

Run:

```bash
npm test -- src/features/insight-import/model/chromeImportFlow.test.ts src/features/insight-save/model/saveInsight.test.ts
npm run build
```

Expected:

```text
All selected tests passed
✓ built in
```

- [ ] **Step 5: 커밋**

```bash
git add src/shared/api src/features/insight-import
git commit -m "feat: 가져오기 Repository 연결"
```

---

### Task 6: 파일 분석·확인·Undo UI 작성

**Files:**

- Create: `src/features/insight-import/ui/InsightImportPanel.test.tsx`
- Create: `src/features/insight-import/ui/InsightImportPanel.tsx`
- Create: `src/features/insight-import/ui/InsightImportPanel.css`
- Modify: `src/features/insight-import/index.ts`

- [ ] **Step 1: 사용자 관찰 흐름의 실패 테스트 작성**

Create `src/features/insight-import/ui/InsightImportPanel.test.tsx`:

```tsx
/* @vitest-environment jsdom */
import { ThemeProvider } from '@wanteddev/wds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import chromeBookmarksHtml from '../__fixtures__/chrome-bookmarks.html?raw';
import type { InsightImportPanelServices } from './InsightImportPanel';
import { InsightImportPanel } from './InsightImportPanel';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPanel(services: InsightImportPanelServices) {
  return render(
    <ThemeProvider>
      <InsightImportPanel
        onImported={() => undefined}
        services={services}
        userId="11111111-1111-4111-8111-111111111111"
      />
    </ThemeProvider>
  );
}

function createServices(
  overrides: Partial<InsightImportPanelServices> = {}
): InsightImportPanelServices {
  return {
    commit: async (analysis) => ({
      batchId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      createdCount: analysis.newCandidates.length,
      duplicateCount: analysis.summary.duplicateCount,
      invalidCount: analysis.summary.invalidCount,
      totalCount: analysis.summary.totalCount,
    }),
    deleteRecord: async () => undefined,
    listBatches: async () => [],
    listNormalizedUrls: async () => new Set(),
    undo: async (batchId) => ({
      batchId,
      deletedCount: 2,
      preservedCount: 0,
    }),
    ...overrides,
  };
}

describe('InsightImportPanel', () => {
  it('shows a summary before committing and then shows the completed result', async () => {
    const user = userEvent.setup();
    renderPanel(createServices());

    const file = new File([chromeBookmarksHtml], 'bookmarks.html', {
      type: 'text/html',
    });
    await user.upload(screen.getByLabelText('Chrome 북마크 HTML 파일'), file);

    expect(await screen.findByText('신규 2개')).toBeInTheDocument();
    expect(screen.queryByText('2개를 가져왔어요.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2개 가져오기' }));

    expect(await screen.findByText('2개를 가져왔어요.')).toBeInTheDocument();
  });

  it('rejects a non-Chrome HTML file before commit', async () => {
    const user = userEvent.setup();
    renderPanel(createServices());

    await user.upload(
      screen.getByLabelText('Chrome 북마크 HTML 파일'),
      new File(['<html></html>'], 'not-bookmarks.html', {
        type: 'text/html',
      })
    );

    expect(
      await screen.findByText(
        'Chrome에서 내보낸 북마크 HTML 파일을 선택해 주세요.'
      )
    ).toBeInTheDocument();
  });

  it('offers batch undo from import history', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPanel(
      createServices({
        listBatches: async () => [
          {
            completed_at: '2026-07-10T00:00:00Z',
            created_at: '2026-07-10T00:00:00Z',
            created_count: 2,
            duplicate_count: 0,
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            invalid_count: 0,
            issues: [],
            preserved_count: 0,
            source_format: 'chrome_html',
            status: 'completed',
            total_count: 2,
            undone_at: null,
            user_id: '11111111-1111-4111-8111-111111111111',
          },
        ],
      })
    );

    await user.click(
      await screen.findByRole('button', { name: '가져오기 되돌리기' })
    );

    expect(
      await screen.findByText(
        '2개를 되돌렸어요. 수정한 인사이트 0개는 유지했어요.'
      )
    ).toBeInTheDocument();
  });

  it('deletes import history without presenting it as insight deletion', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPanel(
      createServices({
        listBatches: async () => [
          {
            completed_at: '2026-07-10T00:00:00Z',
            created_at: '2026-07-10T00:00:00Z',
            created_count: 2,
            duplicate_count: 0,
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            invalid_count: 0,
            issues: [],
            preserved_count: 0,
            source_format: 'chrome_html',
            status: 'undone',
            total_count: 2,
            undone_at: '2026-07-10T00:01:00Z',
            user_id: '11111111-1111-4111-8111-111111111111',
          },
        ],
      })
    );

    await user.click(await screen.findByRole('button', { name: '기록 삭제' }));

    expect(
      await screen.findByText('가져오기 기록을 삭제했어요.')
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: UI 테스트가 실패하는지 확인**

Run:

```bash
npm test -- src/features/insight-import/ui/InsightImportPanel.test.tsx
```

Expected:

```text
FAIL src/features/insight-import/ui/InsightImportPanel.test.tsx
Cannot find module './InsightImportPanel'
```

- [ ] **Step 3: InsightImportPanel 구현**

Create `src/features/insight-import/ui/InsightImportPanel.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@wanteddev/wds';
import type { ImportBatchRow } from '@/shared/api';
import {
  databaseInsightImportPort,
  deleteInsightImportRecord,
  listMyImportBatches,
  listMyNormalizedUrls,
  undoInsightImportInDatabase,
} from '../api/importRepository';
import { analyzeChromeImport } from '../model/analyzeChromeImport';
import { commitInsightImport } from '../model/commitInsightImport';
import { ImportFileError } from '../model/importTypes';
import type {
  ChromeImportAnalysis,
  ImportCommitResult,
  ImportUndoResult,
} from '../model/importTypes';
import './InsightImportPanel.css';

export type InsightImportPanelServices = {
  commit: (analysis: ChromeImportAnalysis) => Promise<ImportCommitResult>;
  deleteRecord: (batchId: string) => Promise<void>;
  listBatches: (userId: string) => Promise<ImportBatchRow[]>;
  listNormalizedUrls: (userId: string) => Promise<ReadonlySet<string>>;
  undo: (batchId: string) => Promise<ImportUndoResult>;
};

const defaultServices: InsightImportPanelServices = {
  commit: (analysis) =>
    commitInsightImport({
      analysis,
      port: databaseInsightImportPort,
    }),
  listBatches: listMyImportBatches,
  listNormalizedUrls: listMyNormalizedUrls,
  deleteRecord: deleteInsightImportRecord,
  undo: undoInsightImportInDatabase,
};

type InsightImportPanelProps = {
  onImported: () => void | Promise<void>;
  services?: InsightImportPanelServices;
  userId: string;
};

export function InsightImportPanel({
  onImported,
  services = defaultServices,
  userId,
}: InsightImportPanelProps) {
  const [analysis, setAnalysis] = useState<ChromeImportAnalysis | null>(null);
  const [batches, setBatches] = useState<ImportBatchRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const refreshBatches = useCallback(async () => {
    setBatches(await services.listBatches(userId));
  }, [services, userId]);

  useEffect(() => {
    void refreshBatches();
  }, [refreshBatches]);

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setAnalysis(null);
    setErrorMessage('');
    setStatusMessage('');
    setIsBusy(true);

    try {
      const [html, existingNormalizedUrls] = await Promise.all([
        file.text(),
        services.listNormalizedUrls(userId),
      ]);
      setAnalysis(
        analyzeChromeImport({
          existingNormalizedUrls,
          fileSizeBytes: file.size,
          html,
        })
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ImportFileError || error instanceof Error
          ? error.message
          : '파일을 분석하지 못했습니다.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!analysis) {
      return;
    }

    setIsBusy(true);
    setErrorMessage('');

    try {
      const result = await services.commit(analysis);
      setStatusMessage(`${result.createdCount}개를 가져왔어요.`);
      setAnalysis(null);
      await Promise.all([refreshBatches(), onImported()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '가져오기를 완료하지 못했습니다.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleUndo = async (batchId: string) => {
    if (!window.confirm('이 가져오기 작업을 되돌릴까요?')) {
      return;
    }

    setIsBusy(true);
    setErrorMessage('');

    try {
      const result = await services.undo(batchId);
      setStatusMessage(
        `${result.deletedCount}개를 되돌렸어요. 수정한 인사이트 ${result.preservedCount}개는 유지했어요.`
      );
      await Promise.all([refreshBatches(), onImported()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '가져오기를 되돌리지 못했습니다.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteRecord = async (batchId: string) => {
    if (
      !window.confirm(
        '가져오기 기록과 Undo 권한을 삭제할까요? 인사이트는 유지됩니다.'
      )
    ) {
      return;
    }

    setIsBusy(true);
    setErrorMessage('');

    try {
      await services.deleteRecord(batchId);
      setStatusMessage('가져오기 기록을 삭제했어요.');
      await refreshBatches();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '가져오기 기록을 삭제하지 못했습니다.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="insight-import" aria-labelledby="insight-import-title">
      <div className="insight-import__heading">
        <p className="section-kicker">기존 저장물</p>
        <h3 id="insight-import-title">Chrome 북마크 가져오기</h3>
        <p>
          Chrome 북마크 관리자에서 HTML 파일을 내보낸 뒤 선택해 주세요. 파일은
          브라우저에서만 읽고 서버에 업로드하지 않습니다.
        </p>
      </div>

      <label className="insight-import__file">
        <span>Chrome 북마크 HTML 파일</span>
        <input
          accept=".html,text/html"
          disabled={isBusy}
          onChange={(event) => void handleFile(event.target.files?.[0])}
          type="file"
        />
      </label>

      {analysis ? (
        <div className="insight-import__analysis">
          <dl aria-label="가져오기 분석 결과">
            <div>
              <dt>신규</dt>
              <dd>신규 {analysis.summary.newCount}개</dd>
            </div>
            <div>
              <dt>중복</dt>
              <dd>중복 {analysis.summary.duplicateCount}개</dd>
            </div>
            <div>
              <dt>오류</dt>
              <dd>오류 {analysis.summary.invalidCount}개</dd>
            </div>
          </dl>
          <Button
            color="primary"
            disabled={analysis.summary.newCount === 0 || isBusy}
            onClick={() => void handleCommit()}
            size="medium"
            type="button"
            variant="solid"
          >
            {analysis.summary.newCount}개 가져오기
          </Button>
          {analysis.issues.length > 0 ? (
            <details>
              <summary>제외된 항목 확인</summary>
              <ul>
                {analysis.issues.map((issue, index) => (
                  <li key={`${issue.rawUrl}-${index}`}>
                    {issue.title || issue.rawUrl}: {issue.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {statusMessage ? <p role="status">{statusMessage}</p> : null}

      {batches.length > 0 ? (
        <div className="insight-import__history">
          <h4>최근 가져오기</h4>
          <ul>
            {batches.map((batch) => (
              <li key={batch.id}>
                <span>
                  {batch.created_count}개 가져옴 · 중복 {batch.duplicate_count}
                  개
                </span>
                {batch.status === 'completed' ? (
                  <Button
                    color="primary"
                    disabled={isBusy}
                    onClick={() => void handleUndo(batch.id)}
                    size="small"
                    type="button"
                    variant="outlined"
                  >
                    가져오기 되돌리기
                  </Button>
                ) : (
                  <span>되돌림 완료</span>
                )}
                {batch.issues.length > 0 ? (
                  <details>
                    <summary>제외된 항목 확인</summary>
                    <ul>
                      {batch.issues.map((issue, index) => (
                        <li key={`${issue.rawUrl}-${index}`}>
                          {issue.title || issue.rawUrl}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <Button
                  color="primary"
                  disabled={isBusy}
                  onClick={() => void handleDeleteRecord(batch.id)}
                  size="small"
                  type="button"
                  variant="ghost"
                >
                  기록 삭제
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: 기능 전용 스타일 작성**

Create `src/features/insight-import/ui/InsightImportPanel.css`:

```css
.insight-import {
  display: grid;
  gap: 20px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  background: var(--color-card);
}

.insight-import__heading {
  display: grid;
  gap: 8px;
}

.insight-import__heading h3,
.insight-import__history h4 {
  margin: 0;
}

.insight-import__heading p {
  max-width: 680px;
  margin: 0;
  color: var(--color-muted);
  line-height: 24px;
}

.insight-import__file {
  display: grid;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.insight-import__file input {
  min-height: 44px;
  border: 1px solid var(--color-border-strong);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--color-bg);
}

.insight-import__analysis,
.insight-import__history {
  display: grid;
  gap: 16px;
}

.insight-import__analysis dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.insight-import__analysis dl div {
  border-radius: 8px;
  padding: 12px;
  background: var(--color-surface);
}

.insight-import__analysis dt {
  color: var(--color-muted);
  font-size: 13px;
}

.insight-import__analysis dd {
  margin: 4px 0 0;
  font-weight: 700;
}

.insight-import__history ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.insight-import__history li {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 640px) {
  .insight-import {
    padding: 16px;
  }

  .insight-import__analysis dl {
    grid-template-columns: 1fr;
  }

  .insight-import__history li {
    align-items: stretch;
    flex-direction: column;
  }
}
```

- [ ] **Step 5: public API와 UI 테스트 확인**

Add to `src/features/insight-import/index.ts`:

```ts
export { InsightImportPanel } from './ui/InsightImportPanel';
export type { InsightImportPanelServices } from './ui/InsightImportPanel';
```

Run:

```bash
npm test -- src/features/insight-import/ui/InsightImportPanel.test.tsx
```

Expected:

```text
4 passed
```

- [ ] **Step 6: 커밋**

```bash
git add src/features/insight-import
git commit -m "feat: Chrome 가져오기 확인과 Undo UI 추가"
```

---

### Task 7: 보관함에 선택적 진입점 연결

**Files:**

- Modify: `src/pages/library/ui/LibraryPage.tsx`

- [ ] **Step 1: 보관함 새로고침 함수를 안정된 callback으로 분리**

Add `useCallback` to the React import and add the feature import:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InsightImportPanel } from '@/features/insight-import';
```

Replace the insight-loading portion with:

```tsx
const refreshInsights = useCallback(async () => {
  if (!userId) {
    return;
  }

  setInsights(await getMyInsights(userId));
}, [userId]);

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
```

- [ ] **Step 2: 비어 있는 보관함과 기존 보관함에 선택적 진입점 배치**

Insert before the insight list section:

```tsx
{
  userId && insights.length === 0 ? (
    <InsightImportPanel onImported={refreshInsights} userId={userId} />
  ) : null;
}

{
  userId && insights.length > 0 ? (
    <details className="library-import-entry">
      <summary>기존 저장물 가져오기</summary>
      <InsightImportPanel onImported={refreshInsights} userId={userId} />
    </details>
  ) : null;
}
```

This keeps migration out of mandatory onboarding, makes it prominent in an empty library, and leaves a persistent optional entry after the user has data.

- [ ] **Step 3: 회귀 테스트와 빌드 확인**

Run:

```bash
npm test -- src/features/insight-import src/pages/library
npm run build
```

Expected:

```text
All selected tests passed
✓ built in
```

- [ ] **Step 4: 브라우저에서 시각·반응형 확인**

Run:

```bash
npm run dev
```

Use the in-app browser and verify:

1. 빈 보관함에서는 가져오기 패널이 바로 보인다.
2. 기존 인사이트가 있으면 `기존 저장물 가져오기`가 접힌 상태로 보인다.
3. 1280px, 768px, 390px 너비에서 요약 카드와 버튼이 잘리지 않는다.
4. 키보드만으로 파일 입력, 가져오기, 예외 상세, Undo에 접근할 수 있다.
5. Chrome 픽스처를 선택해도 원본 파일 내용이 네트워크 요청 payload에 포함되지 않는다.
6. 가져오기 완료 후 새 인사이트가 보관함에 나타난다.

Expected: 콘솔 오류와 가로 overflow가 없고 위 여섯 동작이 모두 확인된다.

- [ ] **Step 5: 커밋**

```bash
git add src/pages/library/ui/LibraryPage.tsx
git commit -m "feat: 보관함에 가져오기 진입점 연결"
```

---

### Task 8: 문서 갱신과 전체 검증

**Files:**

- Modify: `docs/backlog.md`
- Modify: `docs/checklist.md`
- Modify: `README.md`

- [ ] **Step 1: 백로그에 마이그레이션 단계 추가**

Add a `P1. 기존 저장물 가져오기` section to `docs/backlog.md`:

```markdown
## P1. 기존 저장물 가져오기

- [x] Chrome 북마크 HTML 분석
- [x] 브라우저 안에서 원본 파일 파싱
- [x] 신규·중복·오류 묶음 요약
- [x] 한 번의 확인 후 원자적 반영
- [x] 가져오기 작업 기록
- [x] 완료 후 제외 항목 선택 검토
- [x] 가져오기 기록과 임시 작업 데이터 삭제
- [x] 사용자 수정 데이터를 보호하는 작업 단위 Undo
- [x] Chrome 폴더 경로 임시 보존
- [ ] Notion CSV/Markdown 어댑터
- [ ] 범용 파일 필드 매퍼
- [ ] 외부 컬렉션의 카테고리 일괄 연결
- [ ] Pinterest 데이터 아카이브 샘플 검증
- [ ] 원격 썸네일 갤러리 보기
```

- [ ] **Step 2: 주간 체크리스트에 요약 추가**

Add this item to the 4주차 작업 목록 in `docs/checklist.md`:

```markdown
- [ ] **[P1] 기존 저장물 가져오기** — Chrome 북마크 HTML을 브라우저에서 분석하고 신규·중복·오류를 확인한 뒤 원자적으로 반영하고 Undo를 제공한다. ([백로그](backlog.md#p1-기존-저장물-가져오기) · [구현 계획](superpowers/plans/2026-07-10-chrome-insight-import.md))
```

Add this item to the 4주차 완료 기준:

```markdown
- [ ] Chrome 북마크 파일을 선택해 가져오기 결과를 확인하고, 필요하면 사용자 수정 데이터를 보존한 채 작업 단위로 Undo할 수 있다.
```

- [ ] **Step 3: README에 설계와 계획 링크 추가**

Add these rows to the documentation table in `README.md`:

```markdown
| 기존 저장물 마이그레이션의 제품·데이터 원칙을 확인할 때 | [마이그레이션 설계](docs/superpowers/specs/2026-07-10-insight-migration-design.md) |
| Chrome 북마크 가져오기 기반을 구현할 때 | [Chrome 가져오기 구현 계획](docs/superpowers/plans/2026-07-10-chrome-insight-import.md) |
```

- [ ] **Step 4: 전체 자동 검증**

Run:

```bash
npm test
npx supabase test db
npx supabase db lint --local
npm run lint
npm run format:check
npm run build
git diff --check
```

Expected:

```text
All Vitest suites passed
All pgTAP tests successful
No schema errors found
ESLint exits with code 0
Prettier reports all matched files use Prettier code style
Vite build completes successfully
git diff --check exits with code 0
```

- [ ] **Step 5: 명시적 보안 회귀 확인**

Run:

```bash
npm test -- src/entities/insight/lib/url.test.ts src/features/insight-import/model/chromeImportFlow.test.ts
npx supabase test db supabase/tests/database/insight_import_commit.test.sql
```

Expected:

- `javascript:`, `data:`, `file:`, `ftp:` URL 테스트가 통과한다.
- 잘못된 후보가 DB 반영 전체를 실패시키고 부분 데이터가 남지 않는다.
- 다른 사용자의 가져오기 기록이 RLS로 보이지 않는다.

- [ ] **Step 6: 문서 커밋**

```bash
git add docs/backlog.md docs/checklist.md README.md
git commit -m "docs: Chrome 가져오기 진행 상태 반영"
```

---

## Self-Review

### Spec coverage

- 선택적 진입점은 Task 7에서 처리한다.
- 범용 파이프라인의 첫 어댑터와 임시 후보 계약은 Tasks 1-2에서 처리한다.
- Chrome 폴더 경로의 작업 데이터 보존은 Tasks 1, 3, 5에서 처리한다.
- 사용자별 정규화 URL 중복과 기존 데이터 보호는 Tasks 2-4에서 처리한다.
- 파일 단위 차단과 항목 단위 오류 제외는 Task 2에서 처리한다.
- 묶음 확인, 결과, 선택적 예외 확인은 Task 6에서 처리한다.
- 오류 항목의 최소 필드 보존과 완료 후 검토는 Tasks 3, 5, 6에서 처리한다.
- 원자적 반영과 부분 실패 복구는 Task 3의 단일 RPC 트랜잭션으로 처리한다.
- 작업 단위 Undo와 사용자 수정 보호는 Task 4에서 처리한다.
- 가져오기 기록 삭제와 임시 작업 데이터 정리는 Tasks 3, 5, 6에서 처리한다.
- 원본 파일 비보관은 Task 6에서 브라우저 메모리 파싱으로 더 엄격하게 충족한다.
- Notion, 범용 매퍼, SNS, 갤러리는 승인된 단계별 출시 범위에 따라 별도 계획으로 분리한다.

### Placeholder scan

- 모든 코드 변경 단계에 정확한 파일 경로와 코드가 있다.
- 모든 테스트 단계에 실행 명령과 기대 결과가 있다.
- 후속 범위는 자리표시자가 아니라 독립 계획으로 명시적으로 제외했다.

### Type consistency

- `ChromeImportAnalysis.newCandidates`는 `ImportCommitInput.candidates`로 전달된다.
- `ImportCommitResult`와 `commit_insight_import` JSON key는 camelCase로 일치한다.
- `ImportUndoResult`와 `undo_insight_import` JSON key는 camelCase로 일치한다.
- DB row 타입은 snake_case를 유지하고 UI에서 그대로 조회한다.
- `ImportBatchStatus` 값은 SQL check constraint와 TypeScript union이 일치한다.

## References

- [제품 설계](../specs/2026-07-10-insight-migration-design.md)
- [개발 아키텍처](../../development-architecture.md)
- [디자인 시스템](../../../DESIGN.md)
- [Chrome 북마크 공식 안내](https://support.google.com/chrome/answer/96816)
- [Supabase database testing](https://supabase.com/docs/guides/local-development/testing/overview)
- [Supabase CLI test db](https://supabase.com/docs/reference/cli/supabase-orgs-list)

## Execution Handoff

계획 실행 전 `실행 전제` 검사를 먼저 통과한다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 요구사항 검토와 코드 품질 검토를 수행한다.

**2. Inline Execution** - 현재 세션에서 `superpowers:executing-plans` 방식으로 실행하고, 태스크 묶음마다 검토한다.
