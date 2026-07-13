# Task Packet: SEARCH-001

## 1. Summary

```text
Task: 제한된 상권·점포 검색 API와 React 연결
Backlog ID: SEARCH-001
Parent Epic: EPIC-03 / EPIC-04
Type: feature/security
Owner: N187_정현우
Status: ready
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

## 5. Expected Changes

- 요청 범위의 code/config/test/document만 수정한다.
- 실제 secret, 사용자 촬영 원본과 로컬 절대 경로는 기록하지 않는다.

## 6. Acceptance Criteria

- [ ] 빈 query와 결과 없음이 구분된다.
- [ ] 제한된 fixture/seed에서 이름·주소 검색이 재현된다.
- [ ] 결과 선택이 실제 API 데이터로 분석 화면을 갱신한다.
- [ ] API 실패 상태와 fallback 여부가 명확하다.
- [ ] API test와 web test/build가 통과한다.

## 7. Verification Plan

```powershell
uv run --directory apps/api pytest -q
uv run --directory apps/api ruff check .
pnpm --dir apps/web test
pnpm --dir apps/web build
```

명령 성공과 완료 조건 충족을 구분해 Run Report에 기록한다.

## 8. Documentation Updates

- [ ] `docs/development/tasks.md` 상태를 실제 결과로 갱신한다.
- [ ] 필요한 경우 관련 기능 문서와 Run Report를 갱신한다.

## 9. Commit Plan

```text
feat(search): connect store search vertical slice
```

## 10. Self-check

- [ ] 범위 밖의 refactor나 dependency를 추가하지 않았다.
- [ ] 사용자 변경과 secret을 덮어쓰거나 노출하지 않았다.
- [ ] 최소 의미 검증과 남은 한계를 기록했다.