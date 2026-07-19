# Task Packet: MAP-008

## 1. Summary

```text
Task: 외부 지도 style의 누락 sprite fallback
Backlog ID: MAP-008
Type: map resilience
Status: complete
Parent issue: GitHub #42
Issue: GitHub #54
```

## 2. Goal

OpenFreeMap style에서 일부 POI sprite가 누락되어도 반복 경고와 빈 symbol이 생기지 않게 중립 표식을 등록한다.

## 3. Scope

포함: `styleimagemissing` 처리, 기존 sprite 보존, 중립 fallback test.

제외: OpenFreeMap 원본 sprite 수정, POI별 새 icon 디자인.

## 4. Related Documents

- `.harness/runs/2026-07-19-MAP-008-style-sprite-fallback.md`
- GitHub #54

## 5. Expected Changes

```text
baseMap: missing image fallback helper
App: map load event registration
test: add once and existing image preservation
```

## 6. Acceptance Criteria

- [x] 누락 ID마다 한 번만 fallback을 등록한다.
- [x] style이 가진 기존 image를 덮어쓰지 않는다.
- [x] fallback은 작은 중립 점으로 지도 의미를 과장하지 않는다.
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
- [ ] GitHub #54 상태 동기화

## 9. Commit Plan

```text
fix(map): register fallback for missing sprites
```

## 10. Self-check

- [x] 원본 style과 external dependency를 수정하지 않았는가?
- [x] 실제 POI처럼 오해할 새 의미를 만들지 않았는가?
- [x] secret이나 사용자 파일을 건드리지 않았는가?
