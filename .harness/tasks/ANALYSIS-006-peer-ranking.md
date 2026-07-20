# Task Packet: ANALYSIS-006 동일 비교집단 순위

## 1. Summary

```text
Task: 동일 비교집단 기준 상권·동네별 순위
Status: done
GitHub Issue: #41
```

## 2. Goal

공간 단위와 기간을 섞지 않고 지표의 값·순위·분모·상위 비율·단위·기간·비교집단을 함께 설명한다.

## 3. Scope

- 상권: 점포·밀도·매출·개폐업·유동·주거·직장인구 총량과 밀도
- 비교집단: 같은 유형 상권, 현재 지원 상권
- 행정동: 현재 지원 행정동 배후통계
- 제외: 서로 다른 기간·공간 단위 혼합, 성공 가능성 순위

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-16-ANALYSIS-006-peer-ranking.md`

## 5. Expected Changes

- API ranking contract와 동률·최소 표본·근거 부족 처리
- FE 비교집단 전환과 순위 근거 표시

## 6. Acceptance Criteria

- [x] 값·단위·기간·비교집단과 `순위/분모`를 함께 반환한다.
- [x] 총량과 면적당 밀도를 구분한다.
- [x] 최소 표본 미달이나 공식 값 누락 시 순위를 만들지 않는다.
- [x] UI에서 비교집단을 전환하고 상위 비율을 확인할 수 있다.

## 7. Verification Plan

- API Ruff·전체 test
- FE typecheck·lint·전체 test·production build
- 3개 상권 × 4개 업종 실제 API smoke

## 8. Documentation Updates

- [x] Run Report와 backlog 상태를 갱신한다.

## 9. Commit Plan

```text
feat(analysis): add peer-group metric rankings
```

## 10. Self-check

- [x] 높은 원자료 값 순위가 성공 순위로 보이지 않게 설명했는가?
- [x] 상권과 행정동 비교집단을 섞지 않았는가?
- [ ] 변경사항을 commit·push하고 GitHub Issue에 commit을 연결했는가?
