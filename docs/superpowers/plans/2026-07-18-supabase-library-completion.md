# Supabase 보관함 관리·검색 완성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase 인사이트의 URL 불변 수정 경계를 고정하고 원격 보관함의 로딩·빈 상태·조회 실패를 검색과 꺼내보기 화면에서 명확히 구분한다.

**Architecture:** `entities/insight`의 Supabase 어댑터가 수정 가능 필드를 제한하고, 기존 RLS와 사용자 ID 조건은 유지한다. `app`은 저장소 상태를 `pages/home`의 표시 상태로 변환하며 검색·꺼내보기 순수 함수와 랭킹 계약은 변경하지 않는다.

**Tech Stack:** React 19, TypeScript 6, Supabase JS 2, Vitest 4, Testing Library

---

### Task 1: #31 Supabase 수정 필드 불변 경계

**Files:**

- Modify: `src/entities/insight/api/supabase_insight_repository.test.ts`
- Modify: `src/entities/insight/api/supabase_insight_repository.ts`

- [x] **Step 1: URL 변조 입력을 수정 페이로드에서 제외하는 실패 테스트 작성**

기존 `사용자와 인사이트 ID를 함께 제한해 수정하고 서버 값을 반환한다` 테스트에서 저장소에 전달할 값을 다음처럼 URL 계열이 달라진 인사이트로 만든다.

```ts
const changedAddressInsight = {
  ...INSIGHT,
  domain: 'changed.example',
  normalizedUrl: 'https://changed.example/article',
  originalUrl: 'https://changed.example/article',
};

await expect(repository.update(changedAddressInsight)).resolves.toEqual({
  insight: INSIGHT,
  ok: true,
});
expect(update).toHaveBeenCalledWith({
  category: changedAddressInsight.category,
  memo: changedAddressInsight.memo,
  title: changedAddressInsight.title,
  title_origin: changedAddressInsight.titleOrigin,
});
```

기존 ID와 사용자 ID 조건 기대값은 그대로 유지한다.

- [x] **Step 2: 실패 테스트 실행**

Run:

```powershell
npm test -- src/entities/insight/api/supabase_insight_repository.test.ts
```

Expected: `update`가 `domain`, `normalized_url`, `original_url`, `schema_version`까지 받은 실제 결과 때문에 FAIL.

- [x] **Step 3: Supabase 수정 페이로드 최소화**

`toUpdateRow`가 다음 필드만 반환하도록 수정한다.

```ts
function toUpdateRow(insight: Insight) {
  return {
    category: insight.category,
    memo: insight.memo,
    title: insight.title,
    title_origin: insight.titleOrigin,
  };
}
```

사용자 ID와 인사이트 ID 쿼리 조건, DB `updated_at` 트리거는 변경하지 않는다.

- [x] **Step 4: #31 관련 테스트 실행**

Run:

```powershell
npm test -- src/entities/insight/api/supabase_insight_repository.test.ts src/entities/insight/ui/insight_grid.test.tsx src/app/model/use_insight_workspace.test.tsx src/app/authenticated_workspace.test.tsx
```

Expected: 지정 파일 전체 PASS.

- [x] **Step 5: 변경 범위 검토 및 커밋**

Run:

```powershell
git diff --check
git add src/entities/insight/api/supabase_insight_repository.ts src/entities/insight/api/supabase_insight_repository.test.ts
git commit -m "fix: Supabase 인사이트 수정 필드 제한"
```

Expected: URL·도메인·스키마 버전은 수정 페이로드에서 제외되고 #31 커밋이 생성됨.

### Task 2: #32 원격 검색·꺼내보기 상태 연결

**Files:**

- Modify: `src/pages/home/ui/home_page.tsx`
- Modify: `src/pages/home/ui/home_page.test.tsx`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/pages/library/ui/library_page.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`

- [x] **Step 1: HomePage 테스트 준비와 원격 상태 실패 테스트 작성**

`HomePageProps`를 가져오고 반복 렌더를 다음 헬퍼로 정리한다. 기존 테스트는 `libraryState: 'ready'`, `insightCount: 1`을 기본값으로 사용해 검색 결과 없음이 빈 보관함으로 오인되지 않게 한다.

```tsx
import {
  HomePage,
  type HomePageProps,
  type SuggestedSituation,
} from './home_page';

function renderHomePage(overrides: Partial<HomePageProps> = {}) {
  const props: HomePageProps = {
    insightCount: 1,
    libraryState: 'ready',
    onOpenLibrary: vi.fn(),
    onOpenSave: vi.fn(),
    onQueryChange: vi.fn(),
    onRetryLoad: vi.fn(),
    onRetrieve: vi.fn(),
    onSituationClick: vi.fn(),
    query: '',
    results: [],
    selectedSituation: '',
    situations,
    submittedQuery: '',
    ...overrides,
  };

  render(
    <DesignSystemProvider>
      <HomePage {...props} />
    </DesignSystemProvider>
  );

  return props;
}
```

다음 관찰 행동을 각각 테스트한다.

```tsx
it('원격 보관함 로딩 중에는 결과나 빈 상태 대신 로딩을 보여준다', () => {
  renderHomePage({ insightCount: 0, libraryState: 'loading' });

  expect(screen.getByText('꺼내볼 인사이트를 불러오는 중')).not.toBeNull();
  expect(screen.queryByText('아직 저장한 인사이트가 없어요')).toBeNull();
});

