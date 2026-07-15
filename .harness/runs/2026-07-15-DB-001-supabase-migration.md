# Run Report: DB-001 Supabase migration

## Summary

```text
Date: 2026-07-15
Task: DB-001 / W2-D4
Result: local implementation complete
Remote Supabase G6: not run
```

SQLAlchemy 2.x, Alembic, Psycopg 3, canonical ORM schema, deterministic seed와
repository 경계를 구현했다. 실제 Supabase connection은 현재 환경에 없으므로 remote
migration 성공으로 표시하지 않는다.

## Baseline

canonical SQLite read-only 검사 결과:

| Table | Rows |
| --- | ---: |
| `data_sources` | 7 |
| `markets` | 1,650 |
| `store_metrics` | 76,383 |
| `sales_metrics` | 21,427 |
| `flow_metrics` | 1,650 |
| `store_points` | 20 |
| `permit_businesses` | 40 |

```text
store_metrics category codes: 100
sales_metrics category codes: 62
foreign key errors: 0
source URLs with query or credentials: 0
```

source의 7개 `raw_path`는 로컬 절대 경로였으며 seed 과정에서 `data/raw/...` 상대
경로로 정규화하도록 구현했다.

## Implemented

- server-only PostgreSQL `DATABASE_URL` 검증
- SQLAlchemy engine, session과 7개 canonical model
- Alembic initial upgrade/downgrade migration
- read-only SQLite -> PostgreSQL/SQLite dialect upsert seed
- 단일 transaction rollback, 2회 실행 idempotency와 count 검증
- unsafe provenance path와 query secret URL 차단
- 최소 PostgreSQL repository와 focused regression test

## Verification

### PostgreSQL migration SQL

```powershell
$env:DATABASE_URL='postgresql+psycopg://<user>:<password>@<host>/<database>'
uv run --directory product/apps/api alembic -c alembic.ini upgrade head --sql
```

fake local URL을 사용한 offline SQL 생성에서 PostgreSQL dialect와 7개 `CREATE TABLE`,
Alembic version insert가 확인됐다. 이는 실제 DB 접속 성공을 의미하지 않는다.

### Migration and focused tests

```powershell
uv run --directory product/apps/api pytest -q tests/test_database.py tests/test_postgres_seed.py
```

```text
9 passed
```

추가 provenance/config test를 포함한 최종 전체 suite 결과는 아래에 기록했다.

### Full canonical seed twice

Alembic schema가 적용된 임시 검증 DB에 실제 canonical SQLite를 두 번 seed했다.

```text
first:  7 / 1,650 / 76,383 / 21,427 / 1,650 / 20 / 40
second: 7 / 1,650 / 76,383 / 21,427 / 1,650 / 20 / 40
store categories: 100
sales categories: 62
```

대표 query 결과:

```text
current UI supported-category rows: 13,595
unsupported category sample: CS200001 일반교습학원, 1,346 rows
orphan source rows: 0
absolute target raw paths: 0
```

### Final API checks

```powershell
uv run --directory product/apps/api ruff format --check .
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api pytest -q
```

```text
24 files already formatted
All checks passed
43 passed
```

## Failed Attempt and Correction

첫 full-seed 검증 script는 `uv --directory`가 current working directory를 API root로
바꾸는 점을 반영하지 않아 Alembic script path 확인에서 중단됐다. target migration이나
seed는 실행되기 전이었고, API root 기준 경로로 수정한 뒤 위 결과를 얻었다.

## Remaining Gate

다음은 실제 Supabase connection이 준비된 뒤 수행한다.

1. server-only shell에 PostgreSQL `DATABASE_URL` 설정
2. 실제 Supabase에서 `alembic upgrade head`
3. canonical seed 2회 실행
4. row/category/provenance 대표 query 재검증
5. secret 없는 결과만 이 문서와 GitHub #11에 추가
6. 성공 후 DB-001 Done, GitHub #11 close와 SEARCH-001 인계

G6 전에는 DB-001을 Done으로 표시하지 않는다.

GitHub #11은 local 완료 결과와 G6 대기 상태로 갱신했으며 열린 상태를 유지했다.
Jira LT-4는 사용자가 직접 수정하는 운영 방식이므로 같은 상태로 수동 갱신해야 한다.

전체 `scripts/check.ps1`은 Task Packet·문서 검사를 통과한 뒤 DB-001과 무관한 기존
MAP/FE 작업 파일 3개의 Prettier 경고에서 중단됐다. DB/API 전용 Ruff와 43개 test는
통과했으며, unrelated 파일은 이 Task에서 자동 수정하지 않았다.
