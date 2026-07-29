# 보관함 인사이트 선택 삭제 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보관함의 현재 목록에서 여러 인사이트를 안전하게 선택하고 서버에서 전체 성공 또는 전체 실패로 삭제한다.

**Architecture:** `LibraryPage`가 보관함에 한정된 임시 선택 상태와 확인 창을 관리하고, `InsightGrid`와 `InsightCard`는 선택 가능 상태만 표현한다. `useInsightWorkspace`는 여러 ID 삭제를 공통 목록 상태에 반영하며, Supabase 데이터베이스 함수가 사용자 경계 확인과 삭제를 한 트랜잭션으로 처리한다.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, WDS Modal/Button adapter, Supabase PostgreSQL, pgTAP

---

## 구현 파일 구조

### 새 파일

- `supabase/migrations/20260729000000_delete_user_insights.sql`
  - 현재 사용자의 인사이트 ID 전체를 검증하고 한 번에 삭제하는 데이터베이스 함수
- `supabase/tests/database/insight_batch_delete.test.sql`
  - 정상 삭제와 잘못된 ID가 섞인 요청의 전체 실패 검증
- `src/pages/library/ui/library_selection_toolbar.tsx`
  - 선택 개수, 현재 목록 전체 선택, 선택 해제와 삭제 행동
- `src/pages/library/ui/library_selection_toolbar.css`
  - 데스크톱 상단 도구와 모바일 하단 고정 도구
- `src/pages/library/ui/insight_batch_delete_dialog.tsx`
  - 선택 삭제 확인과 보관함 전체 삭제 확인 문구 입력

### 수정 파일

- `src/entities/insight/model/insight_repository.ts`
  - 여러 ID 삭제 결과와 저장소 메서드
- `src/entities/insight/model/local_storage_insight_repository.ts`
  - 로컬 저장소의 전체 검증 후 일괄 삭제
- `src/entities/insight/model/local_storage_insight_repository.test.ts`
  - 로컬 일괄 삭제 전체 성공·전체 실패
- `src/entities/insight/api/supabase_insight_repository.ts`
  - Supabase 일괄 삭제 함수 호출과 오류 변환
- `src/entities/insight/api/supabase_insight_repository.test.ts`
  - 함수 호출 결과와 오류 변환
- `src/entities/insight/index.ts`
  - 일괄 삭제 타입 공개
- `src/app/model/use_insight_workspace.ts`
  - 일괄 삭제 성공 뒤 목록 갱신
- `src/app/model/use_insight_workspace.test.tsx`
  - 성공·실패 상태 갱신
- `src/app/authenticated_workspace.tsx`
  - 일괄 삭제 행동을 보관함에 전달하고 저장소 대체 구현 보완
- `src/entities/insight/ui/insight_grid.tsx`
  - 선택 상태와 범위 선택 의도를 카드에 전달
- `src/entities/insight/ui/insight_card.tsx`
  - 선택 모드 버튼, 체크 표시와 일반 카드 행동 분리
- `src/entities/insight/ui/insight_grid.css`
  - 선택 카드, 포커스와 체크 표시
- `src/entities/insight/ui/insight_grid.test.tsx`
  - 선택 상태에서 일반 행동 차단과 Shift 전달
- `src/pages/library/ui/library_page.tsx`
  - 선택 ID, 범위 시작점, 확인 창과 삭제 상태 조합
- `src/pages/library/ui/library_page.css`
  - 결과 개수·선택 진입 행과 모바일 콘텐츠 여백
- `src/pages/library/ui/library_page.test.tsx`
  - 선택 흐름, 범위 초기화, 삭제 확인과 실패 보존
- 저장소 테스트 대체 객체가 있는 기존 테스트
  - 새 필수 `deleteMany` 메서드만 같은 기본 성공 결과로 보완

---

### 작업 1: 데이터베이스 일괄 삭제 계약

**Files:**
- Create: `supabase/tests/database/insight_batch_delete.test.sql`
- Create: `supabase/migrations/20260729000000_delete_user_insights.sql`

- [ ] **Step 1: 실패하는 pgTAP 계약 테스트 작성**

`supabase/tests/database/insight_batch_delete.test.sql`에 다음 네 경계를 작성한다.

