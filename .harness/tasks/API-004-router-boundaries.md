# Task Packet: API-004

## 1. Summary

```text
Task: FastAPI router·dependency·Scene gate 책임 분리
Backlog ID: API-004
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: done
```

## 2. Goal

`main.py`의 app factory에서 시스템 상태, 상권 조회, Scene route를 각각 독립 router로 분리하고 기존 API contract와 기본 Scene 차단을 유지한다.

## 3. Scope

포함: route factory, lazy DB session factory, CORS 조립, Scene API enable gate.

제외: 인증·인가 정책 변경, API URL·response 변경, Scene 처리 로직 변경.

## 4. Related Documents

```text
docs/development/refactoring-standards.md
docs/issues/security-hardening-review.md
GitHub #67
```

## 5. Expected Changes

```text
api: main.py, routers/system.py, routers/market.py, routers/scenes.py
tests: health, search, analysis, nearby, Scene hidden-route regression
```

## 6. Acceptance Criteria

- [x] `create_app`은 CORS, shared dependency, router 조립만 담당한다.
- [x] health·ready·market·search·nearby·admin-area URL과 response contract가 유지된다.
- [x] `SCENE_API_ENABLED=false`일 때 Scene route와 OpenAPI schema가 계속 숨겨진다.
- [x] API test, lint와 structure check가 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/api test
pnpm --dir product/apps/api run lint
python scripts/check_code_structure.py
```

## 8. Documentation Updates

- [x] Task Packet 생성
- [x] 검증 결과와 GitHub Issue 상태를 기록한다.

## 9. Commit Plan

```text
refactor(api): extract system market and scene routers
test(api): preserve app factory route contracts
```

## 10. Self-check

- [x] public API URL과 response schema를 변경하지 않는다.
- [x] 모든 API regression test를 실행한다.
- [ ] API-005에서 repository query·계산·response 조립 책임을 이어서 분리한다.

## 11. Result

- `main.py`는 CORS, lazy session factory와 router 조립만 담당하도록 줄였다.
- system, analysis, search, nearby, admin-area, scenes router를 기능 경계로 분리했다.
- 기본 Scene API 404 gate와 OpenAPI schema 비노출 계약을 기존 test로 보존했다.
- API test 114개, Ruff lint, code structure, Task Packet 검사를 통과했다.
