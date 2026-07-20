# Task Packet: MAP-005

## 1. Summary

```text
Task: 전체 기본 지도와 지원 지역 LocalTwin 3D Overlay 분리
Backlog ID: MAP-005
GitHub Issue: #36
Jira: LT-8 (Parent: LT-7)
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: done
Target: W3-D1-A, ANALYSIS-002보다 먼저
```

## 2. Goal

사용자는 지원 지역 밖까지 기본 지도를 자유롭게 이동할 수 있고, LocalTwin이 검증한 지역에서만 전용 도로·건물·POI와 향후 핵심 점포 3D 표현을 본다. 지도 mode 전환은 basemap 자체를 없애지 않고 LocalTwin Overlay의 표시 여부만 바꾼다.

## 3. Scope

포함:

- OpenFreeMap Liberty basemap을 모든 위치와 mode에서 유지
- basemap의 기본 건물 표현과 LocalTwin 전용 Overlay를 별도 Layer로 분리
- 연남·홍대·합정의 기존 GeoJSON snapshot 3개를 서로 다른 Source/Layer ID로 등록
- 지원 지역 registry와 `ready / planned` 상태 정의
- 지원 지역 밖에서도 pan·zoom·rotate와 기본 지도 표시 유지
- Overlay on/off, 기본 건물 on/off를 독립 state로 유지
- MAP-004 `features/map/storefronts/`와 충돌하지 않는 module boundary

제외:

- 관평동의 가짜 경계·좌표·GeoJSON 생성
- 새 OSM/Overpass 수집
- 반경 API와 filter state 구현
- MAP-004 3D 점포 asset 구현
- 서울 전체 LocalTwin 전용 3D 모델 생성

현재 확인된 입력:

| 지역 | 파일 | Feature | metadata 중심 | 반경 | Overlay 상태 |
| --- | --- | ---: | --- | ---: | --- |
| 연남 | `/map/yeonnam.geojson` | 5,331 | `126.9257, 37.5661` | 720m | ready |
| 홍대 | `/map/hongdae.geojson` | 7,033 | `126.9238, 37.5562` | 720m | ready |
| 합정 | `/map/hapjeong.geojson` | 6,026 | `126.9140, 37.5505` | 720m | ready |
| 관평동 | 없음 | - | 검증된 좌표·경계 없음 | - | planned |

세 snapshot의 공통 geometry는 `Point / LineString / Polygon`, 공통 property는 `building, category, class, height, layer, min_height, name, osm_id, palette`다. 지원 범위는 feature 전체 bbox가 아니라 snapshot metadata의 `center + radius_meters`를 사용한다. OSM의 긴 도로 geometry가 720m 밖까지 이어질 수 있으므로 전체 bbox를 지원 영역으로 쓰지 않는다.

## 4. Related Documents

- `docs/features/market-map-experience.md`
- `docs/development/tasks.md`
- `docs/development/architecture.md`
- `.harness/tasks/ANALYSIS-002-radius-search.md`
- `.harness/tasks/MAP-004-stylized-3d-storefronts.md`

## 5. Expected Changes

### 파일 단위 설계

| 파일 | 책임 | 변경 형태 |
| --- | --- | --- |
| `product/apps/web/src/features/map/supportedRegions.ts` | 지역 ID, 중심·반경, data URL, 상태와 capability의 단일 registry | 새 파일 |
| `product/apps/web/src/features/map/LocalTwinRegionOverlay.tsx` | 지역별 Source와 전용 Layer 묶음, 고유 ID 생성 | 새 파일 |
| `product/apps/web/src/features/map/SupportedRegionOverlays.tsx` | `ready` 지역만 순회하고 Overlay visibility 적용 | 새 파일 |
| `product/apps/web/src/features/map/baseMap.ts` | basemap URL과 기본 3D building Layer spec | 새 파일 |
| `product/apps/web/src/App.tsx` | 지도 조립과 toolbar state만 유지 | 최소 수정 |
| `product/apps/web/src/features/map/*.test.ts(x)` | registry·Layer ID·planned 제외·mode 회귀 | 새 test |
| `product/apps/web/src/App.test.tsx` | mode label과 기본 지도 유지 회귀 | 기존 test 수정 |
| `product/scripts/build_localtwin_map.py` | metadata의 720m 원에서 벗어나는 긴 OSM geometry clip | 최소 수정 |
| `product/apps/web/public/map/*.geojson` | clip 규칙으로 세 snapshot 재생성 | 생성 결과 |

