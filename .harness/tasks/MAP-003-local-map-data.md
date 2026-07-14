# Task Packet: MAP-003

## 1. Summary

```text
Task: 실제 좌표 기반 LocalTwin 전용 지도
Backlog ID: MAP-003
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: done
```

## 2. Goal

외부 지도 그림을 꾸미는 수준을 벗어나, 대상 상권의 도로·건물·공원·지명·점포 좌표를 LocalTwin이 소유한 지도 data와 style로 직접 표현한다.

## 3. Scope

포함:

```text
연남·홍대·합정 OSM 원본을 정적 GeoJSON으로 만드는 재현 가능한 script
도로·건물·녹지·물·POI별 LocalTwin layer
실제 지도와 LocalTwin 지도 mode 전환
OSM attribution과 수집 시점 표시
실제 좌표 기반 low-poly 2.5D 건물
```

제외:

```text
전국 vector tile server
MapLibre 렌더링 엔진 자체 개발
모든 건물의 수작업 3D mesh
실시간 OSM 편집 반영
```

## 4. Related Documents

```text
docs/features/market-map-experience.md
docs/data/data-source-mapping.md
docs/development/architecture.md
```

## 5. Expected Changes

```text
script: OSM/Overpass를 상권별 GeoJSON으로 변환
web: 외부 basemap 없는 LocalTwin map style과 layer
data: 연남·홍대·합정 snapshot
docs: 지도 source, 구조, attribution과 제한
```

## 6. Acceptance Criteria

- [x] LocalTwin mode가 외부 basemap tile 없이 로컬 GeoJSON을 표시한다.
- [x] 실제 도로와 건물 footprint가 이동·확대·회전 가능한 좌표계에 표시된다.
- [x] 도로명, 대표 장소와 실제 점포가 표시된다.
- [x] 건물은 low-poly 색상과 높이로 extrusion된다.
- [x] 실제 지도 mode로 전환해 위치를 비교할 수 있다.
- [x] OSM attribution과 생성 시점이 화면과 data에 남는다.
- [x] 생성 script와 Front test가 통과한다.

## 7. Verification Plan

```powershell
python product/scripts/build_localtwin_map.py --check
pnpm --dir product/apps/web test
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
python scripts/check_docs_html.py
```

수동 확인:

```text
연남·홍대·합정 전환 시 해당 위치의 도로·건물이 바뀐다.
LocalTwin mode에서 외부 basemap request 없이 지도가 보인다.
desktop/mobile에서 지도 조작과 label 겹침을 확인한다.
```

## 8. Documentation Updates

- [x] 지도 데이터 생성 방식 기록
- [x] 기존 지도 스펙의 source of truth 갱신
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(map): render the LocalTwin-owned market map

why:
- use real coordinates without depending on an external basemap presentation

verify:
- python product/scripts/build_localtwin_map.py --check
- pnpm --dir product/apps/web test
- pnpm --dir product/apps/web build
```

## 10. Self-check

- [x] 외부 지도와 자체 지도라는 표현을 정확히 구분했는가?
- [x] 실제 좌표와 시각적 prefab을 혼동하지 않았는가?
- [x] 출처 표시를 숨기지 않았는가?
- [ ] 후속: GeoJSON 성능 한계가 확인되면 PMTiles로 전환한다.
