# Task Packet: PERF-002

## 1. Summary

```text
Task: 3D scene와 storefront lazy loading
Backlog ID: PERF-002
Type: web performance
Status: complete
Parent issue: GitHub #42
Issue: GitHub #55
```

## 2. Goal

기본 상권 지도와 검색을 열 때 3D scene·storefront 코드를 초기 실행 경로에서 분리한다.

## 3. Scope

포함: SceneWorkspace와 SelectedStorefrontLayer dynamic import, loading 상태, build chunk 확인.

제외: 핵심 첫 화면인 MapLibre 제거, Spark 자체 크기 축소, CDN 변경.

## 4. Related Documents

- `.harness/runs/2026-07-19-PERF-002-lazy-3d-boundary.md`
- GitHub #55

## 5. Expected Changes

```text
App: React.lazy and Suspense boundaries
build: separate scene and selected storefront chunks
test: async scene dialog and stable list expansion
```

## 6. Acceptance Criteria

- [x] SceneWorkspace는 사용자가 3D 장소를 열 때 load된다.
- [x] SelectedStorefrontLayer는 3D 지원 점포 선택 때 load된다.
- [x] 초기 main chunk가 Three·Spark 파일을 직접 포함하지 않는다.
- [x] MapLibre는 핵심 첫 화면이므로 초기 경로에 유지한다.
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
- [ ] GitHub #55 상태 동기화

## 9. Commit Plan

```text
perf(web): lazy load optional 3d features
```

## 10. Self-check

- [x] 지도·검색 기본 경로의 동작을 유지했는가?
- [x] loading 상태를 사용자에게 알리는가?
- [x] dependency를 새로 추가하지 않았는가?
