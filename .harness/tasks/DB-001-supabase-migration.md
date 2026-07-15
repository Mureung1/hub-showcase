# Task Packet: DB-001

## 1. Summary

```text
Task: Supabase PostgreSQL schema, migration과 canonical data 이관
Backlog ID: DB-001 / W2-D4
GitHub Issue: #11
Jira Parent: LT-1
Parent Epic: EPIC-02
Type: feature/security
Owner: N187_정현우
Status: done
Implementation model: sol medium
```

SQLAlchemy/Alembic source와 전체 canonical seed를 구현했고 실제 development Supabase에서
migration, 2회 seed, count·대표 query 검증을 완료했다. 관련 commit을 `develop`에 push하고
GitHub #11도 완료로 종료했다. Jira LT-4의 수동 상태 동기화만 사용자 작업으로 남는다.

## 2. Goal

Phase 1의 검증된 canonical SQLite를 import·회귀 검증 기준으로 유지하면서,
동일한 7개 table과 전체 업종 데이터를 Supabase PostgreSQL 제품 runtime으로
반복 가능하게 이관한다. 현재 UI가 지원하는 4개 분석 분류만 선별하지 않는다.

완료 후 데이터 흐름은 다음과 같다.

```text
official raw snapshot
  -> canonical SQLite (import source and verification baseline)
  -> deterministic seed
  -> Supabase PostgreSQL (single product runtime DB)
  -> FastAPI repository
  -> SEARCH-001에서 React와 연결
```

이는 DB를 세 개 운영한다는 뜻이 아니다. Docker PostgreSQL은 필요할 때 migration을
검증하는 선택적 개발 도구일 뿐이며 이번 Task의 필수 runtime이 아니다.

### 2.1 Fixed Decisions

- 제품 runtime DB는 Supabase PostgreSQL 하나다.
- canonical SQLite는 폐기하지 않고 import 원본과 검증 기준으로 유지한다.
- FastAPI의 DB 접근은 SQLAlchemy 2.x를 사용한다.
- schema 변경 이력은 Alembic으로 관리한다.
- PostgreSQL driver는 Psycopg 3를 사용한다.
- browser는 DB에 직접 접속하지 않고 FastAPI만 호출한다.
- `DATABASE_URL`, DB password와 service role key는 server 환경에만 둔다.
- schema·seed는 4개 UI Category가 아니라 검증된 전체 canonical row를 대상으로 한다.
- 운영 API 재수집 주기와 자동 cron은 `DATA-007`에서 별도로 결정한다.
- DB-001에서는 기존 SQLite 기반 API를 즉시 제거하지 않는다. runtime 전환은
  PostgreSQL 검증 후 수행하고, 검색 연결은 `SEARCH-001`이 담당한다.

## 3. Scope

포함:

- SQLAlchemy engine, session과 model 경계
- Alembic 설정, initial migration과 rollback 검증
- canonical SQLite read-only seed 명령
- 다음 7개 table 전체 이관
  - `data_sources`
  - `markets`
  - `store_metrics`
  - `sales_metrics`
  - `flow_metrics`
  - `store_points`
  - `permit_businesses`
- `store_metrics`의 100개 업종 코드 보존
- `sales_metrics`의 62개 업종 코드 보존
- row count, foreign key, 대표 query와 idempotency 검증
- secret, provenance path와 error message 안전성 검증
- 구현·검증 결과의 Task, Run Report와 GitHub Issue 반영

제외:

