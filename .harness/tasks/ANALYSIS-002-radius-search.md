# Task Packet: ANALYSIS-002 / WEB-002 / WEB-003

## 1. Summary

```text
Task: 이동 가능한 분석 중심과 반경별 주변 점포 검색
Backlog ID: ANALYSIS-002 / WEB-002 / WEB-003
Parent Epic: EPIC-03 / EPIC-04
Type: feature
Owner: N187_정현우
Status: done
Target: W3-D1-B, MAP-005 직후
GitHub Issue: #26
Jira: LT-9 (Parent: LT-7)
```

## 2. Goal

연남·홍대·합정의 지원 영역 안에서 사용자가 분석 중심을 옮기고, 화면에 원을 계속
확인하면서 선택 반경 안의 실제 점포·동일 업종 경쟁 현황을 다시 조회할 수 있게 한다.

## 3. Scope

포함:

- 지원 영역 안에서 분석 중심 이동·확정·취소
- 반경 원을 유지한 지도 이동과 확정 시 주변 점포 조회
- 반경별 점포 수·동일 업종 수·거리·업종 구성
- URL·요청·지도·목록·패널의 filter state 동기화

제외:

- 서울 전체 임의 위치 검색
- 500m를 넘는 광역 분석
- 이동 중 연속 API 호출
- 매출·유동인구의 근거 없는 원형 반경 환산
- 점포별 성공 가능성 예측

선행 Task:

- `DATA-009` 공간 결합 품질 비교 승인
- `SEARCH-001` 검색·선택 vertical slice
- `MAP-005` basemap과 지원 지역 Overlay 분리

### Product Policy

### 반경 범위

| 선택값 | 의미 | 대표 용도 |
| ---: | --- | --- |
| `100m` | 바로 앞 골목·블록 | 초근접 경쟁 점포 |
| `300m` | 핵심 생활 상권 | 카페·편의점·음식점, 기본값 |
| `500m` | 도보 생활권 | 주변 상권 흐름과 경쟁 비교 |
| `1,000m` | 넓은 배후 상권 | 목적형 방문 업종과 확장 비교 |

- 최소 `100m`, 최대 `1,000m`, 기본 `300m`로 고정한다.
- 첫 구현은 `100 / 300 / 500 / 1,000m` segmented control을 사용한다.
- 임의 숫자 입력과 연속 slider는 첫 구현에서 제외한다. 필요성이 검증되면 `100m` 단위
  slider를 별도 개선으로 검토한다.

### 분석 중심 이동

1. 기본 지도 탐색에서는 지도를 움직여도 확정된 분석 중심이 바뀌지 않는다.
2. 사용자가 `분석 위치 이동`을 누르면 이동 mode로 진입한다.
3. 반경 원과 중심 표시는 화면에 계속 유지하고, 사용자가 지도를 움직여 후보 좌표를 정한다.
4. 이동 중에는 API를 호출하지 않는다.
5. `이 위치에서 검색`을 누를 때 후보 좌표를 확정하고 한 번만 조회한다.
6. `취소`하면 이전 중심·반경·결과로 돌아간다.
7. 검색 결과의 점포를 선택하면 그 점포 좌표가 새 분석 중심이 된다.

지원 영역은 연남·홍대·합정 polygon으로 제한한다. 중심점은 지원 polygon 안에 있어야 하지만,
원은 상권 경계를 넘을 수 있다. 경쟁 점포는 행정·상권 경계로 자르지 않고 실제 중심점과의
거리로 계산한다. 서울 전체에서 임의 중심을 선택하는 기능은 이 Task 범위가 아니다.

### API Contract

```http
GET /api/v1/stores/nearby
  ?latitude=37.563496
  &longitude=126.922788
  &radius=300
  &category=카페
```

입력 조건:

- `latitude`, `longitude`: 유한한 WGS84 좌표이며 지원 polygon 내부
- `radius`: `100`, `300`, `500` 중 하나
- `category`: canonical category 또는 생략
- 이동 중 자동 요청 금지, 위치 확정 시 요청

응답 최소 필드:

