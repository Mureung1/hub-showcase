# Task Packet: DB-001

## 1. Summary

```text
Task: Supabase PostgreSQL schema, migration과 canonical data 이관
Backlog ID: DB-001
Parent Epic: EPIC-02
Type: feature/security
Owner: N187_정현우
Status: ready
```

## 2. Goal

canonical SQLite의 검증된 전체 데이터를 Supabase PostgreSQL 제품 runtime으로 반복 가능하게 이관한다. 현재 UI가 지원하는 4개 분석 분류만 골라 seed하지 않는다.

## 3. Scope

- SQLAlchemy model과 repository 경계
- Alembic initial migration과 rollback
- canonical SQLite migrate/seed 명령
- `data_sources`, `markets`, `store_metrics`, `sales_metrics`, `flow_metrics`, `store_points`, `permit_businesses` 전체 이관
- `store_metrics`의 100개 업종 코드와 `sales_metrics`의 62개 업종 코드를 원본 분류로 보존
- row count·대표 query 비교
- DATABASE_URL server-only 설정

범위 밖:

- 서울 전체 점포 상세를 새로 수집하는 작업
- 운영 수집 요청 시점·갱신 주기·raw 보존 기간 결정 (`DATA-007`)
- FE에서 전체 업종을 즉시 노출하는 작업

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/development/architecture.md`
- `docs/development/validation.md`
- `docs/issues/security-hardening-review.md`

## 5. Expected Changes

- 요청 범위의 code/config/test/document만 수정한다.
- 실제 secret, 사용자 촬영 원본과 로컬 절대 경로는 기록하지 않는다.

## 6. Acceptance Criteria

- [ ] Alembic upgrade가 빈 DB에서 성공한다.
- [ ] canonical data를 두 번 seed해도 중복되지 않는다.
- [ ] 7개 canonical table의 전체 row count가 SQLite 기준과 일치한다.
- [ ] `store_metrics` 100개, `sales_metrics` 62개 업종 코드가 누락 없이 보존된다.
- [ ] 현재 4개 지원 분석 분류와 그 밖의 원본 업종을 대표 query로 각각 확인한다.
- [ ] 실제 connection string과 service role key가 Git에 없다.
- [ ] 선택적 Docker PostgreSQL을 제품 DB로 오해하지 않게 문서화한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api alembic upgrade head
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check .
git diff --check
```

명령 성공과 완료 조건 충족을 구분해 Run Report에 기록한다.

## 8. Documentation Updates

- [ ] `docs/development/tasks.md` 상태를 실제 결과로 갱신한다.
- [ ] 필요한 경우 관련 기능 문서와 Run Report를 갱신한다.

## 9. Commit Plan

```text
feat(db): migrate canonical data to postgres
```

## 10. Self-check

- [ ] 범위 밖의 refactor나 dependency를 추가하지 않았다.
- [ ] 사용자 변경과 secret을 덮어쓰거나 노출하지 않았다.
- [ ] 최소 의미 검증과 남은 한계를 기록했다.
