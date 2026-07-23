# Task Packet: MAP-007

## 1. Summary

```text
Task: 기본 건물과 LocalTwin 3D Overlay의 viewport 경계 중복 제거
Backlog ID: MAP-007
Jira: LT-15
Type: bug fix
Status: done
Depends on: MAP-005
```

## 2. Goal

기본 지도 중심이 지원 영역 밖으로 이동해도 화면 가장자리에 LocalTwin Overlay가 보이면,
기본 building extrusion과 전용 building extrusion이 동시에 그려지지 않게 한다.

## 3. Scope

포함:

- map viewport bounds와 준비된 Overlay 반경의 교차 판정
- LocalTwin 기본 경로의 기본 건물 visibility 수정
- 지도 중심 밖·viewport 안 Overlay 회귀 test

제외:

- `/en` 제출용 데모 변경
- 새로운 3D storefront asset
- Overlay GeoJSON 또는 지원 지역 추가

## 4. Related Documents

- `docs/features/market-map-experience.md`
- `docs/development/tasks.md`
- `.harness/tasks/MAP-005-base-map-supported-overlays.md`

## 5. Expected Changes

```text
supportedRegions: bounds와 Overlay 반경의 교차를 계산한다.
useMapViewport: map center 대신 viewport 교차 여부로 기본 건물 visibility를 결정한다.
MarketMapCanvas: load와 move end에서 현재 bounds를 전달한다.
workspace: 한국어 기본 경로에만 collision 방지 규칙을 적용한다.
```

## 6. Acceptance Criteria

- [x] map center가 지원 영역 밖이어도 viewport가 Overlay를 포함하면 기본 건물이 숨겨진다.
- [x] viewport가 지원 Overlay와 겹치지 않으면 기본 지도 건물이 계속 보인다.
- [x] `실제 지도` mode와 건물 표시 toggle의 기존 의미가 유지된다.
- [x] `/en` 데모는 기존 center-only visibility 규칙을 유지한다.
- [x] targeted regression test와 FE typecheck가 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test -- --run src/features/map/useMapViewport.test.tsx
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
```

브라우저에서는 연남 Overlay 가장자리가 보이면서 map center가 외부인 경우를 확인한다.

## 8. Documentation Updates

- [x] MAP-007 Task Packet 작성
- [x] 지도 계층 규칙 문서 갱신
- [x] 개발 백로그 상태 갱신
- [ ] Jira LT-15에 commit·Run Report를 수동으로 연결하고 완료 상태로 바꾼다.

## 9. Commit Plan

```text
fix(map): prevent base building overlap at overlay edges
```

## 10. Self-check

- [x] 기본 지도 자체를 숨기지 않았는가?
- [x] Overlay와 기본 건물을 동시에 표시하는 viewport를 막았는가?
- [x] `/en` 경로의 동작을 변경하지 않았는가?
- [x] 지도 이동 중 과도한 state update를 피했는가?
