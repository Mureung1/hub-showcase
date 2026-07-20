# Task Packet: DEPLOY-002

## 1. Summary

```text
Task: production Supabase 생성·migration·데이터 승격·Render 연결
Backlog ID: DEPLOY-002
Type: deployment
Status: complete
Depends on: DB-001, API-002, EVAL-002, SEC-008
```

## 2. Goal

development Supabase와 분리된 production project에 검증된 Alembic revision과 공식 데이터만
재현 가능하게 적용하고, Render API가 production credential만 사용하도록 연결한다.

## 3. Scope

포함:

- production 전용 URL과 Supabase project ref 이중 확인
- 기본 dry-run과 명시적 `--apply`
- Alembic `head` 적용
- canonical 9개 table idempotent seed
- KOSIS 인구·사업체와 서울시 상권 상주·직장인구 import
- row count와 import report 검증
- Render `DATABASE_URL` 설정 후 API·Web release smoke

제외:

- development DB를 production으로 재사용
- Dashboard에서 반복하는 수동 schema SQL
- production downgrade와 destructive reset
- secret을 CLI argument, log, 문서 또는 browser bundle에 기록

## 4. Related Documents

- `docs/operations/production-database-promotion.md`
- `docs/development/environment.md`
- `docs/development/architecture.md`
- `.harness/tasks/DB-001-supabase-migration.md`
- `.harness/tasks/EVAL-002-front-api-smoke.md`

## 5. Expected Changes

```text
api: production target·input validation과 promotion orchestration
script: dry-run/apply CLI
tests: target mismatch, non-PostgreSQL, missing input, execution order
operations: production 생성·승격·Render 연결 runbook
deployment: production project 생성 후 수동 release
```

## 6. Acceptance Criteria

- [x] `PRODUCTION_DATABASE_URL`만 읽고 개발용 `product/.env`를 자동 사용하지 않는다.
- [x] URL host 또는 username에 production project ref가 없으면 중단한다.
- [x] project ref 재입력이 일치하지 않으면 중단한다.
- [x] `--apply`가 없으면 DB에 연결하거나 변경하지 않는다.
- [x] canonical·KOSIS·서울시 snapshot 입력이 모두 존재해야 한다.
- [x] migration 뒤 네 종류 import가 고정된 순서로 실행된다.
- [x] 오류 메시지와 report에 DB URL·password가 포함되지 않는다.
- [x] `/health` liveness와 DB·canonical data를 확인하는 `/ready` readiness를 분리한다.
- [x] Render runtime은 IPv4용 Session pooler, migration은 direct 또는 Session pooler로 구분한다.
- [x] staging·production DB URL은 `sslmode=require`가 없으면 거부한다.
- [x] 승인된 네 입력 snapshot 경로로 production dry-run이 통과한다.
- [x] 별도 production Supabase project가 생성되어 있다.
- [x] 실제 production DB에서 migration과 전체 import가 검증된다.
- [x] Render secret 설정과 공개 FE-BE smoke가 통과한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest tests/test_production_promotion.py -q
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check .
python scripts/check_task_packet.py --root . --require
python scripts/check_docs_html.py
git diff --check
```

실제 production apply 전에는 `docs/operations/production-database-promotion.md`의 dry-run을
동일한 project ref와 snapshot으로 먼저 통과시킨다.

## 8. Documentation Updates

- [x] 운영 승격 runbook 작성
- [x] 백로그를 `In Progress`로 갱신
- [x] tooling dry-run Run Report 작성
- [x] 실제 production apply 결과와 공개 URL smoke 기록
- [ ] GitHub #23 상태 동기화

## 9. Commit Plan

```text
feat(deploy): guard production database promotion
docs(deploy): add production database promotion runbook
```

## 10. Self-check

- [x] development URL을 실수로 승격 대상으로 사용할 수 없는가?
- [x] secret을 process argument에 넣지 않는가?
- [x] dry-run이 기본이며 apply는 명시적인가?
- [x] Render health check가 실제 runtime DB 준비 상태를 확인하는가?
- [x] Web보다 API를 먼저 수동 배포하고 response contract를 확인하는가?
- [x] 실패 후 destructive rollback 대신 idempotent forward retry를 사용하는가?
- [x] 실제 production project와 Render 연결은 사용자 승인 뒤 수행했는가?