`features/map/storefronts/`는 MAP-004 작업 영역이므로 MAP-005에서 수정하지 않는다.

### Type과 registry contract

```ts
type SupportedRegionId = "yeonnam" | "hongdae" | "hapjeong" | "gwanpyeong";
type OverlayAvailability = "ready" | "planned";
type RegionCapability = "market-analysis" | "localtwin-overlay" | "scene";

interface SupportedRegion {
  id: SupportedRegionId;
  label: string;
  center?: [number, number];
  overlayRadiusMeters?: number;
  overlayDataUrl?: string;
  availability: OverlayAvailability;
  capabilities: RegionCapability[];
}
```

불변 조건:

- `ready + localtwin-overlay` 지역만 `center`, `overlayRadiusMeters`, `overlayDataUrl`을 가져야 한다.
- `planned` 관평동에는 검증 전까지 임의 좌표를 넣지 않는다.
- `market-analysis`와 `scene` 지원 여부를 같은 의미로 취급하지 않는다.
- Layer/Source ID는 `${region.id}-localtwin-*` 형식으로 고유해야 한다.

### Map 조립 순서

```text
OpenFreeMap Liberty basemap (항상)
→ 기본 building extrusion (baseBuildingsVisible)
→ LocalTwin 지역 Overlay 3개 (mapMode=localtwin)
→ 분석 반경·중심
→ 실제 점포 marker·선택 상태
→ MAP-004 핵심 점포 custom 3D layer (후속)
```

`localTwinMapStyle`과 선택 상권 하나만 읽는 `marketMapSlug` 분기는 제거한다. `mapMode`는 당장 기존 이름을 유지하되 의미를 다음처럼 바꾼다.

```text
localtwin: basemap + 기본 건물 + 지원 지역 LocalTwin Overlay
original: basemap + 기본 건물, LocalTwin Overlay 없음
```

기본 건물과 전용 건물이 겹치는 지역에서는 전용 extrusion을 뒤에 그린다. 표면 떨림이 확인되면 전용 높이에 작은 시각 offset을 임의로 더하지 않고, 기본 building Layer의 지원 영역 제외 filter가 MapLibre 5에서 실제 동작하는지 별도 fixture로 검증한 뒤 적용한다.

### Loading 전략

첫 vertical slice에서는 검증된 세 파일의 합계가 약 18,390 feature이므로 세 Overlay를 한 번에 등록한다. 변경 전후 load와 interaction을 같은 viewport에서 기록한다. 실제 병목이 확인될 때만 viewport/bbox 기반 lazy mount를 후속 최적화로 분리한다.

현재 snapshot은 bbox로 조회한 OSM way의 전체 geometry를 포함할 수 있다. renderer에서 bbox를 지원 범위로 오인하지 않도록 builder가 WGS84 geometry를 `EPSG:5179`로 변환하고 중심점의 720m buffer로 Point·LineString·Polygon을 clip한 뒤 WGS84로 되돌린다. clip 결과가 비어 있는 feature는 제거한다. 이 단계는 API runtime query와 무관하며 기존 API dependency인 Shapely와 PyProj를 재사용한다.

## 6. Acceptance Criteria