```json
{
  "center": { "latitude": 37.563496, "longitude": 126.922788 },
  "radius": 300,
  "total_count": 19,
  "same_category_count": 6,
  "stores": [
    {
      "id": "stable-store-id",
      "name": "점포명",
      "category_name": "카페",
      "distance_meters": 155,
      "latitude": 37.5658,
      "longitude": 126.9261
    }
  ],
  "aggregation_scope": "radius"
}
```

### Data and Calculation Boundary

- `store_points`의 좌표를 bounding-box로 먼저 줄이고 정확한 거리로 최종 판정한다.
- 경계점은 `distance <= radius`일 때 포함한다.
- 개별 점포 수·동일 업종 수·거리·업종 구성은 선택 반경 기준으로 계산한다.
- 서울시 상권 단위 매출·유동인구·개폐업 집계는 원형 반경 값으로 위장하지 않는다.
- 반경으로 재집계할 수 없는 값은 `aggregation_scope: market_boundary`와 source/period를
  유지하고 UI에 `서울시 상권 경계 기준`으로 표시한다.
- source row를 임의로 비례 배분하거나 상권 통계를 원의 면적 비율로 나누지 않는다.

## 4. Related Documents

- `docs/features/market-analysis.md`
- `docs/features/market-map-experience.md`
- `docs/data/database-structure.md`
- `docs/development/tasks.md`

## 5. Expected Changes

### API 파일과 책임

| 파일 | 책임 |
| --- | --- |
| `product/apps/api/src/localtwin_api/nearby_search.py` | Pydantic response, 지원 polygon 판정, bbox 후보 축소, Haversine 거리·집계 |
| `product/apps/api/src/localtwin_api/main.py` | `/api/v1/stores/nearby` query validation과 422/503 변환 |
| `product/apps/api/src/localtwin_api/db_models.py` | 좌표 index 선언만 추가하고 table 의미는 유지 |
| `product/apps/api/alembic/versions/20260716_0003_add_store_coordinate_index.py` | `longitude, latitude` 조회 index migration |
| `product/apps/api/alembic/versions/20260716_0004_add_store_reverse_coordinate_index.py` | 반경 bbox 조회를 보완하는 `latitude, longitude` index migration |
| `product/apps/api/tests/test_nearby_search.py` | 경계·거리·category·오류 fixture |

첫 구현은 PostGIS를 새 dependency로 추가하지 않는다. `market_geometries.geometry_geojson`을 Shapely `shape(...).covers(Point(...))`로 판정하고, `store_points`를 WGS84 bbox로 먼저 제한한 뒤 Python Haversine으로 `distance <= radius`를 최종 판정한다. 원은 지원 polygon 밖까지 나갈 수 있으므로 점포 후보를 `store_market_links`로 자르지 않는다.

응답에는 `market_id`, `returned_count`, `truncated`, 점포별 `source_snapshot_id`를 추가한다. 전체 집계는 모든 반경 내 후보로 계산하고 지도 marker만 안정적인 `(distance, store_id)` 순서로 최대 200개 반환한다.

### Web 파일과 책임

| 파일 | 책임 |
| --- | --- |
| `product/apps/web/src/features/analysis/types.ts` | committed/draft center와 nearby response type |
| `product/apps/web/src/features/analysis/nearbyApi.ts` | query 직렬화와 error normalization |
| `product/apps/web/src/features/analysis/useNearbyStores.ts` | AbortController, loading/empty/error/retry와 stale response 차단 |
| `product/apps/web/src/features/analysis/AnalysisLocationControls.tsx` | 이동 시작·확정·취소 keyboard UI |
| `product/apps/web/src/features/market/MarketFilters.tsx` | 100m·300m·500m 선택지와 확정 radius 전달 |
| `product/apps/web/src/App.tsx` | state 소유권 조립, Map `onMove`에서 draft center 갱신 |

state contract:

```ts
interface AnalysisLocationState {
  committedCenter: [number, number];
  draftCenter: [number, number] | null;
  moveMode: "idle" | "moving";
  radius: 100 | 300 | 500;
}
```

