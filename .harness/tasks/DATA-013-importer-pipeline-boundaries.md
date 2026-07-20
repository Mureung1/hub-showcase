# Task Packet: DATA-013

## 1. Summary

```text
Task: importer·spatial pipeline 단계 분리와 manifest화
Backlog ID: DATA-013 / GitHub #69
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: in_progress
```

## 2. Goal

공공데이터와 공간 결합 importer를 읽기·검증·변환·저장·결과 보고 단계로 나누어, DB 없이 입력 계약을 검증하고 재실행 결과를 추적할 수 있게 한다.

## 3. Scope

포함: spatial link, canonical·bulk·KOSIS importer의 책임 분리와 snapshot/manifest 입력 명확화.

제외: 데이터셋 교체, 신규 공공데이터 수집, 제품 화면·API 계약 변경.

## 4. Related Documents

```text
docs/development/refactoring-standards.md
docs/data/data-source-mapping.md
GitHub #69
```

## 5. Expected Changes

```text
api: spatial_import.py, canonical_db.py, bulk_import.py, kosis_*.py
tests: DB-independent parser/validator tests and idempotency regression
```

## 6. Acceptance Criteria

- [ ] 같은 snapshot을 두 번 실행해 row count가 유지된다.
- [ ] parse·validate 단계가 DB 없이 테스트된다.
- [ ] 기간·dataset version·provenance가 manifest 또는 명시적 입력으로 남는다.
- [ ] importer의 DB 저장과 결과 보고가 입력 parsing과 분리된다.

## 7. Verification Plan

```powershell
uv run --project product/apps/api pytest product/apps/api/tests
uv run --project product/apps/api ruff check product/apps/api/src product/apps/api/tests
python scripts/check_code_structure.py
python scripts/check_task_packet.py
```

## 8. Documentation Updates

- [x] Task Packet 생성
- [ ] 각 importer 단계와 Issue 진행 상태를 기록한다.

## 9. Commit Plan

```text
refactor(data): split spatial import stages
refactor(data): isolate bulk and canonical import parsing
refactor(data): isolate KOSIS snapshot validation
```

## 10. Self-check

- [x] 기존 DB schema와 public API contract를 바꾸지 않는다.
- [ ] 각 importer의 DB-independent test와 전체 regression을 실행한다.
- [ ] TEST-001에서 배포 환경의 seed·smoke를 반복 검증한다.
