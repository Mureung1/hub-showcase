# 관심사 온보딩과 오늘의 깸 카드 API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 익명 사용자가 관심사를 저장·재설정하고, 저장한 관심사에 맞는 오늘의 깸 카드 1~3개를 화면에서 조회하는 vertical slice를 완성한다.

**Architecture:** Supabase Auth만 프론트가 직접 사용하고 모든 데이터는 FastAPI `/api`를 거친다. 관심사 전체 교체와 추천 후보 선정은 Postgres 함수로 원자성과 필터 기준을 보장하고, FastAPI는 사용자 JWT가 적용된 client로 함수를 호출한 뒤 camelCase 응답을 조립한다. 프론트는 익명 세션을 복구하고 API의 loading/error/empty/list 상태를 화면에 반영한다.

**Tech Stack:** PostgreSQL 15+, Supabase CLI 2.109.1, pgTAP, Supabase Python 2.31+, FastAPI 0.139+, Pydantic 2, Python 3.13 unittest, React 19, TypeScript 7, Vite 8, `@supabase/supabase-js`, Vitest, Testing Library

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-07-16-onboarding-today-api-design.md`와 `docs/plan/api-spec.md`다.
- 데이터 경로는 `프론트 → /api → Supabase`이고 Auth만 프론트가 Supabase에 직접 연결한다.
- 사용자 ID는 access token에서만 얻고 요청 body나 query의 사용자 ID를 신뢰하지 않는다.
- DB와 Python은 snake_case, API와 TypeScript는 camelCase를 쓴다.
- 요청 Pydantic schema는 `extra="forbid"`를 사용한다.
- production 코드에는 mock을 넣지 않는다. 단위 테스트는 외부 I/O 경계를 mock할 수 있다.
- DB 제약, transaction 원자성, RLS·RPC 권한, 동시성은 local Supabase 통합 테스트로 판정한다.
- 자동 추천은 `access_type='free'`만 허용하고 `partial_free`를 자동 노출하지 않는다.
- 원문 본문, 문장 배열, AI 요약을 저장하거나 API로 반환하지 않는다.
- 이번 범위는 오늘의 깸 카드 목록까지다. 글 상세와 미션 API는 만들지 않는다.
- migration 파일은 `supabase migration new` 명령으로 생성하고 CLI가 출력한 실제 경로를 이후 명령에 사용한다. 파일명을 손으로 만들지 않는다.
- 각 Task는 테스트와 검증을 통과한 뒤 해당 Task 파일만 한글 커밋 메시지로 커밋한다.

---

## Dependency Graph

```text
Task 0 실제 데이터·migration preflight
 ├─→ Task 1 replace_user_interests RPC
 │    └─→ Task 3 POST /api/user-interests
 ├─→ Task 2 GET /api/user-interests
 │    ├─→ Task 3 POST /api/user-interests
 │    └─→ Task 5 GET /api/articles/today
 └─→ Task 4 get_recommended_articles 교정
      └─→ Task 5 GET /api/articles/today

Task 3 + Task 5
 └─→ Task 6 인증 API smoke 확장
      └─→ Task 7 프론트 Auth/API client
           ├─→ Task 8 관심사 온보딩 연결
           └─→ Task 9 오늘의 깸 카드 연결
                └─→ Task 10 최종 E2E·문서 동기화
```

- Task 1, Task 2, Task 4는 Task 0 이후 병렬 진행할 수 있다.
- Task 3은 Task 1과 Task 2가 모두 끝나야 한다.
- Task 5는 Task 2와 Task 4가 모두 끝나야 한다.
- Task 8과 Task 9는 Task 7 이후 병렬 진행할 수 있지만 Task 10 전에는 둘 다 완료돼야 한다.

## File Map

### Database

- Create via CLI `supabase migration new create_replace_user_interests`: 관심사 전체 교체 RPC와 EXECUTE 권한
- Create via CLI `supabase migration new fix_recommended_articles_mvp_filters`: free-only 필터와 결정론적 정렬
- Create `supabase/tests/replace_user_interests_test.sql`: RPC validation, rollback, ACL
- Create `supabase/tests/recommended_articles_test.sql`: 추천 제외 조건과 정렬

### Backend

- Create `backend/app/schemas/user_interest.py`: GET/POST 관심사 요청·응답
- Create `backend/app/api/routes/user_interests.py`: 사용자 관심사 조회·저장 라우트
- Create `backend/app/schemas/article.py`: 오늘의 깸 카드 응답
- Create `backend/app/api/routes/articles.py`: 추천 RPC 호출, batch hydration, 응답 조립
- Modify `backend/app/main.py`: 두 router 등록
- Create `backend/tests/test_user_interests_api.py`: 관심사 API 단위 테스트
- Create `backend/tests/test_articles_today_api.py`: 추천 카드 API 단위 테스트
- Modify `scripts/smoke_api.py`: 인증 API와 필수 route smoke

### Frontend

- Modify `frontend/package.json`, `frontend/package-lock.json`: Supabase client와 test dependencies
- Create `frontend/src/lib/supabase.ts`: 익명 Auth client
- Create `frontend/src/api/types.ts`: API 응답 타입
- Create `frontend/src/api/client.ts`: access token을 매 요청에 넣는 `/api` client
- Create `frontend/src/api/client.test.ts`: API client 단위 테스트
- Create `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`: jsdom과 jest-dom test 환경
- Modify `frontend/src/App.tsx`: startup 분기와 화면 상태
- Modify `frontend/src/screens/InterestSelect.tsx`: 실제 목록·기존 선택·저장 연결
- Modify `frontend/src/screens/Today.tsx`: 실제 추천 카드 상태
- Modify `frontend/src/components/ArticleCard.tsx`: API article 타입과 외부 원문 링크
- Create `frontend/src/screens/InterestSelect.test.tsx`: 저장 성공·실패 화면 테스트
- Create `frontend/src/screens/Today.test.tsx`: loading·error·empty·list 화면 테스트

### QA Docs

- Modify `docs/quality/api-smoke.md`: GET/POST user interests와 today 기준
- Modify `docs/quality/core-flow.md`: 구현 완료 상태와 실제 API 흐름
- Modify `docs/quality/README.md`: 수집기와 신규 API 상태

---

### Task 0: 실제 데이터와 migration preflight

**Dependencies:** 없음

**Files:**
- Inspect: `supabase/migrations/`
- Inspect: `supabase/seeds/20260716_source_woowahan.sql`
- Inspect: `docs/plan/api-spec.md`

**Interfaces:**
- Consumes: 현재 local/remote Supabase 상태
- Produces: Task 1~5가 사용할 검증된 source ID, `IT·개발` interest ID, article/tag fixture 상태

- [ ] **Step 1: 현재 migration 이력을 비교한다**

Run:

```bash
supabase migration list
```

Expected: local과 remote에 기존 schema migration 10개와 RSS pipeline migration 2개가 같은 순서로 보인다. 차이가 있으면 API 작업을 시작하지 않고 migration 적용 주체를 한 명으로 정한다.

- [ ] **Step 2: 빈 local DB에서 전체 migration을 재생한다**

Run:

```bash
supabase db reset
```

Expected: exit code 0이고 `sources.content_type`, `excerpt_field`, `default_reading_time_minutes`, `ingest_rss_article(uuid,jsonb)`가 생성된다.

- [ ] **Step 3: 실제 추천 데이터 조건을 SQL로 확인한다**

Run in local SQL editor or `psql`:

```sql
select
  a.id,
  a.access_type,
  a.url_status,
  a.quality_score,
  s.name as source_name,
  s.trust_level,
  s.default_exposure,
  array_agg(i.name order by i.display_order) as interests
