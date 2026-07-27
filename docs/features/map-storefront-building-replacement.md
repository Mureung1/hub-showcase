# 기능 스펙: LocalTwin 업종 3D 건물 대체

## 목적

기본 지도 건물 위에 또 하나의 건물을 겹쳐 보이게 하지 않고, 검증된 점포만 업종별 3D 표현으로
바꾼다. 이 기능은 실제 건물 임차 정보를 완전히 복원하는 기능이 아니라, 지도 탐색을 돕는 제한된
시각화다.

## 현재 동작

1. 사용자가 업종을 선택한다.
2. 현재 지도에 그릴 수 있는 해당 업종 후보를 제한된 개수로 고른다.
3. LocalTwin Overlay GeoJSON에서 각 후보 좌표를 포함하는 건물 polygon을 찾는다.
4. 그 polygon 안에 알려진 점포가 정확히 한 개일 때만 기본 Overlay 건물을 숨긴다.
5. polygon 중심에서 가장 가까운 경계까지의 거리로 정사각형 부지를 제안하고, 네 모서리가 모두
   polygon 안에 남는지 검사한다. 통과하지 않으면 부지를 줄이고 끝까지 통과하지 못하면 대체하지 않는다.
6. 실제 Three.js model bounding box를 기준으로 업종 오브젝트의 가로·세로·높이를 변환한다.
7. 건물을 찾지 못했거나 한 건물에 점포가 여러 개면 원래 건물을 유지하고 marker로 남긴다.
8. Three.js custom layer가 MapLibre에 실제로 설치된 뒤에만 원래 Overlay 건물을 숨긴다. 설치에
   실패하면 원래 건물이 남는다.

기본 지도(MapLibre base building)는 지원 지역 밖에서 계속 보이고, LocalTwin의 개별 건물 대체는
연남·홍대·합정처럼 Overlay 데이터가 준비된 지역에만 적용한다. 화면별 candidate 상한을 유지하므로
모든 점포를 한 번에 Three.js로 바꾸지 않는다.

## 왜 한 점포 건물만 대체하는가

공개 점포 좌표는 건물 내부의 정확한 호실이나 입구 방향을 보장하지 않는다. 여러 점포가 같은
건물에 들어간 상황에서 건물 전체를 카페나 음식점 하나처럼 바꾸면 잘못된 정보가 된다. 그래서
현재는 `한 점포 건물만 대체`, `여러 점포 건물은 기본 건물 유지`를 안전 규칙으로 둔다.

다음 단계에서는 여러 점포 건물에 건물 전체를 바꾸지 않는 **지붕 장식** 또는 작은 업종 badge를
추가한다. 실제 도로 방향을 확정할 수 없으므로 정면 입구를 단정하는 facade보다, 어느 방향에서도
읽히는 상단 장식과 색상·문양을 우선한다.

## 관련 코드

- [storefrontBuildingPlacement.ts](../../product/apps/web/src/features/map/storefronts/storefrontBuildingPlacement.ts): 좌표와 건물 polygon 연결
- [useStorefrontBuildingPlacement.ts](../../product/apps/web/src/features/map/storefronts/useStorefrontBuildingPlacement.ts): Overlay 로드와 한 건물 점포 수 확인
- [LocalTwinRegionOverlay.tsx](../../product/apps/web/src/features/map/LocalTwinRegionOverlay.tsx): 대체 대상 기본 건물 숨김
- [createStorefrontMapLayer.ts](../../product/apps/web/src/features/map/storefronts/createStorefrontMapLayer.ts): Three.js bounding box를 실제 정사각형 부지·높이로 변환

## 검증

`storefrontBuildingPlacement.test.ts`는 좌표가 건물 polygon 안에 연결되는지, 계산한 정사각형의
네 모서리가 모두 원래 polygon 안에 남는지, 같은 건물에 두 점포가 있으면 대체 대상이 되지 않는
기준을 검사한다. `SelectedStorefrontLayer.test.tsx`는 custom layer가 준비되기 전에는 원래 건물을
숨기지 않는 준비 신호를 검사한다. 실제 지도에서는 선택 점포·한 점포 건물·여러 점포 건물·지원 지역
밖을 각각 눈으로 확인해야 한다.
