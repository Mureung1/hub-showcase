# Task Packet: MAP-006 분석 지도 정보구조

## 1. Summary

```text
Task: 분석 기준·주제·지도 Layer 정보구조 분리
Status: done
GitHub Issue: #38
```

## 2. Goal

분석 공간 기준, 확인할 주제, 지도 표현 Layer를 독립적으로 선택하게 한다.

## 3. Scope

- 상권·반경·행정동 분석 기준
- 개요·점포·경쟁·매출·유동·인구 주제
- 경계·점포 Layer state와 URL 동기화
- geometry 미확보 항목의 사유 있는 비활성 상태

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/features/market-map-experience.md`

## 5. Expected Changes

- Filter와 URL state를 기준·주제·Layer 책임으로 분리
- 선택 주제에 맞춘 inspector 구성

## 6. Acceptance Criteria

- [x] 분석 기준·주제·지도 Layer가 독립 state로 동작한다.
- [x] URL 새로고침 후 선택 상태가 복원된다.
- [x] 미지원 항목은 이유를 표시하고 비활성화한다.

## 7. Verification Plan

- FE state test·typecheck·lint·production build
- 실제 지도 선택과 새로고침 smoke

## 8. Documentation Updates

- [x] backlog와 후속 geometry 경계를 기록한다.

## 9. Commit Plan

```text
feat(map): separate analysis scope topic and layers
```

## 10. Self-check

- [x] 지도 표현과 분석 계산 기준을 혼동하지 않는가?
- [ ] 변경사항을 commit·push하고 GitHub Issue에 commit을 연결했는가?