from articles a
join sources s on s.id = a.source_id
join content_interest_tags cit on cit.content_id = a.id
join interests i on i.id = cit.interest_id
group by a.id, s.id
order by a.created_at desc;
```

Expected: 최소 1개 article이 `free`, `active`, quality `>=0.65`, source high/medium, primary이며 `IT·개발` tag를 가진다. 다른 관심사는 빈 상태 테스트 대상으로 유지할 수 있다.

- [ ] **Step 4: 수집기 회귀 검증을 실행한다**

Run:

```bash
cd backend
.venv/bin/python -m unittest -v
```

Expected: 전체 수집기 단위 테스트가 통과한다. 실제 feed dry-run은 이미 `docs/quality/rss-dry-run.md`에서 판정했으므로 이 API 계획에서 임의의 source UUID를 다시 요구하지 않는다.

- [ ] **Step 5: preflight 결과를 작업 메모에 기록한다**

Update `progress.md`에는 local migration replay 결과, 실제로 조회된 `IT·개발` 추천 가능 article 수, 실제로 확인한 빈 상태 검증용 관심사 이름을 각각 한 줄로 기록한다. 숫자와 이름은 Step 3 SQL 결과를 그대로 쓰고 예상값을 미리 채우지 않는다.

Task 0은 코드 커밋을 만들지 않는다. `progress.md`는 로컬 진행 표면이므로 Git에 추가하지 않는다.

---

### Task 1: `replace_user_interests` RPC와 local DB 통합 테스트

**Dependencies:** Task 0

**Files:**
- Create via CLI: `supabase migration new create_replace_user_interests`가 출력한 migration 파일
- Create: `supabase/tests/replace_user_interests_test.sql`

**Interfaces:**
- Consumes: `auth.uid()`, `public.interests`, `public.user_interests`
- Produces: `public.replace_user_interests(p_interest_ids uuid[]) returns uuid[]`
- Security: `SECURITY INVOKER`, authenticated EXECUTE, PUBLIC/anon revoke

- [ ] **Step 1: migration 파일을 CLI로 생성한다**

Run:

```bash
supabase migration new create_replace_user_interests
```

Expected: CLI가 `supabase/migrations/` 아래에 `create_replace_user_interests.sql` suffix를 가진 파일 경로 하나를 출력한다. 이후 단계에서는 그 실제 경로를 사용한다.

- [ ] **Step 2: 실패하는 pgTAP 계약 테스트를 작성한다**

Create `supabase/tests/replace_user_interests_test.sql` with these assertions:

```sql
begin;
select plan(11);

select has_function(
  'public',
  'replace_user_interests',
  array['uuid[]'],
  'replace_user_interests(uuid[]) exists'
);

select ok(
  not has_function_privilege('anon', 'public.replace_user_interests(uuid[])', 'EXECUTE'),
  'anon cannot execute'
);

select ok(
  has_function_privilege('authenticated', 'public.replace_user_interests(uuid[])', 'EXECUTE'),
  'authenticated can execute'
);

-- Fixture user는 auth.users에 넣고 request.jwt.claim.sub를 설정한다.
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'onboarding-a@example.test',
  now(),
  now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

select is(
  cardinality(public.replace_user_interests(array[
    (select id from public.interests where launch_status='active' order by display_order limit 1)
  ])),
  1,
  'first save stores one interest'
);

select is(
  (select count(*)::integer from public.user_interests),
  1,
  'one user_interest row exists'
);

select throws_ok(
  $$ select public.replace_user_interests(array[]::uuid[]) $$,
  'P0001',
  'INTEREST_COUNT_OUT_OF_RANGE',
  'empty list rejected'
);

select is(
  (select count(*)::integer from public.user_interests),
  1,
  'failed replacement preserves previous rows'
);

select throws_ok(
  $$ select public.replace_user_interests(array[
    (select id from public.interests order by display_order limit 1),
    (select id from public.interests order by display_order limit 1)
  ]) $$,
  'P0001',
  'INTEREST_IDS_DUPLICATED',
  'duplicate ids rejected'
);

select throws_ok(
  $$ select public.replace_user_interests(array[gen_random_uuid()]) $$,
  'P0001',
  'INTEREST_NOT_SELECTABLE',
  'unknown id rejected'
);

select throws_ok(
  $$
  select public.replace_user_interests(
    (select array_agg(id order by display_order)
     from (select id, display_order from public.interests order by display_order limit 4) selected)
  )
  $$,
  'P0001',
  'INTEREST_COUNT_OUT_OF_RANGE',
  'four ids rejected'
);

update public.interests
set launch_status = 'hidden'
where id = (select id from public.interests order by display_order limit 1);

select throws_ok(
  $$ select public.replace_user_interests(array[
    (select id from public.interests where launch_status = 'hidden' order by display_order limit 1)
  ]) $$,
  'P0001',
  'INTEREST_NOT_SELECTABLE',
  'hidden interest rejected'
);

reset role;
select * from finish();
rollback;
```

- [ ] **Step 3: test가 함수 부재로 실패하는지 확인한다**

Run:

```bash
supabase test db --local supabase/tests/replace_user_interests_test.sql
```

Expected: FAIL because `replace_user_interests(uuid[])` does not exist.

- [ ] **Step 4: RPC migration을 구현한다**

Write the generated migration with this contract:

```sql
create or replace function public.replace_user_interests(p_interest_ids uuid[])
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := coalesce(cardinality(p_interest_ids), 0);
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if v_count < 1 or v_count > 3 then
    raise exception using errcode = 'P0001', message = 'INTEREST_COUNT_OUT_OF_RANGE';
  end if;
  if (select count(distinct id) from unnest(p_interest_ids) as ids(id)) <> v_count then
    raise exception using errcode = 'P0001', message = 'INTEREST_IDS_DUPLICATED';
  end if;
  if (
    select count(*)
    from public.interests
    where id = any(p_interest_ids)
      and launch_status in ('active', 'curated_only')
  ) <> v_count then
    raise exception using errcode = 'P0001', message = 'INTEREST_NOT_SELECTABLE';
  end if;

  delete from public.user_interests where user_id = v_user_id;
  insert into public.user_interests (user_id, interest_id)
  select v_user_id, id from unnest(p_interest_ids) as ids(id);
  return p_interest_ids;