```sql
begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

select extensions.has_function(
  'public',
  'delete_user_insights',
  array['uuid[]'],
  '인사이트 일괄 삭제 함수가 존재한다'
);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000021', 'batch-owner@example.com'),
  ('00000000-0000-4000-8000-000000000022', 'batch-other@example.com');

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title
) values
  (
    '10000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/one',
    'https://batch-owner.example/one',
    'batch-owner.example',
    '소유자 첫 번째 인사이트'
  ),
  (
    '10000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/two',
    'https://batch-owner.example/two',
    'batch-owner.example',
    '소유자 두 번째 인사이트'
  ),
  (
    '10000000-0000-4000-8000-000000000023',
    '00000000-0000-4000-8000-000000000022',
    'https://batch-other.example/hidden',
    'https://batch-other.example/hidden',
    'batch-other.example',
    '다른 사용자 인사이트'
  );

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';

select extensions.results_eq(
  $$
    select *
    from public.delete_user_insights(array[
      '10000000-0000-4000-8000-000000000021'::uuid,
      '10000000-0000-4000-8000-000000000022'::uuid
    ])
    order by id
  $$,
  $$
    values
      ('10000000-0000-4000-8000-000000000021'::uuid),
      ('10000000-0000-4000-8000-000000000022'::uuid)
  $$,
  '자신의 유효한 인사이트 전체를 한 번에 삭제한다'
);

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title
) values
  (
    '10000000-0000-4000-8000-000000000024',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/three',
    'https://batch-owner.example/three',
    'batch-owner.example',
    '소유자 세 번째 인사이트'
  ),
  (
    '10000000-0000-4000-8000-000000000025',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/four',
    'https://batch-owner.example/four',
    'batch-owner.example',
    '소유자 네 번째 인사이트'
  );

select extensions.throws_ok(
  $$
    select public.delete_user_insights(array[
      '10000000-0000-4000-8000-000000000024'::uuid,
      '10000000-0000-4000-8000-000000000099'::uuid
    ])
  $$,
  'P0002',
  '삭제할 인사이트 전체를 찾지 못했습니다.',
  '존재하지 않는 ID가 섞이면 요청 전체를 거부한다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insights
    where id in (
      '10000000-0000-4000-8000-000000000024',
      '10000000-0000-4000-8000-000000000025'
    )
  $$,
  array[2::bigint],
  '거부된 요청은 자신의 유효한 인사이트도 삭제하지 않는다'
);

select extensions.throws_ok(
  $$
    select public.delete_user_insights(array[
      '10000000-0000-4000-8000-000000000025'::uuid,
      '10000000-0000-4000-8000-000000000023'::uuid
    ])
  $$,
  'P0002',
  '삭제할 인사이트 전체를 찾지 못했습니다.',
  '다른 사용자의 ID가 섞이면 요청 전체를 거부한다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insights
    where id = '10000000-0000-4000-8000-000000000025'
  $$,
  array[1::bigint],
  '다른 사용자 ID가 섞인 요청도 자신의 인사이트를 삭제하지 않는다'
);

select * from extensions.finish();
rollback;
```

- [ ] **Step 2: 새 테스트가 함수 부재로 실패하는지 확인**

Run:

```powershell
npx --yes supabase@2.109.1 test db supabase/tests/database/insight_batch_delete.test.sql
```

Expected: `delete_user_insights` 함수가 없어 첫 계약이 실패한다. 로컬 Supabase가 실행 중이 아니면 작업 7에서 새 테스트 파일만 실행한다.

- [ ] **Step 3: 전체 검증 뒤 삭제하는 데이터베이스 함수 작성**

`supabase/migrations/20260729000000_delete_user_insights.sql`:

```sql
create function public.delete_user_insights(target_insight_ids uuid[])
returns table (id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested_ids uuid[];
  matched_ids uuid[];
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = '로그인한 사용자만 인사이트를 삭제할 수 있습니다.';
  end if;

  select coalesce(array_agg(distinct target_id order by target_id), '{}')
  into requested_ids
  from unnest(coalesce(target_insight_ids, '{}')) as target_id;

  if cardinality(requested_ids) = 0 then
    raise exception using
      errcode = '22023',
      message = '삭제할 인사이트를 한 개 이상 선택해 주세요.';
  end if;

  select coalesce(array_agg(locked.id order by locked.id), '{}')
  into matched_ids
  from (
    select insight.id
    from public.insights as insight
    where insight.user_id = current_user_id
      and insight.id = any(requested_ids)
    for update
  ) as locked;

  if matched_ids is distinct from requested_ids then
    raise exception using
      errcode = 'P0002',
      message = '삭제할 인사이트 전체를 찾지 못했습니다.';
  end if;

  return query
  delete from public.insights as insight
  where insight.user_id = current_user_id
    and insight.id = any(requested_ids)
  returning insight.id;
end;
$$;

revoke all on function public.delete_user_insights(uuid[]) from public;
revoke all on function public.delete_user_insights(uuid[]) from anon;
grant execute on function public.delete_user_insights(uuid[]) to authenticated;
```

- [ ] **Step 4: 데이터베이스 계약 테스트 재실행**

Run:

```powershell
npx --yes supabase@2.109.1 test db supabase/tests/database/insight_batch_delete.test.sql
```

Expected: 새 테스트 6건이 통과한다.

- [ ] **Step 5: 데이터베이스 계약 커밋**

```powershell
git add -- supabase/migrations/20260729000000_delete_user_insights.sql supabase/tests/database/insight_batch_delete.test.sql
git commit -m "feat: 인사이트 일괄 삭제 데이터 계약"
```

---

### 작업 2: 인사이트 저장소 일괄 삭제

**Files:**
- Modify: `src/entities/insight/model/insight_repository.ts`
- Modify: `src/entities/insight/model/local_storage_insight_repository.ts`
- Modify: `src/entities/insight/model/local_storage_insight_repository.test.ts`
- Modify: `src/entities/insight/api/supabase_insight_repository.ts`
- Modify: `src/entities/insight/api/supabase_insight_repository.test.ts`
- Modify: `src/entities/insight/index.ts`

- [ ] **Step 1: 저장소 실패 테스트 작성**

`supabase_insight_repository.test.ts`에는 함수 호출과 반환 ID를 확인하는 한 건을 추가한다.

```ts
const SECOND_INSIGHT_ID = '10000000-0000-4000-8000-000000000002';
```

