# Task Packet: WEB-006

## 1. Summary

```text
Task: keyboard, mobile, contrast 접근성 회귀
Backlog ID: WEB-006
Type: accessibility QA
Status: complete
Parent issue: GitHub #42
Issue: GitHub #59
```

## 2. Goal

검색·필터·지도·목록·분석 panel과 dialog의 핵심 흐름을 keyboard와 주요 viewport에서 사용할 수 있게 한다.

## 3. Scope

포함: focus 표시·복귀, Escape, semantic name, mobile/tablet/desktop, reduced motion, 200% zoom, key contrast.

제외: MapLibre canvas 내부의 모든 지도 feature를 screen reader용 목록으로 복제, 외부 style 자체 수정.

## 4. Related Documents

- `.harness/runs/2026-07-19-WEB-006-accessibility-regression.md`
- GitHub #59

## 5. Expected Changes

```text
dialogs: initial focus, Escape, return focus
css: reduced motion policy
tests: dialog keyboard flow and panel/list regression
browser: 390px, tablet, desktop, 200% zoom
```

## 6. Acceptance Criteria

- [x] native search·button·select를 keyboard로 조작할 수 있다.
- [x] dialog가 열릴 때 닫기 버튼으로 focus가 이동한다.
- [x] Escape로 닫으면 호출한 control로 focus가 복귀한다.
- [x] mobile panel 닫기 뒤 trigger로 focus가 복귀한다.
- [x] key text와 selected color가 WCAG AA 4.5:1 이상이다.
- [x] reduced motion, 390px, tablet, desktop, 200% zoom을 검증한다.
- [x] test, typecheck, lint, build가 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product --filter @localtwin/web test
pnpm --dir product --filter @localtwin/web typecheck
pnpm --dir product --filter @localtwin/web lint
pnpm --dir product --filter @localtwin/web build
```

## 8. Documentation Updates

- [x] Task Packet과 Run Report 작성
- [ ] GitHub #59 상태 동기화

## 9. Commit Plan

```text
fix(web): complete accessibility regression
```

## 10. Self-check

- [x] focus를 닫힌 panel이나 제거된 dialog에 남기지 않는가?
- [x] icon-only button에 accessible name이 있는가?
- [x] 사용자 motion 설정을 존중하는가?