end;
$$;

revoke execute on function public.replace_user_interests(uuid[]) from public;
revoke execute on function public.replace_user_interests(uuid[]) from anon;
grant execute on function public.replace_user_interests(uuid[]) to authenticated;
```

- [ ] **Step 5: local DB를 재생하고 pgTAP을 통과시킨다**

Run:

```bash
supabase db reset
supabase test db --local supabase/tests/replace_user_interests_test.sql
```

Expected: migration replay exit 0, pgTAP `Result: PASS`.

- [ ] **Step 6: migration과 test만 커밋한다**

```bash
git add supabase/migrations/*_create_replace_user_interests.sql supabase/tests/replace_user_interests_test.sql
git commit -m "feat: 관심사 전체 교체 RPC 추가"
```

---

### Task 2: `GET /api/user-interests`

**Dependencies:** Task 0

**Files:**
- Create: `backend/app/schemas/user_interest.py`
- Create: `backend/app/api/routes/user_interests.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_user_interests_api.py`

**Interfaces:**
- Consumes: `UserClient`, `CurrentUserId`, `public.user_interests` RLS
- Produces: `GET /api/user-interests -> UserInterestsResponse`

- [ ] **Step 1: 실패하는 API 테스트를 작성한다**

Create `backend/tests/test_user_interests_api.py` with dependency overrides for `get_current_user_id` and `get_user_client`. The fake client must return the same nested shape as Supabase:

```python
TEST_USER_ID = "10000000-0000-0000-0000-000000000001"
ID_1 = "20000000-0000-0000-0000-000000000001"
ID_2 = "20000000-0000-0000-0000-000000000002"
ID_3 = "20000000-0000-0000-0000-000000000003"
ID_4 = "20000000-0000-0000-0000-000000000004"
AUTH_HEADER = {"Authorization": "Bearer test-token"}

class UserInterestsApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_empty_user_returns_onboarding_false(self):
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
        app.dependency_overrides[get_user_client] = lambda: FakeUserClient([])
        response = self.client.get(
            "/api/user-interests",
            headers={"Authorization": "Bearer test-token"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"hasCompletedOnboarding": False, "interests": []},
        )

    def test_saved_interests_are_sorted_and_include_inactive(self):
        rows = [
            {"interests": {"id": ID_2, "name": "숨김", "display_order": 5,
                           "launch_status": "hidden"}},
            {"interests": {"id": ID_1, "name": "AI", "display_order": 1,
                           "launch_status": "active"}},
        ]
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
        app.dependency_overrides[get_user_client] = lambda: FakeUserClient(rows)
        response = self.client.get(
            "/api/user-interests",
            headers={"Authorization": "Bearer test-token"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([x["displayOrder"] for x in response.json()["interests"]], [1, 5])
        self.assertFalse(response.json()["interests"][1]["selectable"])
```

Add `test_get_requires_token` that performs the request without dependency overrides and asserts `401` plus `code="UNAUTHORIZED"`. In the sorted-response test, additionally assert `display_order` and `launch_status` are absent from every serialized item.

- [ ] **Step 2: route 부재로 실패하는지 확인한다**

Run:

```bash
cd backend
.venv/bin/python -m unittest tests.test_user_interests_api -v
```

Expected: FAIL with `404` or import failure for the missing route/schema.

- [ ] **Step 3: Pydantic response schema를 구현한다**

Create `backend/app/schemas/user_interest.py`:

```python
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class UserInterestItem(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: UUID
    name: str
    display_order: int
    launch_status: str
    selectable: bool

class UserInterestsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    has_completed_onboarding: bool
    interests: list[UserInterestItem]
```

- [ ] **Step 4: GET route를 구현한다**

Create `backend/app/api/routes/user_interests.py` with:

```python
router = APIRouter(prefix="/user-interests", tags=["user-interests"])
SELECTABLE = {"active", "curated_only"}

@router.get("", response_model=UserInterestsResponse)
def get_user_interests(
    _: CurrentUserId,
    client: UserClient,
) -> UserInterestsResponse:
    result = (
        client.table("user_interests")
        .select("interests(id,name,display_order,launch_status)")
        .execute()
    )
    items = [
        UserInterestItem(
            **row["interests"],
            selectable=row["interests"]["launch_status"] in SELECTABLE,
        )
        for row in result.data or []
    ]
    items.sort(key=lambda item: (item.display_order, str(item.id)))
    return UserInterestsResponse(
        has_completed_onboarding=bool(items),
        interests=items,
    )
```

Register the router in `backend/app/main.py`:

```python
from app.api.routes import health, interests, user_interests
app.include_router(user_interests.router, prefix="/api")
```

- [ ] **Step 5: 신규·전체 backend 테스트를 통과시킨다**

Run:

```bash
cd backend
.venv/bin/python -m unittest tests.test_user_interests_api -v
.venv/bin/python -m unittest -v
.venv/bin/python -m compileall -q app tests
```

Expected: all exit 0.

- [ ] **Step 6: GET API를 커밋한다**

```bash
git add backend/app/schemas/user_interest.py backend/app/api/routes/user_interests.py backend/app/main.py backend/tests/test_user_interests_api.py
git commit -m "feat: 사용자 관심사 조회 API 추가"
```

---

### Task 3: `POST /api/user-interests`

**Dependencies:** Task 1, Task 2

**Files:**
- Modify: `backend/app/schemas/user_interest.py`
- Modify: `backend/app/api/routes/user_interests.py`
- Modify: `backend/tests/test_user_interests_api.py`

**Interfaces:**
- Consumes: `replace_user_interests(uuid[])`, `UserClient`
- Produces: `POST /api/user-interests -> 201 { interestIds: UUID[] }`

- [ ] **Step 1: POST validation과 RPC mapping 실패 테스트를 추가한다**

Add these exact cases to `backend/tests/test_user_interests_api.py`:

```python
def test_post_rejects_empty_duplicate_four_and_extra_fields(self):
    invalid_bodies = [
        {"interestIds": []},
        {"interestIds": [ID_1, ID_1]},
        {"interestIds": [ID_1, ID_2, ID_3, ID_4]},
        {"interestIds": [ID_1], "userId": TEST_USER_ID},
    ]
    for body in invalid_bodies:
        with self.subTest(body=body):
            response = self.client.post(
                "/api/user-interests",
                json=body,
                headers=AUTH_HEADER,
            )
            self.assertEqual(response.status_code, 422)
            self.assertEqual(response.json()["code"], "VALIDATION_ERROR")

def test_post_calls_replace_rpc_and_returns_201(self):
    fake = FakeUserClient(rpc_result=[ID_1, ID_2])
    app.dependency_overrides[get_user_client] = lambda: fake
    response = self.client.post(
        "/api/user-interests",
        json={"interestIds": [ID_1, ID_2]},
        headers=AUTH_HEADER,
    )
    self.assertEqual(response.status_code, 201)
    self.assertEqual(response.json(), {"interestIds": [ID_1, ID_2]})
    self.assertEqual(fake.rpc_calls, [
        ("replace_user_interests", {"p_interest_ids": [ID_1, ID_2]})
    ])
```

Add this exact error-mapping case:

```python
def test_post_maps_rpc_validation_error_without_leaking_db_text(self):
    fake = FakeUserClient(rpc_error=RuntimeError(
        "INTEREST_NOT_SELECTABLE: select * from private_table"
    ))
    app.dependency_overrides[get_user_client] = lambda: fake
    response = self.client.post(
        "/api/user-interests",
        json={"interestIds": [ID_1]},
        headers=AUTH_HEADER,
    )
    self.assertEqual(response.status_code, 422)
    serialized = response.text
    self.assertNotIn("private_table", serialized)
    self.assertNotIn("INTEREST_NOT_SELECTABLE", serialized)
```

- [ ] **Step 2: POST route 부재로 test가 실패하는지 확인한다**

Run:

```bash
cd backend
.venv/bin/python -m unittest tests.test_user_interests_api -v
```

Expected: new POST tests fail with `405 Method Not Allowed`.

- [ ] **Step 3: request/response schema를 구현한다**

Append to `backend/app/schemas/user_interest.py`:

```python
from pydantic import Field, field_validator

class ReplaceUserInterestsRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )
    interest_ids: list[UUID] = Field(min_length=1, max_length=3)

    @field_validator("interest_ids")
    @classmethod
    def reject_duplicates(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("관심사는 중복될 수 없습니다.")
        return value

class ReplaceUserInterestsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    interest_ids: list[UUID]
```

- [ ] **Step 4: POST route와 안전한 DB error mapping을 구현한다**

Add to `backend/app/api/routes/user_interests.py`:

```python
RPC_VALIDATION_ERRORS = {
    "INTEREST_COUNT_OUT_OF_RANGE",
    "INTEREST_IDS_DUPLICATED",
    "INTEREST_NOT_SELECTABLE",
}

@router.post("", response_model=ReplaceUserInterestsResponse, status_code=201)
def replace_user_interests(
    body: ReplaceUserInterestsRequest,
    _: CurrentUserId,
    client: UserClient,
) -> ReplaceUserInterestsResponse:
    ids = [str(value) for value in body.interest_ids]
    try:
        result = client.rpc(
            "replace_user_interests",
            {"p_interest_ids": ids},
        ).execute()
    except Exception as exc:
        marker = next(
            (value for value in RPC_VALIDATION_ERRORS if value in str(exc)),
            None,
        )
        if marker is not None:
            raise ApiError(422) from exc
        raise
    return ReplaceUserInterestsResponse(interest_ids=result.data or ids)
```

Do not return `str(exc)` in the response or log the token.

- [ ] **Step 5: POST API와 전체 backend 회귀를 통과시킨다**

Run:

```bash
cd backend
.venv/bin/python -m unittest tests.test_user_interests_api -v
.venv/bin/python -m unittest -v
.venv/bin/python -m compileall -q app tests
```

Expected: all exit 0. The fake client confirms exactly one RPC call and no direct delete/insert calls.

- [ ] **Step 6: POST API를 커밋한다**

```bash
git add backend/app/schemas/user_interest.py backend/app/api/routes/user_interests.py backend/tests/test_user_interests_api.py
git commit -m "feat: 사용자 관심사 저장 API 추가"
```

---

### Task 4: 추천 함수 MVP 필터와 결정론적 정렬

**Dependencies:** Task 0

**Files:**
- Create via CLI: `supabase migration new fix_recommended_articles_mvp_filters`가 출력한 migration 파일
- Create: `supabase/tests/recommended_articles_test.sql`

**Interfaces:**
- Consumes: `user_interests`, `content_interest_tags`, `articles`, `sources`, `mission_records`
- Produces: 기존 signature를 유지한 `get_recommended_articles(uuid,integer)`

- [ ] **Step 1: 추천 함수 migration 파일을 생성한다**

Run:

```bash
supabase migration new fix_recommended_articles_mvp_filters
```

Expected: 한 migration file 생성.

- [ ] **Step 2: 제외 조건과 정렬에 대한 실패 pgTAP test를 작성한다**

Create `supabase/tests/recommended_articles_test.sql`. Begin a transaction, create auth user `10000000-0000-0000-0000-000000000001`, use the first existing active interest, and insert source/article/tag fixtures with UUIDs in the `30000000-...` source range and `40000000-...` article range. Assert these conditions:

```sql
select plan(9);

-- 추천 가능한 free/high/primary/active/quality article 2개를 같은 total_score로 만든다.
-- published_at이 최신인 글이 먼저, 같은 published_at이면 article_id가 작은 글이 먼저여야 한다.

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 3)),
  3,
  'three eligible articles returned'
);

select is(
  (select recency_score from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 3)
   where article_id = '40000000-0000-0000-0000-000000000003'),
  0.1::numeric,
  'null published_at gets 0.1 recency'
);

select results_eq(
  $$ select article_id from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 3) $$,
  $$ values
       ('40000000-0000-0000-0000-000000000001'::uuid),
       ('40000000-0000-0000-0000-000000000002'::uuid),
       ('40000000-0000-0000-0000-000000000003'::uuid)
  $$,
  'ties are deterministic by published_at then article_id'
);
```

Add six named `is((select count(*) ...), 0, ...)` assertions, one for each fixture below. Each query filters the function result by the fixture UUID so a failure identifies the violated rule directly:

- `40000000-0000-0000-0000-000000000011`: `partial_free`
- `40000000-0000-0000-0000-000000000012`: source `trust_level='low'`
- `40000000-0000-0000-0000-000000000013`: source `default_exposure='optional'`
- `40000000-0000-0000-0000-000000000014`: `url_status='broken'`
- `40000000-0000-0000-0000-000000000015`: `quality_score=0.64`
- `40000000-0000-0000-0000-000000000016`: 해당 user의 completed mission record가 존재

`plan(9)`는 eligible count, null recency, deterministic order, 위 여섯 제외 assertion의 합계와 일치시킨다.

- [ ] **Step 3: 현재 함수가 partial_free와 느슨한 source 조건 때문에 실패하는지 확인한다**

Run:

```bash
supabase test db --local supabase/tests/recommended_articles_test.sql
```

Expected: FAIL on at least the partial-free or source strictness assertion.

- [ ] **Step 4: 기존 함수 body를 새 migration에서 교정한다**

Copy the current function into the generated migration, preserving return columns and `STABLE`, then make these exact changes:

```sql
from public.articles a
join public.sources s on s.id = a.source_id
where a.access_type = 'free'
  and a.url_status = 'active'
  and a.quality_score >= 0.65
  and s.trust_level in ('high', 'medium')
  and s.default_exposure = 'primary'
```

Include `a.published_at` in `candidates` and change the final order:

```sql
order by
  total_score desc,
  c.published_at desc nulls last,
  c.article_id
limit p_limit;
```

Keep:

```sql
security invoker
set search_path = public
```

If `security invoker` is omitted because it is the default, assert `prosecdef=false` in the test.

- [ ] **Step 5: local migration replay와 추천 pgTAP을 통과시킨다**

Run:

```bash
supabase db reset
supabase test db --local supabase/tests/recommended_articles_test.sql
```

Expected: migration replay exit 0 and pgTAP PASS.

- [ ] **Step 6: 추천 함수 교정을 커밋한다**

```bash
git add supabase/migrations/*_fix_recommended_articles_mvp_filters.sql supabase/tests/recommended_articles_test.sql
git commit -m "fix: 오늘의 글 추천 함수 조건 수정"
```

---

### Task 5: `GET /api/articles/today`

**Dependencies:** Task 2, Task 4

**Files:**
- Create: `backend/app/schemas/article.py`
- Create: `backend/app/api/routes/articles.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_articles_today_api.py`

**Interfaces:**
- Consumes: `get_recommended_articles(p_user_id,p_limit)`, `UserClient`, `CurrentUserId`
- Produces: `GET /api/articles/today?limit=1..3 -> TodayArticlesResponse`

- [ ] **Step 1: empty, ranking, card mapping 실패 테스트를 작성한다**

Create `backend/tests/test_articles_today_api.py` with these cases:

```python
TEST_USER_ID = "10000000-0000-0000-0000-000000000001"
INTEREST_AI = {
    "id": "20000000-0000-0000-0000-000000000001",
    "name": "AI",
    "display_order": 1,
    "empty_state_message": "AI 관심사에 맞는 글을 준비하고 있어요.",
}
ARTICLE_A = "40000000-0000-0000-0000-000000000001"
ARTICLE_B = "40000000-0000-0000-0000-000000000002"
ARTICLE_A_ROW = make_article_row(ARTICLE_A, "A 글")
ARTICLE_B_ROW = make_article_row(ARTICLE_B, "B 글")

def test_no_interests_returns_onboarding_empty_without_rpc(self):
    fake = FakeTodayClient(user_interests=[], recommendations=[])
    override_user(fake)
    response = client.get("/api/articles/today", headers=AUTH_HEADER)
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.json()["items"], [])
    self.assertIsNotNone(response.json()["emptyStateMessage"])
    self.assertEqual(fake.recommendation_rpc_calls, 0)

def test_hydration_preserves_rpc_order(self):
    fake = FakeTodayClient(
        user_interests=[INTEREST_AI],
        recommendations=[{"article_id": ARTICLE_B}, {"article_id": ARTICLE_A}],
        articles=[ARTICLE_A_ROW, ARTICLE_B_ROW],
    )
    override_user(fake)
    response = client.get("/api/articles/today?limit=2", headers=AUTH_HEADER)
    self.assertEqual([item["id"] for item in response.json()["items"]], [ARTICLE_B, ARTICLE_A])

def test_limit_validation(self):
    for value in (0, 4):
        response = client.get(f"/api/articles/today?limit={value}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 422)

def test_card_contains_no_body_or_sentences(self):
    response = client.get("/api/articles/today", headers=AUTH_HEADER)
    item = response.json()["items"][0]
    self.assertNotIn("body", item)
    self.assertNotIn("sentences", item)
    self.assertNotIn("summary", item)
```

Add three separately named tests: `test_reason_tie_breaks_by_confidence_display_order_and_id`, `test_empty_state_uses_common_message_when_selected_messages_are_null`, and `test_today_requires_token`. The first supplies three matching tags whose values force each tie-break key in turn and asserts the chosen tag name; the second supplies only null `empty_state_message` values and asserts the approved common message; the third omits the Authorization header and asserts `401` plus `code="UNAUTHORIZED"`.

- [ ] **Step 2: route/schema 부재로 test가 실패하는지 확인한다**

Run:

```bash
cd backend
.venv/bin/python -m unittest tests.test_articles_today_api -v
```

Expected: FAIL with `404` or missing schema import.

- [ ] **Step 3: article response schema를 구현한다**

Create `backend/app/schemas/article.py` with camelCase models matching `api-spec.md`:

```python
class InterestTag(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: UUID
    name: str

class TodayArticle(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: UUID
    title: str
    translated_title: str | None
    source_name: str
    source_type: str
    content_type: str
    published_at: datetime | None
    interest_tags: list[InterestTag]
    official_excerpt: str | None
    translated_excerpt: str | None
    thumbnail_url: str | None
    reading_time_minutes: int | None
    language: str
    access_type: str
    original_url: str
    recommendation_reason: str

class TodayArticlesResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    items: list[TodayArticle]
    empty_state_message: str | None
```

- [ ] **Step 4: today route와 batch hydration을 구현한다**

Create `backend/app/api/routes/articles.py`:

```python
router = APIRouter(prefix="/articles", tags=["articles"])

@router.get("/today", response_model=TodayArticlesResponse)
def get_today_articles(
    user_id: CurrentUserId,
    client: UserClient,
    limit: Annotated[int, Query(ge=1, le=3)] = 3,
) -> TodayArticlesResponse:
    selected = fetch_selected_interests(client)
    if not selected:
        return TodayArticlesResponse(items=[], empty_state_message=ONBOARDING_EMPTY_MESSAGE)

    ranked = client.rpc(
        "get_recommended_articles",
        {"p_user_id": user_id, "p_limit": limit},
    ).execute().data or []
    ranked_ids = [row["article_id"] for row in ranked]
    if not ranked_ids:
        return TodayArticlesResponse(
            items=[],
            empty_state_message=pick_empty_message(selected),
        )

    rows = fetch_article_cards(client, ranked_ids)
    by_id = {row["id"]: row for row in rows}
    items = [build_card(by_id[id_], selected) for id_ in ranked_ids if id_ in by_id]
    return TodayArticlesResponse(items=items, empty_state_message=None)
```

`fetch_article_cards` must issue one select for all IDs and include nested source and interest tags. `build_card` must map `canonical_url` to API `originalUrl`; do not expose `metadata.ingestion.original_url` because it may contain tracking parameters.

Register router:

```python
from app.api.routes import articles, health, interests, user_interests
app.include_router(articles.router, prefix="/api")
```

- [ ] **Step 5: recommendation reason과 empty message helpers를 구현한다**

Use deterministic helpers in the same route module or a focused `backend/app/articles/service.py` if the route exceeds 200 lines:

```python
def choose_reason_tag(tags: list[dict], selected_ids: set[str]) -> dict | None:
    matches = [tag for tag in tags if tag["id"] in selected_ids]
    return min(
        matches,
        key=lambda tag: (
            -float(tag.get("confidence", 0)),
            int(tag["display_order"]),
            str(tag["id"]),
        ),
        default=None,
    )

def recommendation_reason(tag: dict | None) -> str:
    return (
        f"{tag['name']} 관심사와 맞는 글이에요."
        if tag is not None
        else "관심사와 맞는 글이에요."
    )
```

For empty state, sort selected interests by `(display_order, id)` and return the first non-null `empty_state_message`; otherwise return the fixed common message from the approved design.

- [ ] **Step 6: today API와 전체 backend 회귀를 통과시킨다**

Run:

```bash
cd backend
.venv/bin/python -m unittest tests.test_articles_today_api -v
.venv/bin/python -m unittest -v
.venv/bin/python -m compileall -q app tests
```

Expected: all exit 0, response contains camelCase only, ranking order matches RPC order.

- [ ] **Step 7: today API를 커밋한다**

```bash
git add backend/app/schemas/article.py backend/app/api/routes/articles.py backend/app/main.py backend/tests/test_articles_today_api.py
git commit -m "feat: 관심사 기반 오늘의 글 API 추가"
```

---

### Task 6: 인증 API smoke와 OpenAPI gate

**Dependencies:** Task 3, Task 5

**Files:**
- Modify: `scripts/smoke_api.py`
- Modify: `docs/quality/api-smoke.md`

**Interfaces:**
- Consumes: 실행 중인 backend, test anonymous access token
- Produces: 전체 endpoint contract smoke 결과

- [ ] **Step 1: smoke script가 access token을 받도록 실패 검증을 추가한다**

Add CLI option and headers:

```python
parser.add_argument("--token", default=None)

def auth_headers(token: str | None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"} if token else {}
```

Add checks:

```python
required = {
    "/api/health",
    "/api/interests",
    "/api/user-interests",
    "/api/articles/today",
}

assert_status("GET /api/user-interests without token", 401)
assert_status("GET /api/articles/today without token", 401)
if args.token:
    assert_status("GET /api/user-interests with token", 200, headers=auth_headers(args.token))
    assert_status("GET /api/articles/today?limit=0", 422, headers=auth_headers(args.token))
    assert_status("GET /api/articles/today?limit=4", 422, headers=auth_headers(args.token))
    assert_today_contract(headers=auth_headers(args.token))
```

- [ ] **Step 2: 기존 script가 필수 route 누락으로 실패하는지 확인한다**

Run against a backend before Task 2~5 code, or temporarily assert a fake missing route in the test branch:

```bash
uv run scripts/smoke_api.py --base http://localhost:8000
```

Expected before implementation: FAIL listing the missing protected routes. Expected after Tasks 2~5: public checks pass and protected endpoints return 401 without token.

- [ ] **Step 3: authenticated smoke를 실행한다**

Run:

```bash
TEST_ACCESS_TOKEN='token copied from the local anonymous session' \
uv run scripts/smoke_api.py --base http://localhost:8000 --token "$TEST_ACCESS_TOKEN"
```

Expected: health/interests/user-interests/today/OpenAPI checks all PASS.

- [ ] **Step 4: QA 문서의 오래된 POST 계약을 RPC 원자성 기준으로 고친다**

In `docs/quality/api-smoke.md`, replace the old direct delete/insert and `400 또는 422` wording with the exact `201/401/422` contract from `api-spec.md`. Add today card checks and state that DB rollback/ACL is judged by pgTAP, not API mock tests.

- [ ] **Step 5: smoke와 문서를 커밋한다**

```bash
git add scripts/smoke_api.py docs/quality/api-smoke.md
git commit -m "test: 관심사와 오늘의 글 API smoke 추가"
```

---

### Task 7: 프론트 Supabase Auth와 API client

**Dependencies:** Task 6

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/api/types.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/client.test.ts`

**Interfaces:**
- Consumes: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, backend API contracts
- Produces: `ensureAnonymousSession()`, `apiRequest<T>()`, typed endpoint functions

- [ ] **Step 1: 현재 공식 API를 확인하고 dependencies를 설치한다**

Run:

```bash
cd frontend
npm install @supabase/supabase-js
npm install --save-dev vitest
```

Expected: package files change only by the resolved latest compatible packages. Before implementation, confirm `createClient`, `auth.getSession`, and `auth.signInAnonymously` signatures in current official Supabase JS docs.

- [ ] **Step 2: API client 실패 테스트를 작성한다**

Add `"test": "vitest run"` to package scripts and create `frontend/src/api/client.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'

describe('api client', () => {
  it('reads the latest token for every request', async () => {
    const getToken = vi
      .fn()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2')
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], emptyStateMessage: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(getToken, fetcher)
    await api.getTodayArticles()
    await api.getTodayArticles()
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token-1' })
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer token-2' })
  })

  it('throws ApiClientError with the common error envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: '요청값을 확인해 주세요.',
        details: [{ field: 'interestIds', reason: 'too_short' }],
      }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    await expect(api.getTodayArticles()).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: '요청값을 확인해 주세요.',
      details: [{ field: 'interestIds', reason: 'too_short' }],
    })
  })
})
```

- [ ] **Step 3: test가 missing client로 실패하는지 확인한다**

Run:

```bash
cd frontend
npm test
```

Expected: FAIL because `createApiClient` is missing.

- [ ] **Step 4: Supabase client와 anonymous session helper를 구현한다**

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !publishableKey) throw new Error('Supabase public env is required')

export const supabase = createClient(url, publishableKey)

export async function ensureAnonymousSession() {
  const current = await supabase.auth.getSession()
  if (current.data.session) return current.data.session
  const created = await supabase.auth.signInAnonymously()
  if (created.error || !created.data.session) throw created.error ?? new Error('Anonymous sign-in failed')
  return created.data.session
}

export async function getAccessToken(): Promise<string> {
  const session = await ensureAnonymousSession()
  return session.access_token
}
```

- [ ] **Step 5: endpoint types와 API client를 구현한다**

Create `frontend/src/api/types.ts` from the exact `api-spec.md` fields for `Interest`, `UserInterestsResponse`, `ReplaceUserInterestsResponse`, `TodayArticle`, `TodayArticlesResponse`, and `ErrorResponse`.

Create `frontend/src/api/client.ts`:

```typescript
export function createApiClient(
  getToken: () => Promise<string>,
  fetcher: typeof fetch = fetch,
) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const response = await fetcher(`/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    })
    const body = await response.json()
    if (!response.ok) throw new ApiClientError(response.status, body)
    return body as T
  }

  return {
    getInterests: () => request<Interest[]>('/interests'),
    getUserInterests: () => request<UserInterestsResponse>('/user-interests'),
    replaceUserInterests: (interestIds: string[]) => request<ReplaceUserInterestsResponse>(
      '/user-interests',
      { method: 'POST', body: JSON.stringify({ interestIds }) },
    ),
    getTodayArticles: () => request<TodayArticlesResponse>('/articles/today'),
  }
}
```

Export a production `api` instance using `getAccessToken`.

- [ ] **Step 6: frontend client tests, typecheck, lint, build를 통과시킨다**

Run:

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all exit 0.

- [ ] **Step 7: Auth/API client를 커밋한다**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/supabase.ts frontend/src/api/types.ts frontend/src/api/client.ts frontend/src/api/client.test.ts
git commit -m "feat: 프론트 익명 인증과 API 클라이언트 추가"
```

---

### Task 8: 관심사 온보딩 화면 API 연결

**Dependencies:** Task 3, Task 7

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/screens/InterestSelect.tsx`
- Create: `frontend/src/screens/InterestSelect.test.tsx`
- Modify: `frontend/package.json`, `frontend/package-lock.json`

**Interfaces:**
- Consumes: `api.getUserInterests`, `api.getInterests`, `api.replaceUserInterests`
- Produces: startup onboarding/today 분기, 저장 성공 전용 화면 전환

- [ ] **Step 1: React component test dependencies를 설치한다**

Run:

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom
npm install --save-dev @testing-library/user-event
```

Create `frontend/vitest.config.ts` with `environment: 'jsdom'` and a setup file that imports `@testing-library/jest-dom/vitest`. Keep `frontend/vite.config.ts` unchanged.

- [ ] **Step 2: 관심사 화면 실패 테스트를 작성한다**

Create `frontend/src/screens/InterestSelect.test.tsx`:

```typescript
it('loads interests and saves selected ids before completing', async () => {
  const onComplete = vi.fn()
  const replace = vi.fn().mockResolvedValue({ interestIds: ['interest-1'] })
  render(
    <InterestSelect
      interests={[{ id: 'interest-1', name: 'IT·개발', displayOrder: 1,
        launchStatus: 'active', riskLevel: 'low', emptyStateMessage: null }]}
      initialSelectedIds={[]}
      onSave={replace}
      onComplete={onComplete}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'IT·개발' }))
  await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))
  expect(replace).toHaveBeenCalledWith(['interest-1'])
  expect(onComplete).toHaveBeenCalledAfter(replace)
})

it('keeps the screen open and shows an error when save fails', async () => {
  const onComplete = vi.fn()
  const replace = vi.fn().mockRejectedValue(new Error('network'))
  render(
    <InterestSelect
      interests={[{ id: 'interest-1', name: 'IT·개발', displayOrder: 1,
        launchStatus: 'active', riskLevel: 'low', emptyStateMessage: null }]}
      initialSelectedIds={['interest-1']}
      onSave={replace}
      onComplete={onComplete}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: /깸 시작하기/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/다시 시도/)
  expect(onComplete).not.toHaveBeenCalled()
})
```

Add App startup tests: onboarding false shows InterestSelect; true shows Today.

- [ ] **Step 3: current hardcoded screen 때문에 test가 실패하는지 확인한다**

Run:

```bash
cd frontend
npm test
```

Expected: FAIL because `InterestSelect` lacks `interests`, `initialSelectedIds`, and `onSave` props.

- [ ] **Step 4: InterestSelect의 hardcoded data를 props로 교체한다**

Change its contract:

```typescript
type InterestSelectProps = {
  interests: Interest[]
  initialSelectedIds: string[]
  onSave: (interestIds: string[]) => Promise<ReplaceUserInterestsResponse>
  onComplete: () => void
}
```

Initialize state from `initialSelectedIds`. On submit:

```typescript
setSaveState('saving')
try {
  await onSave(selectedIds)
  onComplete()
} catch {
  setSaveState('error')
}
```

Disable the submit button while saving and render a retryable error message. Preserve the current 1~3 selection UX and first 10/display-order behavior.

- [ ] **Step 5: App startup state machine을 구현한다**

Use these states instead of defaulting immediately to onboarding:

```typescript
type AppState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'onboarding'; interests: Interest[]; selectedIds: string[] }
  | { status: 'today' }
```

On mount, call `ensureAnonymousSession`, `api.getUserInterests`, and when onboarding is needed `api.getInterests`. Do not call `setState` after an unmounted effect; use an effect cancellation boolean.

- [ ] **Step 6: onboarding tests와 frontend 검증을 통과시킨다**

Run:

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all exit 0.

- [ ] **Step 7: 관심사 화면 연결을 커밋한다**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/App.tsx frontend/src/screens/InterestSelect.tsx frontend/src/screens/InterestSelect.test.tsx
git commit -m "feat: 관심사 온보딩을 API에 연결"
```

---

### Task 9: 오늘의 깸 카드 목록 API 연결

**Dependencies:** Task 5, Task 7, Task 8

**Files:**
- Modify: `frontend/src/screens/Today.tsx`
- Modify: `frontend/src/components/ArticleCard.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/screens/Today.test.tsx`

**Interfaces:**
- Consumes: `api.getTodayArticles`, `TodayArticlesResponse`
- Produces: loading/error/empty/list 상태와 실제 원문 링크 카드

- [ ] **Step 1: Today 네 상태에 대한 실패 component test를 작성한다**

Create `frontend/src/screens/Today.test.tsx`:

```typescript
const ARTICLE_A = makeTodayArticle('40000000-0000-0000-0000-000000000001', 'A 글')
const ARTICLE_B = makeTodayArticle('40000000-0000-0000-0000-000000000002', 'B 글')

it('renders loading state', () => {
  render(<Today state={{ status: 'loading' }} />)
  expect(screen.getByText(/불러오고/)).toBeInTheDocument()
})

it('renders retryable error state', async () => {
  const onRetry = vi.fn()
  render(<Today state={{ status: 'error', message: '불러오지 못했어요.', onRetry }} />)
  await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

it('renders empty state message when items are empty', () => {
  render(<Today state={{ status: 'success', items: [], emptyStateMessage: '준비 중이에요.' }} />)
  expect(screen.getByText('준비 중이에요.')).toBeInTheDocument()
})

it('renders feature first and compact remaining cards in API order', () => {
  render(<Today state={{ status: 'success', items: [ARTICLE_B, ARTICLE_A], emptyStateMessage: null }} />)
  const cards = screen.getAllByRole('article')
  expect(cards[0]).toHaveTextContent(ARTICLE_B.title)
  expect(cards[1]).toHaveTextContent(ARTICLE_A.title)
})

it('uses originalUrl as an external link', () => {
  render(<Today state={{ status: 'success', items: [ARTICLE_A], emptyStateMessage: null }} />)
  expect(screen.getByRole('link', { name: /읽고 미션 받기/ })).toHaveAttribute('href', ARTICLE_A.originalUrl)
})
```

- [ ] **Step 2: hardcoded Today 때문에 test가 실패하는지 확인한다**

Run:

```bash
cd frontend
npm test
```

Expected: FAIL because Today has no state prop and renders `FEATURED_ARTICLE`.

- [ ] **Step 3: ArticleCard를 API 타입으로 교체한다**

Remove the prototype-only `contentTypeLabel` and `interestName` fields. Accept `TodayArticle` and map source type labels exactly:

```typescript
const SOURCE_TYPE_LABEL = {
  news: '뉴스',
  official_blog: '공식 블로그',
  expert_article: '전문 아티클',
} as const
```

Render the first `interestTags[0]?.name`, nullable excerpt/reading time safely, and use an anchor with `href={article.originalUrl}`, `target="_blank"`, `rel="noreferrer"`.

- [ ] **Step 4: Today 화면의 hardcoded articles를 제거한다**

Use this prop contract:

```typescript
type TodayState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; items: TodayArticle[]; emptyStateMessage: string | null }

type TodayProps = { state: TodayState }
```

For success, render `items[0]` as feature and `items.slice(1)` as compact cards. Do not invent fallback article data.

- [ ] **Step 5: App에서 today API lifecycle을 연결한다**

When App enters today, call `api.getTodayArticles()` once. On failure store the common API message and a retry callback. Disconnect the current Today → internal Read navigation; keep `Read.tsx` and `Mission.tsx` files untouched because deletion is outside this scope.

- [ ] **Step 6: Today tests와 frontend 회귀를 통과시킨다**

Run:

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all exit 0, no hardcoded `FEATURED_ARTICLE` or `MORE_ARTICLES` remains in Today.

- [ ] **Step 7: Today 화면 연결을 커밋한다**

```bash
git add frontend/src/App.tsx frontend/src/screens/Today.tsx frontend/src/components/ArticleCard.tsx frontend/src/screens/Today.test.tsx
git commit -m "feat: 오늘의 깸 카드를 API에 연결"
```

---

### Task 10: 최종 local E2E와 QA 문서 동기화

**Dependencies:** Task 1~9

**Files:**
- Modify: `docs/quality/core-flow.md`
- Modify: `docs/quality/README.md`
- Modify: `progress.md` locally only

**Interfaces:**
- Consumes: local Supabase, backend, frontend, anonymous sessions A/B
- Produces: 구현 완료 증거와 최신 QA 상태

- [ ] **Step 1: fresh local DB와 pgTAP 전체를 검증한다**

Run:

```bash
supabase db reset
supabase test db --local supabase/tests
```

Expected: migration replay exit 0, all pgTAP PASS.

- [ ] **Step 2: backend 전체 검증을 실행한다**

Run:

```bash
cd backend
.venv/bin/python -m unittest -v
.venv/bin/python -m compileall -q app tests
```

Expected: all tests pass, compile exit 0.

- [ ] **Step 3: frontend 전체 검증을 실행한다**

Run:

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all exit 0.

- [ ] **Step 4: 실제 anonymous sessions A/B로 E2E를 판정한다**

Run local Supabase, backend, frontend. Use a normal browser window for A and incognito for B.

Expected sequence:

```text
A: 첫 접속 → onboarding
A: IT·개발 선택·저장 → today 카드 1~3개
A: 새로고침 → onboarding 건너뜀 → today
B: 첫 접속 → onboarding, A 관심사 보이지 않음
B: 후보 없는 관심사 저장 → today empty state, 500 없음
A: 설정 진입 경로가 생기기 전까지 API 직접 재저장 → GET 결과가 새 목록으로 교체
```

Do not claim settings-screen completion; 이번 범위는 재저장 API까지이고 설정 화면 자체는 포함하지 않는다.

- [ ] **Step 5: 실제 DB 경계를 확인한다**

For test users only, query `user_interests` and confirm A/B rows are separated. Confirm today response articles are all free/active/high-or-medium/primary and have at least one matching tag. Delete only the recorded A/B test user UUIDs afterward.

동시성은 mock으로 완료 판정하지 않는다. local Supabase에 같은 익명 사용자 토큰을 적용한 두 `psql` 세션을 열어 한 세션은 관심사 ID 1개, 다른 세션은 서로 다른 ID 2개로 `replace_user_interests`를 동시에 호출한다. 두 호출이 모두 끝난 뒤 해당 사용자의 행 집합이 정확히 첫 요청의 1개 집합 또는 두 번째 요청의 2개 집합 중 하나인지 확인한다. 빈 집합, 두 요청의 합집합, 중복 행이면 실패다.

- [ ] **Step 6: QA 문서를 현재 상태로 갱신한다**

Update:

- `docs/quality/core-flow.md`: 관심사 저장을 구현 완료 흐름으로 변경하고 today loading/error/empty/list를 추가
- `docs/quality/README.md`: RSS 수집기, 관심사 API, today API의 실제 구현 상태 반영

Do not mark DB RPC atomicity or RLS as complete unless Step 1 pgTAP and Step 5 A/B verification both passed.

- [ ] **Step 7: 최종 diff와 작업 트리를 검증한다**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Only intended QA docs are unstaged before the final docs commit.

- [ ] **Step 8: QA 문서를 커밋한다**

```bash
git add docs/quality/core-flow.md docs/quality/README.md
git commit -m "docs: 관심사와 오늘의 깸 완료 기준 갱신"
```

---

## Completion Checklist

- [ ] `replace_user_interests`가 1~3개 관심사를 원자적으로 전체 교체한다.
- [ ] RPC 실패 시 기존 관심사가 유지된다.
- [ ] PUBLIC/anon은 RPC를 실행할 수 없고 authenticated만 실행한다.
- [ ] `GET /api/user-interests`가 온보딩 이력과 비활성 기존 관심사를 정확히 반환한다.
- [ ] `POST /api/user-interests`가 최초 저장과 재설정을 모두 처리한다.
- [ ] 자동 추천에서 partial-free, low-trust, non-primary, broken, 품질 미달, 완료 글이 제외된다.
- [ ] 추천 동점 순서가 결정론적이다.
- [ ] `GET /api/articles/today`가 관심사 일치 카드 1~3개 또는 정상 빈 상태를 반환한다.
- [ ] today 응답과 화면에 원문 본문·문장 배열·AI 요약이 없다.
- [ ] 프론트가 익명 세션을 복구하고 매 요청에 최신 access token을 사용한다.
- [ ] 미저장 사용자는 onboarding, 저장 사용자는 today로 이동한다.
- [ ] 관심사 저장 성공 전에는 today로 이동하지 않는다.
- [ ] Today 화면이 loading/error/empty/list 네 상태를 처리한다.
- [ ] local Supabase pgTAP, backend tests, frontend tests/typecheck/lint/build, API smoke가 모두 통과한다.
- [ ] 실제 A/B 익명 사용자에서 RLS 격리와 사용자 흐름을 확인한다.
- [ ] 같은 사용자의 동시 관심사 교체 결과가 한 요청의 완전한 집합이며 빈 값·합집합·중복이 아니다.