```ts
it('선택한 인사이트 ID를 함수 한 번으로 삭제한다', async () => {
  const rpc = vi.fn().mockResolvedValue({
    data: [{ id: INSIGHT.id }, { id: SECOND_INSIGHT_ID }],
    error: null,
  });
  const repository = createSupabaseInsightRepository(
    { rpc } as unknown as SupabaseClient,
    USER_ID
  );

  await expect(
    repository.deleteMany([INSIGHT.id, SECOND_INSIGHT_ID])
  ).resolves.toEqual({
    deletedIds: [INSIGHT.id, SECOND_INSIGHT_ID],
    ok: true,
  });
  expect(rpc).toHaveBeenCalledWith('delete_user_insights', {
    target_insight_ids: [INSIGHT.id, SECOND_INSIGHT_ID],
  });
});
```

같은 파일에 `22023`, `P0002`, `42501`, 그 밖의 오류 변환을 `it.each` 한 건으로 묶는다.

```ts
it.each([
  ['22023', 'invalid-request'],
  ['P0002', 'not-found'],
  ['42501', 'permission-denied'],
  ['PGRST000', 'write-failed'],
] as const)(
  '일괄 삭제 오류 %s를 %s 결과로 변환한다',
  async (code, reason) => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code, details: '', hint: '', message: '내부 오류' },
    });
    const repository = createSupabaseInsightRepository(
      { rpc } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.deleteMany([INSIGHT.id])).resolves.toEqual({
      ok: false,
      reason,
    });
  }
);
```

`local_storage_insight_repository.test.ts`에는 존재하지 않는 ID가 섞인 경우 저장값을 바꾸지 않는 한 건을 추가한다.

```ts
it('일괄 삭제 대상을 모두 찾지 못하면 저장값을 바꾸지 않는다', async () => {
  const storage = new MemoryStorage();
  const repository = createLocalStorageInsightRepository(storage);
  await repository.create(insight);

  await expect(
    repository.deleteMany([insight.id, 'missing'])
  ).resolves.toEqual({ ok: false, reason: 'not-found' });
  await expect(repository.list()).resolves.toMatchObject({
    insights: [insight],
  });
});
```

- [ ] **Step 2: 대상 테스트가 타입·메서드 부재로 실패하는지 확인**

Run:

```powershell
npm test -- src/entities/insight/api/supabase_insight_repository.test.ts src/entities/insight/model/local_storage_insight_repository.test.ts
```

Expected: `deleteMany`가 없어 실패한다.

- [ ] **Step 3: 저장소 타입과 구현 추가**

`insight_repository.ts`:

```ts
export type InsightRepositoryDeleteManyResult =
  | { deletedIds: string[]; ok: true }
  | {
      ok: false;
      reason:
        | 'invalid-request'
        | Exclude<InsightRepositoryWriteFailureReason, 'duplicate'>;
    };

export type InsightRepository = {
  create(insight: Insight): Promise<InsightRepositoryWriteResult>;
  delete(insightId: string): Promise<InsightRepositoryDeleteResult>;
  deleteMany(
    insightIds: readonly string[]
  ): Promise<InsightRepositoryDeleteManyResult>;
  list(): Promise<InsightRepositoryLoadResult>;
  update(insight: Insight): Promise<InsightRepositoryWriteResult>;
};
```

`supabase_insight_repository.ts`:

```ts
async deleteMany(insightIds) {
  try {
    const uniqueInsightIds = [...new Set(insightIds)];

    if (uniqueInsightIds.length === 0) {
      return { ok: false, reason: 'invalid-request' };
    }

    const { data, error } = await client.rpc('delete_user_insights', {
      target_insight_ids: uniqueInsightIds,
    });

    if (error) {
      return { ok: false, reason: toDeleteManyFailure(error) };
    }

    const deletedIds = parseDeletedInsightIds(data);

    return deletedIds
      ? { deletedIds, ok: true }
      : { ok: false, reason: 'write-failed' };
  } catch {
    return { ok: false, reason: 'write-failed' };
  }
},
```

같은 파일에 응답 검증과 오류 변환을 추가한다.

```ts
function parseDeletedInsightIds(data: unknown) {
  if (!Array.isArray(data)) {
    return null;
  }

  const deletedIds: string[] = [];

  for (const row of data) {
    if (!isRecord(row) || typeof row.id !== 'string') {
      return null;
    }

    deletedIds.push(row.id);
  }

  return deletedIds;
}

function toDeleteManyFailure(error: PostgrestError) {
  if (error.code === '22023') {
    return 'invalid-request' as const;
  }

  if (error.code === 'P0002') {
    return 'not-found' as const;
  }

  return toDeleteFailure(error);
}
```

`local_storage_insight_repository.ts`는 쓰기 전에 대상 전체를 확인한다.

```ts
async deleteMany(insightIds) {
  const loadResult = readInsights(storage);
  const uniqueInsightIds = [...new Set(insightIds)];

  if (loadResult.warnings.includes('read-failed')) {
    return { ok: false, reason: 'write-failed' };
  }

  if (uniqueInsightIds.length === 0) {
    return { ok: false, reason: 'invalid-request' };
  }

  const insightIdSet = new Set(loadResult.insights.map(({ id }) => id));

  if (uniqueInsightIds.some((id) => !insightIdSet.has(id))) {
    return { ok: false, reason: 'not-found' };
  }

  const deleteIdSet = new Set(uniqueInsightIds);
  const writeResult = writeInsights(
    storage,
    loadResult.insights.filter(({ id }) => !deleteIdSet.has(id))
  );

  return writeResult.ok
    ? { deletedIds: uniqueInsightIds, ok: true }
    : { ok: false, reason: 'write-failed' };
},
```

