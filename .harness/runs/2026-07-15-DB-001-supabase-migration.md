# Run Report: DB-001 Supabase migration

## Summary

```text
Date: 2026-07-15
Task: DB-001 / W2-D4
Result: complete; Jira manual sync pending
Remote Supabase G6: passed
```

SQLAlchemy 2.x, Alembic, Psycopg 3, canonical ORM schema, deterministic seed와
repository 경계를 구현했다. server-only `DATABASE_URL`로 실제 Supabase PostgreSQL에
접속해 migration과 전체 canonical seed 2회를 완료했다. secret은 명령 출력과 문서에
기록하지 않았다.

## Baseline

canonical SQLite read-only 검사 결과:

| Table | Rows |
| --- | ---: |
| `data_sources` | 9 |
| `markets` | 1,650 |
| `store_metrics` | 304,775 |
| `sales_metrics` | 21,427 |
| `flow_metrics` | 1,650 |
| `store_points` | 537,489 |
| `permit_businesses` | 40 |

```text
store_metrics category codes: 100
sales_metrics category codes: 62
foreign key errors: 0
source URLs with query or credentials: 0
```

source의 `raw_path`는 seed 과정에서 `data/raw/...` 상대
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

### Actual Supabase migration and full canonical seed twice

실제 Supabase PostgreSQL에 Alembic revision `20260715_0001`을 적용하고 canonical
SQLite를 두 번 seed했다.

```text
first:  9 / 1,650 / 304,775 / 21,427 / 1,650 / 537,489 / 40 (297.4s)
second: 9 / 1,650 / 304,775 / 21,427 / 1,650 / 537,489 / 40 (596.3s)
store categories: 100
sales categories: 62
```

대표 query 결과:

```text
unsupported category sample: CS200001, 5,357 rows
store/sales/flow source orphan rows: 0 / 0 / 0
store point/permit source orphan rows: 0 / 0
absolute target raw paths: 0
selected markets:
  3110562 연트럴파크(연남동주민센터)
  3120101 합정역
  3120103 홍대입구역(홍대)
```

상권명 부분 문자열만으로 `연남`, `홍대`, `합정`을 찾는 최초 확인은 0건이었다. 이는
데이터 누락이 아니라 현재 UI가 사용하는 stable market ID를 확인하지 않은 query 가정의
문제였다. 위 3개 ID를 기준으로 다시 조회해 모두 존재함을 확인했다.

### Final API checks

```powershell
uv run --directory product/apps/api ruff format --check .
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api pytest -q
```

```text
24 files already formatted
All checks passed
47 passed
```

## Failed Attempt and Correction

첫 full-seed 검증 script는 `uv --directory`가 current working directory를 API root로
바꾸는 점을 반영하지 않아 Alembic script path 확인에서 중단됐다. target migration이나
seed는 실행되기 전이었고, API root 기준 경로로 수정한 뒤 위 결과를 얻었다.

## Publication Result

G6 통과 후 DB-001 변경을 다음 commit으로 분리해 `develop`에 push했다.

```text
651c1b7 chore(config): centralize product environment settings
732c53a feat(data): import official bulk store snapshots
949fe84 feat(db): add postgres schema and migrations
e7588fb feat(db): seed and verify canonical data
fc2bad9 docs(db): record Supabase verification and environments
```

GitHub #11에는 위 commit과 검증 결과를 연결하고 `completed`로 close했다. Jira LT-4는
사용자가 직접 관리하는 원칙에 따라 동일한 완료 사실과 검증 수치로 수동 갱신해야 한다.
후속 `SEARCH-001`은 이 PostgreSQL repository 경계를 사용한다.

전체 `scripts/check.ps1`은 Task Packet·문서 검사를 통과한 뒤 DB-001과 무관한 기존
MAP/FE 작업 파일 3개의 Prettier 경고에서 중단됐다. DB/API 전용 Ruff와 47개 test는
통과했으며, unrelated 파일은 이 Task에서 자동 수정하지 않았다.