it('원격 보관함이 비어 있으면 첫 링크 저장으로 이동한다', async () => {
  const user = userEvent.setup();
  const onOpenSave = vi.fn();
  renderHomePage({ insightCount: 0, libraryState: 'ready', onOpenSave });

  expect(
    screen.getByRole('heading', { name: '아직 저장한 인사이트가 없어요' })
  ).not.toBeNull();
  await user.click(screen.getByRole('button', { name: '링크 저장' }));
  expect(onOpenSave).toHaveBeenCalledOnce();
});

it('원격 조회 실패를 결과 없음과 구분하고 다시 불러오기를 제공한다', async () => {
  const user = userEvent.setup();
  const onRetryLoad = vi.fn();
  renderHomePage({
    insightCount: 0,
    libraryState: 'unavailable',
    onRetryLoad,
    submittedQuery: '팀 프로젝트',
  });

  expect(
    screen.getByRole('heading', {
      name: '보관함을 불러오지 못해 꺼내볼 수 없어요',
    })
  ).not.toBeNull();
  expect(screen.queryByText(/연결된 인사이트가 없어요/)).toBeNull();
  await user.click(screen.getByRole('button', { name: '다시 불러오기' }));
  expect(onRetryLoad).toHaveBeenCalledOnce();
});
```

- [x] **Step 2: HomePage 테스트가 새 상태 계약 부재로 실패하는지 확인**

Run:

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx
```

Expected: 새 props와 로딩·빈 보관함·원격 실패 상태가 없어 FAIL.

- [x] **Step 3: HomePage 원격 보관함 상태 구현**

`HomePageProps`에 다음 계약을 추가한다.

```ts
export type HomeLibraryState = 'loading' | 'ready' | 'unavailable';

export type HomePageProps = {
  insightCount: number;
  libraryState: HomeLibraryState;
  onOpenLibrary: () => void;
  onOpenSave: () => void;
  onRetryLoad: () => void;
  // 기존 props 유지
};
```

`LoadingState`를 `@/shared/ui` 공개 API에서 가져오고, 기존 상황 예시·결과 분기보다 먼저 다음 상태를 렌더링한다.

```tsx
{libraryState === 'loading' ? (
  <section className="home-page__results" aria-label="보관함 로딩 상태">
    <LoadingState label="꺼내볼 인사이트를 불러오는 중" />
  </section>
) : libraryState === 'unavailable' ? (
  <section className="home-page__results">
    <EmptyState
      actionLabel="다시 불러오기"
      description="네트워크와 로그인 상태를 확인한 뒤 다시 불러와주세요."
      onAction={onRetryLoad}
      title="보관함을 불러오지 못해 꺼내볼 수 없어요"
    />
  </section>
) : insightCount === 0 ? (
  <section className="home-page__results">
    <EmptyState
      actionLabel="링크 저장"
      description="첫 링크를 저장하면 현재 상황과 연결된 인사이트를 다시 꺼낼 수 있어요."
      onAction={onOpenSave}
      title="아직 저장한 인사이트가 없어요"
    />
  </section>
) : submittedQuery.trim().length === 0 ? (
  // 기존 상황 예시
) : (
  // 기존 결과 있음·없음
)}
```

- [x] **Step 4: HomePage 상태 테스트 통과 확인**

Run:

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx
```

Expected: 기존 검색·원문 열기 테스트와 새 상태 테스트 전체 PASS.

- [x] **Step 5: AuthenticatedWorkspace 상태 전달 실패 테스트 작성**

`authenticated_workspace.test.tsx`에 원격 목록이 지연될 때 로딩을 보여주고, 빈 목록이 도착하면 빈 보관함으로 전환하는 통합 테스트를 추가한다.

```tsx
it('원격 목록 로딩과 빈 보관함을 홈 상태로 전달한다', async () => {
  const loadResult = createDeferred<InsightRepositoryLoadResult>();
  const repository: AsyncInsightRepository = {
    create: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(() => loadResult.promise),
    update: vi.fn(),
  };

  render(
    <DesignSystemProvider>
      <AuthenticatedWorkspace repository={repository} />
    </DesignSystemProvider>
  );

  expect(screen.getByText('꺼내볼 인사이트를 불러오는 중')).not.toBeNull();

  await act(async () => {
    loadResult.resolve({ insights: [], warnings: [] });
    await loadResult.promise;
  });

  expect(
    screen.getByRole('heading', { name: '아직 저장한 인사이트가 없어요' })
  ).not.toBeNull();
});
```

기존 `explains load warnings without hiding restored valid insights` 테스트에는 홈에서 원격 실패 상태가 결과 없음 대신 보이는 기대값을 추가한다.

```ts
expect(
  screen.getByRole('heading', {
    name: '보관함을 불러오지 못해 꺼내볼 수 없어요',
  })
).not.toBeNull();
```

- [x] **Step 6: 통합 테스트가 상태 전달 부재로 실패하는지 확인**

Run:

```powershell
npm test -- src/app/authenticated_workspace.test.tsx
```

Expected: 홈에 `libraryState`, 전체 개수와 행동이 전달되지 않아 FAIL.

- [x] **Step 7: AuthenticatedWorkspace에서 원격 상태 계산과 행동 연결**

다음 도우미로 원격 조회 실패를 판정한다.

```ts
function hasBlockingLoadWarning(warnings: InsightRepositoryWarning[]) {
  return warnings.some(
    (warning) => warning === 'read-failed' || warning === 'permission-denied'
  );
}
```

`HomePage`에 다음 값을 전달한다.

```tsx
<HomePage
  insightCount={insights.length}
  libraryState={
    isLoading
      ? 'loading'
      : hasBlockingLoadWarning(loadWarnings)
        ? 'unavailable'
        : 'ready'
  }
  onOpenLibrary={() => setActiveTab('library')}
  onOpenSave={() => setActiveTab('save')}
  onRetryLoad={() => window.location.reload()}
  // 기존 props 유지