`index.ts`에서 `InsightRepositoryDeleteManyResult`를 공개한다.

- [ ] **Step 4: 저장소 대상 테스트 재실행**

Run:

```powershell
npm test -- src/entities/insight/api/supabase_insight_repository.test.ts src/entities/insight/model/local_storage_insight_repository.test.ts
```

Expected: 두 파일의 테스트가 통과한다.

- [ ] **Step 5: 저장소 커밋**

```powershell
git add -- src/entities/insight/model/insight_repository.ts src/entities/insight/model/local_storage_insight_repository.ts src/entities/insight/model/local_storage_insight_repository.test.ts src/entities/insight/api/supabase_insight_repository.ts src/entities/insight/api/supabase_insight_repository.test.ts src/entities/insight/index.ts
git commit -m "feat: 인사이트 저장소 일괄 삭제"
```

---

### 작업 3: 작업 공간 목록 상태 갱신

**Files:**
- Modify: `src/app/model/use_insight_workspace.ts`
- Modify: `src/app/model/use_insight_workspace.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: 저장소 대체 객체가 있는 기존 테스트 파일

- [ ] **Step 1: 성공·실패 상태 테스트 작성**

`use_insight_workspace.test.tsx`에 다음 한 건을 추가한다.

```ts
it('일괄 삭제가 성공한 뒤 대상만 제거하고 실패하면 목록을 유지한다', async () => {
  const firstInsight = createInsight({ id: 'first' });
  const secondInsight = createInsight({ id: 'second' });
  const thirdInsight = createInsight({ id: 'third' });
  const deleteMany = vi
    .fn<InsightRepository['deleteMany']>()
    .mockResolvedValueOnce({ ok: false, reason: 'write-failed' })
    .mockResolvedValueOnce({
      deletedIds: [firstInsight.id, thirdInsight.id],
      ok: true,
    });
  const repository = createRepository({
    deleteMany,
    list: vi.fn().mockResolvedValue({
      insights: [firstInsight, secondInsight, thirdInsight],
      warnings: [],
    }),
  });
  const { result } = await renderReadyWorkspace(repository);

  await act(async () => {
    await expect(
      result.current.deleteInsights([firstInsight.id, thirdInsight.id])
    ).resolves.toEqual({ ok: false, reason: 'write-failed' });
  });
  expect(result.current.insights).toEqual([
    firstInsight,
    secondInsight,
    thirdInsight,
  ]);

  await act(async () => {
    await expect(
      result.current.deleteInsights([firstInsight.id, thirdInsight.id])
    ).resolves.toEqual({ ok: true });
  });
  expect(result.current.insights).toEqual([secondInsight]);
});
```

- [ ] **Step 2: 작업 공간 테스트가 실패하는지 확인**

Run:

```powershell
npm test -- src/app/model/use_insight_workspace.test.tsx
```

Expected: `deleteInsights`가 없어 실패한다.

- [ ] **Step 3: 일괄 삭제 상태 행동 구현**

`use_insight_workspace.ts`:

```ts
export type DeleteInsightsResult = InsightMutationResult;

const deleteInsights = useCallback(
  async (insightIds: readonly string[]): Promise<DeleteInsightsResult> =>
    runMutation<DeleteInsightsResult>(
      async () => {
        const currentState = workspaceStateRef.current;
        const uniqueInsightIds = [...new Set(insightIds)];
        const currentInsightIdSet = new Set(
          currentState.insights.map(({ id }) => id)
        );

        if (
          uniqueInsightIds.length === 0 ||
          uniqueInsightIds.some((id) => !currentInsightIdSet.has(id))
        ) {
          return { ok: false, reason: 'not-found' };
        }

        const deleteResult = await repository.deleteMany(uniqueInsightIds);

        if (!deleteResult.ok) {
          return {
            ok: false,
            reason:
              deleteResult.reason === 'permission-denied' ||
              deleteResult.reason === 'not-found'
                ? deleteResult.reason
                : 'write-failed',
          };
        }

        const deletedIdSet = new Set(deleteResult.deletedIds);

        if (
          deletedIdSet.size !== uniqueInsightIds.length ||
          uniqueInsightIds.some((id) => !deletedIdSet.has(id))
        ) {
          return { ok: false, reason: 'write-failed' };
        }

        updateReadyState(repository, setWorkspaceState, workspaceStateRef, {
          insights: currentState.insights.filter(
            ({ id }) => !deletedIdSet.has(id)
          ),
          loadWarnings: clearRecoverableWarnings(currentState.loadWarnings),
        });
        return { ok: true };
      },
      { ok: false, reason: 'write-failed' }
    ),
  [repository, runMutation]
);
```

반환 객체에 `deleteInsights`를 추가하고 `authenticated_workspace.tsx`에서 구조 분해한 뒤 `LibraryPage`에 전달한다.

저장소 인터페이스를 직접 구현하는 앱·테스트 대체 객체에는 다음 기본 메서드만 보완한다.

```ts
async deleteMany(insightIds) {
  return { deletedIds: [...insightIds], ok: true };
}
```

- [ ] **Step 4: 작업 공간 테스트 재실행**

Run:

```powershell
npm test -- src/app/model/use_insight_workspace.test.tsx
```

Expected: 작업 공간 테스트가 통과한다.

- [ ] **Step 5: 작업 공간 커밋**

```powershell
git add -- src/app/model/use_insight_workspace.ts src/app/model/use_insight_workspace.test.tsx src/app/authenticated_workspace.tsx src/app/app.test.tsx src/app/authenticated_workspace.test.tsx src/app/authenticated_workspace_offline.test.tsx src/app/model/create_browser_insight_repository.test.ts src/app/model/create_repository_insight_capture_service.test.ts
git commit -m "feat: 인사이트 일괄 삭제 상태 갱신"
```

---

### 작업 4: 선택 가능한 인사이트 카드

**Files:**
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/entities/insight/ui/insight_card.tsx`
- Modify: `src/entities/insight/ui/insight_grid.css`
- Modify: `src/entities/insight/ui/insight_grid.test.tsx`