- 서울 전체 점포 상세를 새로 수집하는 작업
- 운영 수집 범위·시점·갱신 주기·raw 보존 기간 결정
- FE에서 100개 업종을 모두 노출하는 작업
- 검색 UI 또는 검색 ranking 구현
- PostGIS 도입과 반경별 공간 query
- 공개 배포 및 production traffic 전환
- 완전한 인증 시스템과 Supabase Auth 도입

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/development/architecture.md`
- `docs/development/environment.md`
- `docs/development/validation.md`
- `docs/data/data-source-mapping.md`
- `.harness/runs/2026-07-15-DB-001-supabase-migration.md`
- GitHub #11
- Jira LT-4

## 5. Expected Changes

### 5.1 Baseline and Invariants

구현 시작 전에 아래 기준을 다시 읽어 기록한다. 값이 다르면 계획을 그대로 실행하지
말고 canonical SQLite가 왜 바뀌었는지 먼저 확인한다.

| Table | Expected rows | Key |
| --- | ---: | --- |
| `data_sources` | 9 | `snapshot_id` |
| `markets` | 1,650 | `market_code` |
| `store_metrics` | 304,775 | `market_code, period, category_code` |
| `sales_metrics` | 21,427 | `market_code, period, category_code` |
| `flow_metrics` | 1,650 | `market_code, period` |
| `store_points` | 537,489 | `store_id` |
| `permit_businesses` | 40 | `dataset, management_no` |

추가 불변 조건:

- SQLite `PRAGMA foreign_key_check` 결과가 0건이다.
- `store_metrics.category_code` distinct count는 100이다.
- `sales_metrics.category_code` distinct count는 62다.
- 모든 업무 table의 `source_snapshot_id`가 `data_sources`에 존재한다.
- `raw_path`는 PostgreSQL에 사용자 PC 절대 경로로 저장하지 않는다.
- `source_url`에는 API key, query secret 또는 credential이 없어야 한다.
- seed는 source SQLite를 수정하지 않는다.

### 5.2 Planned File Impact

구현 단계에서 아래 파일만 우선 대상으로 삼는다. 실제 구조를 다시 확인한 뒤 꼭 필요한
경우에만 범위를 늘리고, unrelated refactor는 분리한다.

| Path | Planned responsibility |
| --- | --- |
| `product/apps/api/pyproject.toml` | SQLAlchemy, Alembic, Psycopg dependency |
| `product/apps/api/uv.lock` | dependency lock 갱신 |
| `product/.env.example` | 값 없는 server-only `DATABASE_URL` 예시 |
| `product/apps/api/src/localtwin_api/config.py` | secret-safe DB 설정과 필수값 검증 |
| `product/apps/api/src/localtwin_api/database.py` | engine와 session factory |
| `product/apps/api/src/localtwin_api/db_models.py` | 7개 canonical ORM model |
| `product/apps/api/alembic.ini` | Alembic project 설정 |
| `product/apps/api/alembic/env.py` | metadata와 runtime URL 연결 |
| `product/apps/api/alembic/versions/*_create_canonical_schema.py` | initial schema |
| `product/apps/api/src/localtwin_api/postgres_seed.py` | read-only SQLite -> PostgreSQL seed와 검증 |
| `product/apps/api/src/localtwin_api/repositories.py` | 후속 검색이 사용할 PostgreSQL 조회 경계 |
| `product/apps/api/tests/test_database.py` | config, migration과 repository test |
| `product/apps/api/tests/test_postgres_seed.py` | idempotency, count, rollback과 path test |
| `.harness/runs/<date>-DB-001-supabase-migration.md` | 실제 명령과 결과 |

`main.py`, market API와 React 변경은 DB-001 완료에 반드시 필요하지 않다. 실제 API의
runtime repository 전환은 DB 검증 결과를 확인한 뒤 `SEARCH-001`에서 진행한다.

### 5.3 Schema Mapping Rules

첫 migration은 canonical SQLite의 의미와 key를 손실 없이 보존하는 것이 우선이다.
데이터 의미를 동시에 재설계하지 않는다.

| SQLite concept | PostgreSQL plan |
| --- | --- |
| identifier, provider code, period | `TEXT` 또는 길이를 강제하지 않는 string |
| nullable count | nullable `INTEGER` |
| 좌표, 비율, 집계 metric | `DOUBLE PRECISION` 계열 |
| natural single key | 동일한 primary key 유지 |
| natural composite key | 동일한 composite primary key 유지 |
| `source_snapshot_id` | `data_sources.snapshot_id` foreign key 유지 |
| 원천 날짜 문자열 | 첫 이관에서는 lossless string 유지 후 별도 hardening 검토 |
| provenance raw path | repository-relative POSIX path로 정규화 |

initial migration에는 현재 조회에 필요한 key와 FK만 먼저 둔다. 검색 최적화 index,
PostGIS, enum, cascade 정책과 날짜 type 강제는 실제 query와 source 품질 근거가 생긴 뒤
후속 migration으로 추가한다.

### 5.4 Execution Plan and Gates

#### Step 0. Preflight and baseline capture

작업:

1. `git status --short`로 기존 사용자 변경과 DB-001 범위를 구분한다.
2. `product/data/processed/localtwin.db`의 존재와 read-only 접근을 확인한다.
3. 7개 table row count, distinct category count와 foreign key 오류를 기록한다.
4. `data_sources.raw_path`와 `source_url`에서 절대 경로·query secret을 점검한다.
5. Supabase project와 server-side connection URL 준비 여부를 확인하되 값을 출력하지 않는다.

Gate G0:

- 위 baseline이 Section 5와 일치한다.
- secret이 저장소나 명령 출력에 노출되지 않는다.
- 불일치가 있으면 구현을 멈추고 DATA-004 기준 변경 여부부터 확인한다.

#### Step 1. Dependency and configuration boundary

작업:

1. API package에 SQLAlchemy 2.x, Alembic과 Psycopg 3만 추가한다.
2. `DATABASE_URL`을 server-only 설정으로 읽고 log와 repr에서 값을 숨긴다.
3. 실제 제품 DB 작업에서는 값 누락과 SQLite URL을 조용히 허용하지 않는다.
4. `.env.example`에는 실제 host, password, project ref를 넣지 않는다.
5. browser용 `VITE_*` 환경변수에 DB URL이나 service role key를 만들지 않는다.
6. engine와 session 생명주기를 FastAPI와 분리된 작은 module에 둔다.

Gate G1:

- API import만으로 실제 DB 연결을 시도하지 않는다.
- 설정 누락은 secret을 포함하지 않는 명확한 오류가 된다.
- dependency lock과 설정 변경 외 unrelated diff가 없다.

#### Step 2. ORM model and initial Alembic migration

작업:

1. Section 7 규칙으로 7개 ORM model을 정의한다.
2. SQLite `SCHEMA`와 model의 column, nullability, PK, FK를 표로 대조한다.
3. Alembic metadata를 model registry에 연결한다.
4. 빈 DB에 7개 table을 생성하는 initial revision을 작성한다.
5. downgrade는 FK 역순으로 table을 제거하도록 한다.
6. autogenerate 결과를 그대로 신뢰하지 않고 migration diff를 수동 확인한다.

생성 순서:

```text
data_sources -> markets -> store_metrics / sales_metrics / flow_metrics
             -> store_points / permit_businesses
```

Gate G2:

- 빈 검증 DB에서 `upgrade head`가 성공한다.
- schema inspection 결과가 SQLite 기준의 PK, FK와 nullability에 맞는다.
- 검증용 빈 DB에서만 `downgrade base -> upgrade head`가 재현된다.
- 데이터가 있는 실제 Supabase DB에는 검증 목적으로 downgrade하지 않는다.

#### Step 3. Deterministic canonical seed

작업:

1. source SQLite는 read-only mode로 연다.
2. FK 의존 순서대로 chunk 단위로 읽고 한 transaction 안에서 적재한다.
3. 각 table의 canonical PK를 conflict target으로 사용한다.
4. 같은 snapshot과 row를 다시 실행해도 duplicate가 생기지 않게 upsert한다.
5. `raw_path`는 `data/raw/...` 형태의 repository-relative path로 바꾼다.
6. 안전하게 정규화할 수 없는 절대 경로와 credential이 포함된 URL은 seed 전에 거부한다.
7. 오류가 발생하면 transaction 전체를 rollback하고 부분 적재 상태를 남기지 않는다.
8. seed 종료 시 source/target count와 category count를 기계적으로 비교한다.

Gate G3:

- 첫 seed 후 7개 count가 Section 5와 정확히 일치한다.
- 같은 seed를 두 번째 실행한 뒤에도 count가 변하지 않는다.
- 두 업종 distinct count가 각각 100과 62다.
- 의도적으로 잘못된 provenance path를 넣은 test에서 전체 transaction이 rollback된다.

#### Step 4. Repository boundary and representative queries

작업:

1. SQLAlchemy query를 FastAPI endpoint와 분리된 repository에 둔다.
2. DB-001에서는 최소 조회만 구현하고 검색 ranking은 만들지 않는다.
3. 아래 query를 SQLite 기준 결과와 비교한다.
   - market code 1건 조회
   - market별 최신 store/sales/flow metric 조회
   - 현재 UI 4개 분석 분류에 해당하는 row 조회
   - UI 미지원 원본 업종 row 조회
   - source snapshot provenance join
4. 결과 ordering이 필요한 query에는 명시적 sort를 둔다.

Gate G4:

- 대표 query의 row count와 key 값이 SQLite와 같다.
- 미지원 업종도 DB에서 누락되지 않는다.
- repository 오류가 connection string, SQL parameter 또는 stack trace를 API 응답으로 내보내지 않는다.

#### Step 5. Automated tests

필수 test case:

- `DATABASE_URL` 누락과 잘못된 scheme 거부
- migration upgrade, downgrade, re-upgrade
- 7개 table schema와 composite PK 확인
- 작은 fixture seed 2회 실행의 idempotency
- FK 위반 시 rollback
- provenance path normalization과 unsafe path 거부
- source/target row count 불일치 감지
- category distinct count 불일치 감지
- repository 대표 query와 deterministic ordering
- 기존 API test 회귀

로컬 unit test에서 SQLite를 사용하더라도 PostgreSQL 검증을 대신했다고 기록하지 않는다.
SQL dialect와 실제 connection 차이는 Supabase Gate에서 별도로 확인한다.

Gate G5:

- focused DB test, 전체 API pytest, Ruff lint와 format check가 통과한다.
- `git diff --check`가 통과한다.
- 기존 canonical SQLite test와 market API test가 계속 통과한다.

#### Step 6. Supabase application

사전 조건:

- 사용자가 만든 Supabase project가 준비되어 있다.
- server-side PostgreSQL connection URL을 로컬 shell 또는 배포 secret에만 설정한다.
- 연결 방식은 실행 환경이 direct IPv6를 지원하면 direct connection을 우선하고,
  그렇지 않으면 migration에 적합한 session connection을 선택한다.
- migration에는 browser SDK key나 `service_role` JWT를 사용하지 않는다.

실행 순서:

1. 대상 project와 빈 schema 여부를 secret 없는 정보로 확인한다.
2. Alembic current/head를 확인한다.
3. `upgrade head`를 한 번 적용한다.
4. canonical seed를 실행한다.
5. 동일 seed를 한 번 더 실행한다.
6. G3와 G4 검증 query를 실제 Supabase PostgreSQL에서 실행한다.
7. migration version, count와 검증 시각만 Run Report에 기록한다.

Gate G6:

- 실제 Supabase에서 migration과 2회 seed가 성공한다.
- count, category와 대표 query가 canonical SQLite 기준과 일치한다.
- 연결 URL, password, project secret과 개인 절대 경로가 log·Git·Run Report에 없다.

실제 Supabase 연결이 없으면 `local implementation complete`까지만 기록한다.
G6 없이 DB-001을 Done으로 바꾸거나 GitHub Issue #11을 close하지 않는다.

#### Step 7. Documentation, Issue and handoff

작업:

1. `.harness/runs/<date>-DB-001-supabase-migration.md`에 실제 명령과 결과를 기록한다.
2. `docs/development/tasks.md`의 상태를 검증 결과에 맞게 갱신한다.
3. dependency가 실제 추가된 뒤에만 `docs/development/environment.md`를 installed로 바꾼다.
4. GitHub #11에 commit, Run Report, count와 남은 제한을 연결한다.
5. G6까지 통과한 뒤 DB-001을 Done/close하고 `SEARCH-001`을 Ready로 넘긴다.
6. Jira LT-4의 설명·완료 조건·상태를 동일한 사실로 맞춘다.

Gate G7:

- 코드, Task Packet, Run Report, GitHub #11과 Jira LT-4의 상태가 서로 모순되지 않는다.
- `SEARCH-001`이 사용할 DB URL, repository 경계와 대표 query가 문서로 인계된다.

### 5.5 Verification Commands

구현 시 repository의 실제 CLI와 Alembic 설정에 맞춰 확정한다. 아래는 계획된 최소 명령이다.

```powershell
uv run --directory product/apps/api alembic upgrade head
uv run --directory product/apps/api pytest -q tests/test_database.py tests/test_postgres_seed.py
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api ruff format --check .
git diff --check
```

명령 성공과 Task 완료를 구분한다. 특히 local unit test 통과는 실제 Supabase migration
성공을 의미하지 않는다.

### 5.6 Failure and Rollback Plan

| Failure | Action |
| --- | --- |
| baseline count 불일치 | seed 구현을 중단하고 DATA-004 변경 원인 확인 |
| migration 실패 | revision과 실제 DB version 확인, 빈 검증 DB에서 수정 후 재실행 |
| seed 중간 실패 | transaction rollback, 원인 수정 후 처음부터 재실행 |
| 두 번째 seed count 증가 | conflict key와 upsert 정책 수정, target을 재검증 |
| category 누락 | UI mapping이 아니라 source category 적재 조건부터 확인 |
| secret 노출 | 즉시 값 폐기·rotate하고 history/로그 노출 범위 점검 |
| Supabase 접속 불가 | local 완료로 과장하지 않고 G6 blocked 상태 기록 |
| API 회귀 | runtime 전환을 보류하고 기존 SQLite 경로 유지 |

production data가 있는 DB에서 destructive downgrade나 table drop을 자동 실행하지 않는다.
적용 후 수정은 새 forward migration을 기본으로 한다.

## 6. Acceptance Criteria

- [x] G0 baseline이 기록되어 있다.
- [x] SQLAlchemy, Alembic과 Psycopg dependency가 실제 API package에 추가되어 있다.
- [x] Alembic upgrade가 빈 DB와 실제 Supabase에서 성공한다.
- [x] 검증용 빈 DB에서 downgrade와 re-upgrade가 성공한다.
- [x] canonical data를 두 번 seed해도 중복되지 않는다.
- [x] 7개 canonical table의 전체 row count가 SQLite 기준과 일치한다.
- [x] `store_metrics` 100개, `sales_metrics` 62개 업종 코드가 보존된다.
- [x] 현재 4개 지원 분류와 그 밖의 원본 업종을 대표 query로 확인한다.
- [x] source provenance FK가 유지되고 개인 절대 경로가 target에 없다.
- [x] 실제 connection string, DB password와 service role key가 Git에 없다.
- [x] 전체 API regression과 DB focused test가 통과한다.
- [x] 선택적 Docker PostgreSQL을 제품 DB로 오해하지 않게 문서화되어 있다.
- [x] Run Report와 GitHub #11이 실제 검증 상태와 일치한다.
- [ ] Jira LT-4를 사용자가 같은 완료 상태로 수동 갱신한다.

### 6.1 Definition of Done Boundary

다음 세 상태를 구분한다.

| State | Meaning |
| --- | --- |
| `ready` | 이 문서처럼 구현 입력, 순서, gate와 완료 조건이 확정됨 |
| `local implementation complete` | 코드와 local test는 통과했지만 실제 Supabase G6는 미검증 |
| `verified / publication pending` | 실제 Supabase G6는 통과했지만 commit·push와 Jira 동기화가 남음 |
| `done` | 실제 Supabase G6와 문서·Issue G7까지 모두 통과 |

현재 구현·검증·GitHub 게시 상태는 `done`이다. Jira LT-4의 수동 상태 동기화 후 외부
tracker도 같은 상태가 된다.

## 7. Verification Plan

- focused DB tests, 전체 API pytest, Ruff와 `git diff --check`를 실행한다.
- PostgreSQL offline SQL 생성과 실제 canonical 2회 seed 결과를 Run Report와 비교한다.
- 실제 Supabase에서 G6의 migration, 2회 seed, count와 대표 query를 실행했다.
- local 성공과 실제 Supabase 성공을 별도 상태로 기록한다.

## 8. Documentation Updates

- [x] Task Packet과 Run Report에 local 구현 결과를 기록했다.
- [x] `docs/development/tasks.md`를 In Progress로 갱신했다.
- [x] `docs/development/environment.md`에 실제 설치 dependency를 반영했다.
- [x] GitHub #11을 실제 G6 검증 결과로 갱신했다.
- [ ] Jira LT-4를 사용자가 같은 상태로 수동 갱신한다.
- [x] 관련 commit을 `develop`에 push하고 GitHub #11을 Done으로 맞췄다.

## 9. Commit Plan

가능하면 검증 가능한 두 commit으로 분리한다.

```text
feat(db): add postgres schema and migrations
feat(db): seed and verify canonical data
```

각 구현 commit에서 GitHub #11을 `Refs #11`로 연결했고, push와 최종 검증 후 Issue를
`completed`로 직접 close했다.

## 10. Self-check

- [x] 현재 diff와 사용자 변경을 먼저 확인했다.
- [x] 범위 밖 refactor나 dependency를 추가하지 않았다.
- [x] canonical SQLite를 제품 DB로 계속 사용하는 구조를 새로 만들지 않았다.
- [x] 4개 UI Category만 seed하지 않았다.
- [x] 실제 secret과 개인 절대 경로를 출력·기록하지 않았다.
- [x] local 성공과 Supabase 성공을 구분했다.
- [x] 실패 시 부분 적재나 모순된 Done 상태를 남기지 않았다.
- [x] 다음 Task인 SEARCH-001에 필요한 경계만 인계했다.