/>
```

- [x] **Step 8: LibraryPage 원격 실패와 빈 보관함 구분**

`LibraryPage`가 원격 실패를 검색 결과 없음이나 실제 빈 보관함으로 안내하지 않도록 실패 테스트를 먼저 작성한다. `read-failed`와 `permission-denied`를 작업공간 통합 테스트에서 함께 검증한다.

```tsx
{
  loading ? (
    <LoadingState label="보관함을 불러오는 중" />
  ) : unavailable && insights.length === 0 ? (
    <EmptyState
      actionLabel="다시 불러오기"
      description="네트워크와 로그인 상태를 확인한 뒤 다시 불러와주세요."
      onAction={onRetryLoad}
      title="보관함을 불러오지 못했어요"
    />
  ) : insights.length > 0 ? (
    <InsightGrid insights={insights} />
  ) : null;
}
```

유효한 인사이트가 남아 있으면 경고가 있어도 기존 그리드를 유지한다.

- [x] **Step 9: #32 관련 테스트 실행**

Run:

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/entities/insight/model/search_insights.test.ts src/entities/insight/model/retrieve_insights.test.ts src/entities/insight/api/supabase_insight_repository.test.ts src/app/authenticated_workspace.test.tsx
```

Expected: 지정 파일 전체 PASS. 골든 랭킹, 최대 6개, 사용자 ID 필터와 원문 링크 계약 유지.

- [x] **Step 10: 변경 범위 검토 및 커밋**

Run:

```powershell
git diff --check
git add src/pages/home/ui/home_page.tsx src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.tsx src/pages/library/ui/library_page.test.tsx src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx
git commit -m "feat: Supabase 검색과 꺼내보기 상태 연결"
```

Expected: #32 커밋이 생성되고 검색 알고리즘 파일은 변경되지 않음.

통합 리뷰에서 보관함 탭의 원격 실패와 실제 빈 상태가 함께 보이는 문제가 발견되면 같은 TDD 절차로 수정하고 `fix: 원격 보관함 오류 상태 구분` 후속 커밋을 남긴다.

### Task 3: 통합 검증과 PR 준비

**Files:**

- Verify only: repository-wide source and tests

- [ ] **Step 1: 전체 자동 검증 실행**

Run:

```powershell
npm test
npm run lint
npm run format:check
npm run build
git diff --check origin/main...HEAD
```

Expected: 모든 명령 PASS. 빌드에 기존 크기 경고가 있으면 실패와 구분해 기록.

- [ ] **Step 2: 완료 기준 대조**

다음을 실제 코드와 테스트로 다시 확인한다.

- #31: 본인 데이터 조건, URL 불변, 서버 수정 시각, 수정·삭제 실패 보존, 삭제 확인·취소, 안전한 원문 열기
- #32: 사용자별 원격 목록, 검색 랭킹, 빈 검색 전체 목록, 최대 6개, 로딩·빈 보관함·결과 없음·원격 실패, 안전한 원문 열기
- #33 관련 파일과 로컬 가져오기 기능이 변경되지 않았는지 확인

- [x] **Step 3: 최종 코드 리뷰 요청**

`origin/main`과 현재 `HEAD` 사이 전체 diff를 별도 리뷰어가 검토하게 한다. Critical 또는 Important 지적은 수정하고 관련 테스트와 전체 검증을 다시 실행한다.

- [ ] **Step 4: 푸시와 한국어 PR 생성**

PR 제목 예시:

```text
Supabase 보관함 관리와 검색 상태 완성
```

PR 본문에는 변경 요약, 검증 명령, `Closes #31`, `Closes #32`를 포함하고 #33이 제외됐음을 명시한다. PR 생성 뒤 #31과 #32의 Project 상태를 `검토 중`으로 갱신한다.