- 일반 pan은 `committedCenter`와 API 결과를 바꾸지 않는다.
- 이동 mode의 `onMove`는 `draftCenter`만 갱신하고 API를 호출하지 않는다.
- 확정 시에만 draft를 committed로 옮기고 URL을 `history.replaceState`로 갱신한 뒤 1회 요청한다.
- 취소는 draft를 비우고 기존 결과를 유지한다.
- 검색 점포 선택은 그 좌표를 committed center로 설정한다.
- URL key는 `market, category, radius, lat, lng, layer`로 고정하고 잘못된 값은 안전한 기본값으로 정규화한다.

## 6. Acceptance Criteria

- [x] `100 / 300 / 500 / 1,000m` 선택과 기본 `300m`가 동작한다.
- [x] 이동 mode에서도 반경 원과 중심을 계속 확인할 수 있다.
- [x] 지도 이동 중에는 API를 호출하지 않고 위치 확정 시 한 번만 호출한다.
- [x] 취소 시 이전 분석 중심·반경·결과가 복원된다.
- [x] 지원 영역 밖의 중심은 안전한 안내 상태로 처리된다.
- [x] 반경 경계 안·밖·정확히 경계에 있는 fixture 결과가 test와 일치한다.
- [x] 응답 점포의 안정 ID, 좌표, 업종, 거리와 source가 지도·목록에 반영된다.
- [x] URL, API request, 반경 원, marker, 목록과 우측 패널이 같은 상태를 사용한다.
- [x] 반경 집계와 서울시 상권 경계 집계가 화면과 응답에서 구분된다.
- [x] 빈 결과, validation 오류와 provider 오류가 서로 다른 상태로 표시된다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check src tests
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
```

브라우저 smoke:

```text
300m 기본 확인
이동 mode → 지도 이동 → 원 유지 → 이 위치에서 검색
100m/300m/500m 전환 시 marker와 수치 변경
취소 시 이전 결과 복원
지원 영역 밖 안내
검색 점포 선택 시 해당 좌표로 중심 이동
```

추가 test case:

```text
100/300/500m 각각 경계 안·밖·정확히 경계
지원 polygon 경계점 covers 판정
원은 상권 경계를 넘지만 거리 안 점포는 포함
null 좌표 점포 제외
동일 거리에서 store_id 순서 고정
200개 초과 시 total_count와 returned_count 구분
이동 중 fetch 0회, 확정 1회, 취소 0회
느린 이전 요청이 최신 결과를 덮어쓰지 않음
URL 새로고침 후 동일 center/radius/category 복원
```

## 8. Documentation Updates

- [x] 반경 최소·최대·기본값과 첫 선택지를 기능 문서에 기록한다.
- [x] 현재 스프린트와 후속 구현 경계를 백로그에 기록한다.
- [x] 지도 중심 이동과 반경·상권 집계의 의미 차이를 기록한다.
- [x] 구현 후 실제 API contract와 검증 결과를 Run Report에 기록한다.

## 9. Commit Plan

```text
feat(api): add bounded nearby store search
feat(web): sync movable radius analysis state
```

API contract·migration·test를 먼저 검증하고, 그 다음 Web state·UI·test를 연결한다. 두 단계 사이에 response contract를 바꾸지 않는다.

## 10. Self-check

- [x] 현재 스프린트 완료 범위와 후속 Task를 섞지 않았는가?
- [x] 지도 탐색과 분석 중심 이동을 구분했는가?
- [x] 선택 반경과 공식 상권 집계 단위를 구분했는가?
- [x] API 호출 폭주를 막는 확정 동작이 있는가?
- [x] 접근 가능한 button label과 취소 동작을 검증했는가?
- [ ] Jira LT-9에 commit과 Run Report 링크를 연결했는가?

## 11. Implementation Checkpoints

- API contract·migration·거리 집계: `9610e72`
- Web request·URL·이동 control 모듈: `ed9bd8d`
- App 지도·목록·패널 조립과 실제 브라우저 smoke: 이 Task의 최종 integration commit