- [ ] **Step 1: 선택 카드 계약 테스트 작성**

`insight_grid.test.tsx`에 선택 상태 한 건을 추가한다.

```ts
it('선택 모드에서는 카드 행동을 숨기고 선택과 Shift 의도를 전달한다', async () => {
  const onToggleInsightSelection = vi.fn();

  render(
    <DesignSystemProvider>
      <InsightGrid
        insights={[
          createInsight({ id: 'first', title: '첫 카드' }),
          createInsight({ id: 'second', title: '둘째 카드' }),
        ]}
        onDeleteInsight={vi.fn()}
        onToggleInsightSelection={onToggleInsightSelection}
        onUpdateInsight={vi.fn()}
        selectedInsightIds={new Set(['first'])}
        selectionMode
      />
    </DesignSystemProvider>
  );

  expect(
    screen.getByRole('button', { name: '첫 카드 선택 해제' })
  ).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('link', { name: '원문 열기' })).toBeNull();
  expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
  expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: '둘째 카드 선택' }), {
    shiftKey: true,
  });

  expect(onToggleInsightSelection).toHaveBeenCalledWith('second', {
    range: true,
  });
});
```

이 테스트를 위해 Testing Library import에 `fireEvent`를 추가한다.

- [ ] **Step 2: 카드 테스트가 선택 props 부재로 실패하는지 확인**

Run:

```powershell
npm test -- src/entities/insight/ui/insight_grid.test.tsx
```

Expected: 선택 props가 없어 실패한다.

- [ ] **Step 3: 그리드와 카드 선택 props 구현**

`InsightGridProps`에 다음 props를 추가하고 카드에 전달한다.

```ts
onToggleInsightSelection?: (
  insightId: string,
  options: { range: boolean }
) => void;
selectedInsightIds?: ReadonlySet<string>;
selectionMode?: boolean;
```

`InsightCard`에는 선택 상태에서만 실제 버튼을 렌더링한다.

```tsx
{selectionMode ? (
  <button
    aria-label={`${insight.title} ${
      selected ? '선택 해제' : '선택'
    }`}
    aria-pressed={selected}
    className="insight-card__selection-button"
    onClick={(event) =>
      onToggleSelection?.(insight.id, { range: event.shiftKey })
    }
    type="button"
  >
    <span aria-hidden="true" className="insight-card__selection-mark">
      {selected ? <Check /> : null}
    </span>
  </button>
) : null}
```

선택 모드에서는 기존 하단 행동과 삭제 확인을 렌더링하지 않고 카드 본문만 유지한다. 카드 최상위 요소에는 `insight-card--selection`과 `insight-card--selected` 상태 class를 추가한다.

- [ ] **Step 4: 선택 카드 스타일 구현**

`insight_grid.css`:

```css
.insight-card--selection {
  position: relative;
}

.insight-card__selection-button {
  position: absolute;
  z-index: 2;
  inset: 0;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.insight-card__selection-mark {
  position: absolute;
  top: var(--spacing-3);
  left: var(--spacing-3);
  display: grid;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-ash);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-surface);
  place-items: center;
}

.insight-card--selected {
  border-color: var(--color-electric-blue);
  box-shadow: inset 0 0 0 1px var(--color-electric-blue);
}

.insight-card--selected .insight-card__selection-mark {
  border-color: var(--color-electric-blue);
  background: var(--color-electric-blue);
}

.insight-card__selection-button:focus-visible {
  outline: 2px solid var(--color-electric-blue);
  outline-offset: -4px;
  border-radius: var(--radius-card);
}
```

- [ ] **Step 5: 선택 카드 테스트 재실행**

Run:

```powershell
npm test -- src/entities/insight/ui/insight_grid.test.tsx
```

Expected: 기존 카드 테스트와 새 선택 테스트가 통과한다.

- [ ] **Step 6: 선택 카드 커밋**

```powershell
git add -- src/entities/insight/ui/insight_grid.tsx src/entities/insight/ui/insight_card.tsx src/entities/insight/ui/insight_grid.css src/entities/insight/ui/insight_grid.test.tsx
git commit -m "feat: 인사이트 카드 선택 모드"
```

---

### 작업 5: 보관함 선택 도구와 삭제 확인