- [x] 연남·홍대·합정과 지원 영역 밖으로 지도를 이동해도 basemap이 사라지지 않는다.
- [x] `LocalTwin` mode는 basemap 위에 세 지역 Overlay를 표시한다.
- [x] `실제 지도` mode는 basemap을 유지하고 LocalTwin Overlay만 숨긴다.
- [x] 선택 상권을 바꿔도 다른 두 지원 지역 Source가 제거되지 않는다.
- [x] 긴 도로·Polygon이 metadata 720m 지원 영역 밖에 LocalTwin style로 이어지지 않는다.
- [x] Source/Layer ID가 지역별로 고유하고 MapLibre duplicate ID 오류가 없다.
- [x] 기본 건물 표시 toggle과 LocalTwin Overlay mode가 서로 독립적으로 동작한다.
- [x] 관평동은 `planned`로 표현되며 검증되지 않은 지도 좌표나 Overlay가 노출되지 않는다.
- [x] 분석 원·중심·점포 marker와 검색 선택 동작이 유지된다.
- [x] MAP-004의 `features/map/storefronts/` 파일을 수정하지 않는다.
- [x] FE test·typecheck·lint·production build가 통과한다.
- [x] 지원 지역 내부·외부 desktop/browser smoke 결과를 Run Report에 기록한다.

## 7. Verification Plan

자동 검증:

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
uv run --project product/apps/api python product/scripts/build_localtwin_map.py --check
python scripts/check_task_packet.py --root . --require
python scripts/check_docs_html.py
git diff --check
```

test case:

```text
registry에서 ready Overlay는 URL·중심·반경을 모두 가짐
snapshot metadata 중심·반경과 registry 값 일치
clip 후 모든 geometry가 승인된 support geometry 내부에 있음
planned 관평동은 renderer 입력에서 제외됨
세 지역 Source/Layer ID가 모두 고유함
original mode에서도 basemap URL이 동일함
LocalTwin mode toggle은 Overlay visibility만 바꿈
기본 건물 toggle은 Overlay mode를 바꾸지 않음
```

브라우저 smoke:

```text
연남 → 홍대 → 합정 이동 시 전용 Overlay 연속 확인
서울의 지원 영역 밖으로 pan 후 기본 도로·건물 확인
LocalTwin ↔ 실제 지도 전환 때 camera와 basemap 유지 확인
건물 toggle, 검색 결과 선택, 분석 원 회귀 확인
개발자 console의 duplicate layer/source·404·WebGL 오류 확인
```

## 8. Documentation Updates

- [x] `docs/features/market-map-experience.md`의 basemap·Overlay 계층과 관평동 상태 갱신
- [x] `docs/development/tasks.md`에 MAP-005와 실행 순서 반영
- [x] `.harness/runs/<date>-MAP-005-base-map-supported-overlays.md` 작성
- [x] GitHub #36에 commit·Run Report를 연결하고 완료 처리
- [ ] Jira LT-8에 commit·Run Report를 연결하고 완료 상태로 변경

## 9. Commit Plan

```text
refactor(map): keep the base map under supported overlays

scope:
- region registry and overlay components
- App map composition only
- registry and map mode regression tests
```

MAP-005 한 commit을 기본으로 하되 browser 회귀 수정이 커지면 `registry/layer extraction`과 `App integration/test` 두 commit으로 나눈다. MAP-004 미커밋 prototype은 포함하지 않는다.

## 10. Self-check

- [x] basemap과 LocalTwin Overlay를 다시 같은 style object로 합치지 않았는가?
- [x] 지원 범위를 현재 선택된 상권 하나와 혼동하지 않았는가?
- [x] 관평동에 근거 없는 좌표·경계·asset을 만들지 않았는가?
- [x] 모든 서울 건물에 LocalTwin custom asset을 적용하지 않았는가?
- [x] MAP-004의 사용자 변경을 덮어쓰거나 commit에 섞지 않았는가?
- [x] 기능 성공과 단순 build 성공을 구분해 검증했는가?
