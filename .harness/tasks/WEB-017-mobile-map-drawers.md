# Task Packet: WEB-017

## 1. Summary

```text
Task: 모바일 지도 중심 layout과 LNB·RNB drawer 전환
Backlog ID: WEB-017
Type: responsive UX
Status: complete
Parent issue: GitHub #42
Issue: GitHub #53
```

## 2. Goal

760px 이하 화면에서 지도를 먼저 보여주고, 분석 조건과 결과는 사용자가 요청할 때 독립적인
bottom drawer로 열어 지도 조작 영역과 읽기 흐름을 보존한다.

## 3. Scope

포함:

- mobile 초기 LNB·RNB 닫힘 상태
- 지도 toolbar의 조건·결과 열기
- LNB·RNB bottom drawer와 단일 내부 scroll
- 닫기 뒤 trigger focus 복귀
- mobile Header의 Docs 진입 유지

제외:

- swipe gesture
- native app navigation
- desktop panel 구조 변경

## 4. Related Documents

- `.harness/tasks/UX-002-panels-store-list-navigation.md`
- `.harness/runs/2026-07-19-WEB-017-mobile-map-drawers.md`
- GitHub #47, #48, #53, #59

## 5. Expected Changes

```text
app: compact viewport에서 panels closed 초기화
css: LNB·RNB bottom drawers, full map, mobile Docs control
tests: 390px 동등 media query의 map-first state
```

## 6. Acceptance Criteria

- [x] mobile 첫 화면에서 지도와 열기 버튼이 보인다.
- [x] LNB·RNB가 독립 drawer로 열린다.
- [x] drawer 닫기 뒤 열기 버튼으로 focus가 복귀한다.
- [x] mobile에서도 Docs 진입이 남는다.
- [x] FE test·typecheck·lint·build와 browser regression이 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product --filter @localtwin/web test
pnpm --dir product --filter @localtwin/web typecheck
pnpm --dir product --filter @localtwin/web lint
pnpm --dir product --filter @localtwin/web build
python scripts/check_task_packet.py --root . --require
```

## 8. Documentation Updates

- [x] WEB-017 Task Packet 작성
- [x] WEB-017 Run Report 작성
- [x] 390px browser 결과 기록
- [ ] GitHub #53 상태 동기화

## 9. Commit Plan

```text
feat(web): make mobile analysis map first
```

## 10. Self-check

- [x] mobile에서 패널이 지도를 처음부터 가리지 않는가?
- [x] 두 drawer 상태가 서로 독립적인가?
- [x] desktop 기본 상태를 유지하는가?
- [x] 사용자 소유 파일과 secret을 건드리지 않았는가?