**Files:**
- Create: `src/pages/library/ui/library_selection_toolbar.tsx`
- Create: `src/pages/library/ui/library_selection_toolbar.css`
- Create: `src/pages/library/ui/insight_batch_delete_dialog.tsx`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/pages/library/ui/library_page.css`
- Modify: `src/pages/library/ui/library_page.test.tsx`

- [ ] **Step 1: 핵심 사용자 흐름 테스트 작성**

`library_page.test.tsx`에 관련 동작을 한 흐름으로 검증하는 테스트를 추가한다.

`LibraryPageProps`를 함께 import하고 반복되는 필수 props는 다음 helper로 고정한다.

```ts
const SECOND_ID = '10000000-0000-4000-8000-000000000002';

function createLibraryProps(
  overrides: Partial<LibraryPageProps> = {}
): LibraryPageProps {
  return {
    activeCategory: 'all',
    categoryOptions: [{ colorKey: null, label: '전체', value: 'all' }],
    insights: [EXISTING_INSIGHT],
    onCategoryChange: vi.fn(),
    onDeleteInsight: vi.fn().mockResolvedValue({ ok: true } as const),
    onDeleteInsights: vi.fn().mockResolvedValue({ ok: true } as const),
    onOpenImport: vi.fn(),
    onOpenSave: vi.fn(),
    onQueryChange: vi.fn(),
    onRetryLoad: vi.fn(),
    onUpdateInsight: vi.fn().mockResolvedValue({ ok: true } as const),
    query: '',
    totalInsightCount: 1,
    ...overrides,
  };
}
```

```ts
it('현재 목록을 선택하고 확인한 뒤에만 삭제하며 실패하면 선택을 유지한다', async () => {
  const user = userEvent.setup();
  const onDeleteInsights = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, reason: 'write-failed' } as const)
    .mockResolvedValueOnce({ ok: true } as const);
  const insights = [
    EXISTING_INSIGHT,
    { ...EXISTING_INSIGHT, id: SECOND_ID, title: '둘째 인사이트' },
  ];

  render(
    <DesignSystemProvider>
      <LibraryPage
        {...createLibraryProps()}
        insights={insights}
        onDeleteInsights={onDeleteInsights}
        totalInsightCount={2}
      />
    </DesignSystemProvider>
  );

  await user.click(screen.getByRole('button', { name: '선택' }));
  expect(screen.getByText('0개 선택됨')).not.toBeNull();
  expect(
    screen.queryByRole('link', { name: '원문 열기' })
  ).toBeNull();

  await user.click(
    screen.getByRole('button', { name: '현재 목록 2개 모두 선택' })
  );
  await user.click(screen.getByRole('button', { name: '삭제' }));
  expect(onDeleteInsights).not.toHaveBeenCalled();

  const confirmation = screen.getByRole('textbox', { name: '확인 문구' });
  await user.type(confirmation, '삭제');
  await user.click(
    screen.getByRole('button', {
      name: '인사이트 2개 모두 삭제하기',
    })
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '인사이트와 선택은 그대로 두었어요.'
  );
  expect(screen.getByText('2개 선택됨')).not.toBeNull();

  await user.click(
    screen.getByRole('button', {
      name: '인사이트 2개 모두 다시 삭제하기',
    })
  );
  expect(onDeleteInsights).toHaveBeenCalledTimes(2);
});
```

같은 파일에 검색 변경 시 선택을 지우는 한 건을 추가한다.

```ts
it('검색 범위가 바뀌면 숨은 선택을 남기지 않는다', async () => {
  const user = userEvent.setup();
  const onQueryChange = vi.fn();

  render(
    <DesignSystemProvider>
      <LibraryPage
        {...createLibraryProps()}
        insights={[EXISTING_INSIGHT]}
        onQueryChange={onQueryChange}
      />
    </DesignSystemProvider>
  );

  await user.click(screen.getByRole('button', { name: '선택' }));
  await user.click(
    screen.getByRole('button', { name: '기존 인사이트 선택' })
  );
  await user.type(
    screen.getByRole('searchbox', { name: '보관함 검색' }),
    '다른 범위'
  );

  expect(onQueryChange).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '선택' })).not.toBeNull();
  expect(screen.queryByText('1개 선택됨')).toBeNull();
});
```

- [ ] **Step 2: 보관함 테스트가 선택 UI 부재로 실패하는지 확인**

Run:

```powershell
npm test -- src/pages/library/ui/library_page.test.tsx
```

Expected: `선택` 버튼과 `onDeleteInsights`가 없어 실패한다.

- [ ] **Step 3: 선택 도구 컴포넌트 작성**

`library_selection_toolbar.tsx`는 다음 명시적 props만 받는다.

```ts
export type LibrarySelectionToolbarProps = {
  currentResultCount: number;
  deleting: boolean;
  onClear: () => void;
  onDelete: () => void;
  onToggleAll: () => void;
  selectedCount: number;
};
```

도구의 문구는 다음 규칙으로 만든다.

```tsx
<div
  aria-label="인사이트 선택 도구"
  className="library-selection-toolbar"
  role="toolbar"
