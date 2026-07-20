# Run Report: MAP-004 florist vertical slice and selected boundary

## Scope

- canonical 꽃집 검색 결과를 MapLibre custom Three.js layer에 연결
- 선택 점포의 HTML prefab과 custom layer 중복 제거
- 지원 지역의 base building과 LocalTwin building 동시 extrusion 제거
- 선택 상권 canonical polygon을 노란 core·glow·halo 경계로 표시
- 주변 점포 전체가 큰 prefab으로 겹치던 표시를 핵심 1개 + 소형 POI 최대 24개로 제한
- desktop 지도 canvas가 점포 목록 높이까지 늘어나던 grid stretch 수정

## Data evidence

```text
store_id: MA010120220805312100
name: 플로리스트오재윤
category_code: G21901
category_name: 꽃집
market_id: 3110562
longitude: 126.923054545317
latitude: 37.5653774848447
source: development Supabase canonical search API
```

선택 상권 경계는 canonical SQLite `market_geometries`에서 생성한
`product/apps/web/public/data/market-boundaries.geojson`을 사용한다.

## Verification

```text
FE test: 13 files, 30 tests passed
TypeScript typecheck: passed
FE lint: passed
Production build: passed
Browser search: 플로리스트오재윤 → G21901 꽃집 result selected
Browser console: 0 errors
Boundary request: HTTP 200
Desktop canvas: 966 × 813 (before fix: 966 × 10987)
```

Playwright에서 연남 선택 경계, 일반 POI와 선택 꽃집 3D marker가 동시에 표시되고
이전처럼 여러 prefab이 한 지점에 쌓이지 않는 것을 확인했다. OpenFreeMap sprite의 기존
missing-image warning은 남아 있으며 이번 변경의 오류는 아니다.

## Remaining MAP-004 work

- 카페·음식점·베이커리·편의점 asset registry 확대
- GLB·texture manifest와 cache 검증
- mobile LOD와 WebGL 실패 fallback 검증
- 회전별 업종 표식 가독성 및 성능 baseline 기록
