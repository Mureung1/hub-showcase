# Task Packet: UX-002

## 1. Summary

```text
Task: 패널·점포 목록·행동 용어 정합성 개선
Backlog ID: UX-002
Type: frontend UX
Status: in_progress
Parent issue: GitHub #42
Issues: GitHub #46, #47, #48
```

## 2. Goal

분석 조건과 결과 패널을 선택 상태와 분리하고, 주변 점포 목록의 집계·표시 범위를 일치시키며,
버튼 이름이 실제 행동을 설명하도록 바꾼다.

## 3. Scope

포함:

- LNB·RNB 독립 닫기와 다시 열기
- 패널 닫기와 점포 선택 해제 분리
- 같은 업종 주변 점포 5개 요약과 전체보기
- Header의 동작하지 않는 avatar·기간 버튼 제거
- 비교·지도 위치 선택·분석 확정 용어 정리
- keyboard focus 복귀와 반응형 패널 유지

제외:

- 모바일 전용 drawer gesture
- 로그인·계정 기능
- API pagination
- 기간 선택 기능

## 4. Related Documents

- `docs/development/tasks.md`
- `.harness/runs/2026-07-19-UX-002-panels-store-list-navigation.md`
- GitHub #42, #46, #47, #48

## 5. Expected Changes

```text
app: panel visibility state와 지도 toolbar reopen action
filters: 닫기, 같은 업종 목록 count, 5개 요약과 전체보기
inspector: 패널 닫기와 점포 선택 해제 분리
header/map: 실제 동작과 일치하는 버튼 이름
tests: panel focus, selection preservation, wording regression
```

## 6. Acceptance Criteria

- [x] LNB와 RNB를 각각 닫고 다시 열 수 있다.
- [x] RNB를 닫아도 선택 점포가 유지된다.
- [x] 점포 선택 해제가 별도 버튼으로 제공된다.
- [x] 주변 점포 제목과 목록의 업종·개수 기준이 일치한다.
- [x] 기본 5개와 전체보기 상태를 구분한다.
- [x] 가짜 로그인 avatar와 동작하지 않는 기간 selector가 없다.
- [x] 비교·위치 선택·분석 확정 버튼 이름이 실제 행동과 일치한다.
- [x] FE test·typecheck·lint·build와 브라우저 회귀가 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product --filter @localtwin/web test
pnpm --dir product --filter @localtwin/web typecheck
pnpm --dir product --filter @localtwin/web lint
pnpm --dir product --filter @localtwin/web build
python scripts/check_task_packet.py --root . --require
git diff --check
```

## 8. Documentation Updates

- [x] UX-002 Task Packet 작성
- [x] UX-002 Run Report 작성
- [x] desktop browser에서 panel 닫기·재열기와 focus 복귀 검증
- [ ] GitHub #46·#47·#48 상태 동기화

## 9. Commit Plan

```text
feat(web): separate panels and clarify map actions
test(web): cover store list expansion
docs(web): record UX-002 verification
```

## 10. Self-check

- [x] 패널 visibility가 선택 state를 지우지 않는가?
- [x] 현재 표시 개수와 전체 개수를 사용자가 구분할 수 있는가?
- [x] 닫힌 패널을 keyboard로 다시 열 수 있는가?
- [x] 사용자 소유 파일과 secret을 건드리지 않았는가?
- [ ] 공개 배포 뒤 desktop·mobile에서 다시 확인했는가?