>
  <strong>{selectedCount}개 선택됨</strong>
  <Button
    disabled={deleting}
    hierarchy="secondary"
    onClick={onToggleAll}
    size="small"
    type="button"
  >
    {selectedCount === currentResultCount
      ? '현재 목록 선택 해제'
      : `현재 목록 ${currentResultCount}개 모두 선택`}
  </Button>
  <Button
    disabled={deleting || selectedCount === 0}
    hierarchy="ghost"
    onClick={onClear}
    size="small"
    type="button"
  >
    선택 해제
  </Button>
  <Button
    disabled={deleting || selectedCount === 0}
    hierarchy="primary"
    onClick={onDelete}
    size="small"
    type="button"
  >
    삭제
  </Button>
</div>
```

- [ ] **Step 4: 삭제 확인 컴포넌트 작성**

`insight_batch_delete_dialog.tsx`는 일부 삭제와 보관함 전체 삭제를 구분한다.

```ts
export type InsightBatchDeleteDialogProps = {
  deleting: boolean;
  failed: boolean;
  libraryWide: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  open: boolean;
  selectedCount: number;
};
```

보관함 전체 삭제에서만 `TextField`를 렌더링하고 `confirmation.trim() === '삭제'`일 때 확인 버튼을 활성화한다. 실패해도 입력값과 창을 유지하며 확인 버튼은 `다시 삭제하기`로 바꾼다.

- [ ] **Step 5: LibraryPage 선택 상태와 범위 선택 구현**

다음 상태를 `LibraryPage`에 둔다.

```ts
const [selectionMode, setSelectionMode] = useState(false);
const [selectedInsightIds, setSelectedInsightIds] = useState<Set<string>>(
  () => new Set()
);
const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deleteFailed, setDeleteFailed] = useState(false);
const [deleting, setDeleting] = useState(false);
```

범위 선택은 현재 `insights` 순서만 사용한다.

```ts
function toggleInsightSelection(
  insightId: string,
  options: { range: boolean }
) {
  const visibleIds = insights.map(({ id }) => id);
  const nextSelectedIds = new Set(selectedInsightIds);

  if (options.range && selectionAnchorId) {
    const anchorIndex = visibleIds.indexOf(selectionAnchorId);
    const targetIndex = visibleIds.indexOf(insightId);

    if (anchorIndex >= 0 && targetIndex >= 0) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      visibleIds.slice(start, end + 1).forEach((id) => {
        nextSelectedIds.add(id);
      });
      setSelectedInsightIds(nextSelectedIds);
      return;
    }
  }

  if (nextSelectedIds.has(insightId)) {
    nextSelectedIds.delete(insightId);
  } else {
    nextSelectedIds.add(insightId);
  }

  setSelectionAnchorId(insightId);
  setSelectedInsightIds(nextSelectedIds);
}
```

검색·카테고리 callback은 먼저 선택 상태를 비운 뒤 상위 callback을 호출한다. `useEffect`로 현재 `insights`에 없는 ID도 제거한다.

보관함 전체 삭제 조건:

```ts
const deletesEntireLibrary =
  activeCategory === 'all' &&
  !hasQuery &&
  totalInsightCount > 0 &&
  selectedInsightIds.size === totalInsightCount;
```

- [ ] **Step 6: 반응형 선택 도구 스타일 작성**

`library_selection_toolbar.css`의 모바일 기준:

```css
.library-selection-toolbar {
  display: flex;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--color-ash);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  gap: var(--spacing-2);
}

