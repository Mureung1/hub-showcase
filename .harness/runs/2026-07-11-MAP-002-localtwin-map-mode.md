# Run Report: MAP-002 LocalTwin map mode

## Summary

```text
Task: MAP-002
Status: passed
Date: 2026-07-11
Commit: 1014b9f
```

## Scope

```text
OpenFreeMap의 실제 OSM 건물 footprint를 LocalTwin fill-extrusion으로 표시했다.
LocalTwin 전용 도로·공원·물 색상과 실제 지도 fallback을 추가했다.
건물 Layer와 후보 점포 prefab을 독립적으로 켜고 끌 수 있게 했다.
```

## Changed Artifacts

```text
apps/web/src/App.tsx
apps/web/src/App.test.tsx
apps/web/src/styles/global.css
docs/features/market-map-experience.md
.harness/tasks/MAP-002-localtwin-map-mode.md
```

## Verification

```powershell
pnpm --dir apps/web test
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web build
python scripts/check_docs_html.py
```

Result:

```text
자동 검사가 통과했다.
Playwright 1440x900에서 LocalTwin/실제 지도 왕복과 두 건물 표현을 확인했다.
Playwright 390x844에서 mode button과 지도 control이 viewport와 분석 panel 안에서 겹치지 않았다.
모바일 선택 점포 popup의 specificity 문제를 수정하고 display:none을 확인했다.
```

## Follow-up

```text
지도 renderer는 MapLibre를 사용한다.
실제 MapLibre bundle은 500kB를 넘어 build warning이 남아 있어 후속 code splitting 검토가 필요하다.
```
