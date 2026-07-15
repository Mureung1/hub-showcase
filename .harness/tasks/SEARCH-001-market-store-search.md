# Task Packet: SEARCH-001

## 1. Summary

```text
Task: 제한된 상권·점포 검색 API와 React 연결
Backlog ID: SEARCH-001
Parent Epic: EPIC-03 / EPIC-04
Type: feature/security
Owner: N187_정현우
Status: done
```

## 2. Goal

시연 대상 데이터에서 검색 결과를 선택해 핵심 상권 분석 화면으로 진입하는 최소 vertical slice를 구현한다.

## 3. Scope

- 이름·주소·업종 query contract
- 검색 result identifier와 좌표
- React 검색 input, loading, empty, error
- 결과 선택과 기존 분석 state 연결
- 서울 전체 검색 제외

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/development/architecture.md`
- `docs/development/validation.md`
- `docs/issues/security-hardening-review.md`
- `docs/data/database-structure.md`
- `.harness/runs/2026-07-15-SEARCH-001-market-store-search.md`

## 5. Expected Changes

- 요청 범위의 code/config/test/document만 수정한다.
- 실제 secret, 사용자 촬영 원본과 로컬 절대 경로는 기록하지 않는다.

## 6. Acceptance Criteria

- [x] 빈 query와 결과 없음이 구분된다.
- [x] 제한된 fixture/seed에서 이름·주소·업종 검색이 재현된다.
- [x] 결과 선택이 실제 API 데이터로 분석 화면을 갱신한다.
- [x] API 실패 상태와 fallback 여부가 명확하다.
- [x] API test와 web test/build가 통과한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check .
pnpm --dir product/apps/web test
pnpm --dir product/apps/web build
```

명령 성공과 완료 조건 충족을 구분해 Run Report에 기록한다.

## 8. Documentation Updates

- [x] `docs/development/tasks.md` 상태를 실제 결과로 갱신한다.
- [x] 관련 데이터·기능 문서와 Run Report를 갱신한다.

## 9. Commit Plan

```text
feat(search): connect store search vertical slice
```

## 10. Self-check

- [x] 범위 밖의 refactor나 dependency를 추가하지 않았다.
- [x] 사용자 변경과 secret을 덮어쓰거나 노출하지 않았다.
- [x] 최소 의미 검증과 남은 한계를 기록했다.
- [x] 변경사항을 commit·push하고 GitHub Issue와 연결한다.
- [ ] 후속 `ANALYSIS-002`에서 실제 반경 query와 filter 전체 동기화를 완료한다.