@media (max-width: 767px) {
  .library-selection-toolbar {
    position: fixed;
    z-index: 11;
    right: 50%;
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    width: min(420px, calc(100% - var(--spacing-6)));
    flex-wrap: wrap;
    transform: translateX(50%);
  }

  .library-page--selection .library-page__body {
    padding-bottom: calc(
      var(--spacing-20) + 132px + env(safe-area-inset-bottom, 0px)
    );
  }
}
```

배경은 기존 카드·입력 배경색을 유지한다. 선택 도구를 이유로 일반 버튼 색상을 바꾸지 않는다.

- [ ] **Step 7: 보관함 대상 테스트 재실행**

Run:

```powershell
npm test -- src/pages/library/ui/library_page.test.tsx src/entities/insight/ui/insight_grid.test.tsx
```

Expected: 선택 모드와 기존 보관함·카드 테스트가 통과한다.

- [ ] **Step 8: 보관함 선택 UI 커밋**

```powershell
git add -- src/pages/library/ui/library_selection_toolbar.tsx src/pages/library/ui/library_selection_toolbar.css src/pages/library/ui/insight_batch_delete_dialog.tsx src/pages/library/ui/library_page.tsx src/pages/library/ui/library_page.css src/pages/library/ui/library_page.test.tsx
git commit -m "feat: 보관함 인사이트 선택 삭제"
```

---

### 작업 6: 앱 조합과 타입 정리

**Files:**
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: 저장소 대체 객체가 있는 컴파일 오류 파일

- [ ] **Step 1: 빌드로 누락된 저장소 구현 확인**

Run:

```powershell
npm run build:web
```

Expected: `deleteMany`를 구현하지 않은 대체 저장소가 있으면 해당 파일과 위치가 타입 오류로 표시된다.

- [ ] **Step 2: 누락된 대체 저장소에 안전한 기본 결과 추가**

읽기 불가 저장소는 실패를 반환한다.

```ts
async deleteMany() {
  return { ok: false, reason: 'write-failed' };
}
```

테스트용 정상 저장소는 전달받은 ID를 반환한다.

```ts
async deleteMany(insightIds) {
  return { deletedIds: [...insightIds], ok: true };
}
```

다른 행동이나 fixture는 수정하지 않는다.

- [ ] **Step 3: 웹 빌드 재실행**

Run:

```powershell
npm run build:web
```

Expected: TypeScript와 Vite 웹 빌드가 통과한다.

- [ ] **Step 4: 타입 정리 커밋**

```powershell
git add -- src/app src/entities/insight
git commit -m "fix: 일괄 삭제 저장소 구현 정합성"
```

변경이 앞선 커밋에 모두 포함되어 별도 수정이 없으면 이 커밋은 만들지 않는다.

---

### 작업 7: 변경 범위 검증

**Files:**
- Verify only

- [ ] **Step 1: 관련 테스트만 실행**

Run:

```powershell
npm test -- src/entities/insight/api/supabase_insight_repository.test.ts src/entities/insight/model/local_storage_insight_repository.test.ts src/app/model/use_insight_workspace.test.tsx src/entities/insight/ui/insight_grid.test.tsx src/pages/library/ui/library_page.test.tsx
```

Expected: 지정한 다섯 테스트 파일만 통과한다.

- [ ] **Step 2: 변경 파일만 린트·포맷 검사**

Run:

```powershell
npx eslint src/entities/insight/model/insight_repository.ts src/entities/insight/model/local_storage_insight_repository.ts src/entities/insight/api/supabase_insight_repository.ts src/app/model/use_insight_workspace.ts src/app/authenticated_workspace.tsx src/entities/insight/ui/insight_grid.tsx src/entities/insight/ui/insight_card.tsx src/pages/library/ui/library_selection_toolbar.tsx src/pages/library/ui/insight_batch_delete_dialog.tsx src/pages/library/ui/library_page.tsx
npx prettier --check src/entities/insight/model/insight_repository.ts src/entities/insight/model/local_storage_insight_repository.ts src/entities/insight/api/supabase_insight_repository.ts src/app/model/use_insight_workspace.ts src/app/authenticated_workspace.tsx src/entities/insight/ui/insight_grid.tsx src/entities/insight/ui/insight_card.tsx src/entities/insight/ui/insight_grid.css src/pages/library/ui/library_selection_toolbar.tsx src/pages/library/ui/library_selection_toolbar.css src/pages/library/ui/insight_batch_delete_dialog.tsx src/pages/library/ui/library_page.tsx src/pages/library/ui/library_page.css
```

Expected: 변경한 TypeScript와 CSS 파일만 통과한다.

- [ ] **Step 3: 웹 빌드 확인**

Run:

```powershell
npm run build:web
```

Expected: 웹 빌드와 클라이언트 번들 검사가 통과한다.

- [ ] **Step 4: 새 데이터베이스 테스트만 실행**

Docker와 로컬 Supabase가 사용 가능한 경우에만 실행한다.

```powershell
npx --yes supabase@2.109.1 db start
npx --yes supabase@2.109.1 db reset --local
npx --yes supabase@2.109.1 test db supabase/tests/database/insight_batch_delete.test.sql
```

Expected: 새 pgTAP 테스트 6건이 통과한다. 환경을 시작할 수 없으면 Pull Request의 `Supabase migration validation`에서 같은 파일을 확인하며, 로컬에서 통과했다고 보고하지 않는다.

- [ ] **Step 5: 세 화면 너비 수동 확인**

- 390px: 하단 선택 도구가 내비게이션과 마지막 카드를 가리지 않는다.
- 768px: 두 열 카드와 선택 도구가 겹치지 않는다.
- 1280px: 세 열 카드와 데스크톱 선택 도구의 순서가 자연스럽다.
- 일반 상태에서 길게 누르기와 드래그가 선택 모드를 시작하지 않는다.
- 선택 상태에서 원문·수정·개별 삭제 행동이 보이지 않는다.
- 보관함 전체 삭제는 `삭제` 입력 전까지 확정되지 않는다.

- [ ] **Step 6: 작업 상태 확인**

```powershell
git status --short
git log --oneline origin/main..HEAD
```

Expected: 계획 문서와 의도한 구현 파일만 변경되며, 관련 없는 파일은 없다.

---

## 자체 검토

### 명세 반영

- 명시적 `선택` 진입: 작업 5
- 데스크톱 Shift 범위 선택: 작업 4·5
- 모바일 길게 누르기·드래그 제외: 작업 4·5·7
- 현재 목록 한정 선택: 작업 5
- 선택 중 일반 카드 행동 차단: 작업 4
- 보관함 전체 `삭제` 입력 확인: 작업 5
- 전체 성공 또는 전체 실패: 작업 1·2·3
- 실패 시 카드와 선택 유지: 작업 3·5
- 모바일 하단 내비게이션 회피: 작업 5·7
- 최소 검증: 작업 1·2·3·4·5·7의 경계별 한 건

### 범위 점검

- 카테고리 일괄 변경, 휴지통과 복구는 구현하지 않는다.
- 홈과 꺼내보기의 `InsightGrid`는 선택 props를 전달하지 않아 기존 동작을 유지한다.
- 일반 버튼과 카드 배경색은 바꾸지 않는다.
- 전체 테스트는 실행하지 않는다.
- 서브에이전트를 사용하지 않고 현재 세션에서 작업 순서대로 구현한다.
