# Task Packet: WEB-009 선택 업종 coverage

## 1. Summary

```text
Task: 선택 업종 coverage와 silent fallback 제거
Status: done
GitHub Issue: #39
```

## 2. Goal

검색한 세부 업종을 보존하고 공식 분석이 없는 업종을 카페 등 다른 업종으로 바꾸지 않는다.

## 3. Scope

- 원본 category name/code 보존
- `full`·`partial`·`unavailable` coverage
- 점포 근거와 상권 집계 근거의 분리
- API 오류와 근거 없음의 별도 상태

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/features/market-analysis.md`

## 5. Expected Changes

- category coverage 판정 모듈
- 지원 범위별 inspector·filter 문구와 테스트

## 6. Acceptance Criteria

- [x] 꽃집 같은 세부 업종을 카페 분석으로 바꾸지 않는다.
- [x] 가능한 점포·경쟁 근거만 표시한다.
- [x] 근거 없음과 API 실패를 정상 0값으로 숨기지 않는다.

## 7. Verification Plan

- category 판정 unit test
- FE 전체 test·typecheck·lint·production build

## 8. Documentation Updates

- [x] backlog 상태와 coverage 의미를 갱신한다.

## 9. Commit Plan

```text
fix(web): preserve selected category coverage
```

## 10. Self-check

- [x] 원본 업종 정보가 state 전환 중 유지되는가?
- [ ] 변경사항을 commit·push하고 GitHub Issue에 commit을 연결했는가?
