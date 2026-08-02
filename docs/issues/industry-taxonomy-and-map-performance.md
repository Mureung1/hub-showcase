# 전체 업종 taxonomy 및 지도 전환 성능 전환

## 목표

현재 published source snapshot에 존재하는 모든 유효 원천 업종 leaf를 사용자가 탐색, 검색, 필터, 지도, 점포 수에서 사용할 수 있게 한다. 매출·유동인구 같은 분석 지표는 업종별 근거에 따라 `FULL`, `PARTIAL`, `NONE`으로 구분한다.

`Top 7`은 분류 체계가 아니라 빠른 선택 preset으로만 유지한다.

## 확인한 기준 데이터

- `store_points`: 537,489개
- 원천 대·중·소분류 조합: 247개
- 연남·홍대·합정 연결 고유 점포: 4,548개
- 현재 문자열 classifier는 `요가/필라테스 학원`, `독서실/스터디 카페`, `의류/이불 수선업` 등에서 복수 후보를 만든다.

## 목표 구조

```text
raw large/middle/small taxonomy
  -> taxonomy version + taxonomy node
  -> store taxonomy assignment run
  -> publication pointer
  -> catalog / count / map / search / storefront capability

Top 7, 최근 선택, 즐겨찾기
  -> taxonomy leaf 집합을 참조하는 preset
```

원천 코드와 이름은 보존한다. 제품 기능은 문자열 포함 검사 대신 공개된 assignment의 leaf node를 공통 기준으로 사용한다.

## 운영 적재 계약

`store_points`는 공공 원천 코드와 명칭을 수정하지 않는다. 운영 적재는 Alembic migration을 먼저 적용하고 `python -m localtwin_api.postgres_seed`를 실행한다. seed가 canonical point 적재를 완료한 뒤 published assignment run을 생성한다.

브라우저는 `/api/v1/industry-taxonomy`의 published node만 탐색한다. 지도 요청은 선택 node ID를 `/api/v1/stores/nearby`에 전달하고, API는 published assignment를 SQL join하여 필터링한다. 따라서 선택한 업종을 위해 상권 전체 점포를 ORM으로 읽고 문자열 분류하지 않는다.

## capability와 3D fallback

모든 raw leaf는 지도·검색·점포 수 탐색 대상이다. 공식 분석 코드와 연결되는 leaf만 `FULL`이며, 나머지는 `PARTIAL`로 점포·경쟁 정보를 표시하고 근거 없는 매출·유동인구를 만들지 않는다. 3D storefront은 exact code → 상위 family → `generic-storefront` 순으로 선택하므로, 특화 prefab이 없는 업종도 선택 점포의 spotlight를 잃지 않는다.

## 집중 확인

- 연남·홍대·합정에서 `total_count`(상권 전체)와 `same_category_count`(선택 taxonomy) 의미를 분리해 확인한다.
- 홍대에서 카페 → 음식점 전환 시 이전 GeoJSON은 새 SQL 응답이 도착할 때까지 유지하고, 동일 요청 재선택은 메모리 cache로 재사용한다.
- 음식·소매·교육·스포츠/여가·서비스 각각의 leaf 한 개씩에서 map point와 selected-store storefront fallback을 확인한다.

## 지원 계약

| 기능 | 유효 원천 leaf |
| --- | --- |
| 탐색, 지도, 검색, 점포 수 | 모두 지원 |
| 분석 | `FULL`, `PARTIAL`, `NONE` |
| 3D storefront | leaf prefab -> middle prefab -> large prefab -> generic fallback |

`UNKNOWN_TAXONOMY`, `INVALID_RAW_TAXONOMY`만 데이터 품질 상태로 별도 표시한다. 유효한 업종을 `OUT_OF_SCOPE`로 조용히 제외하지 않는다.

## 성능 계약

업종 전환 API는 다음 순서를 보장한다.

```text
market link로 상권 점포를 먼저 축소
  -> assignment leaf 조건을 SQL에서 적용
  -> 지도 필수 projection만 반환
```

금지 경로:

```text
전체 StorePoint ORM 객체 생성
  -> Python 문자열 분류
  -> 전체 Haversine 계산
  -> 전체 정렬
  -> 선택 업종 반환
```

지도 응답은 정렬하지 않는다. 거리순 목록이 필요하면 상위 일부만 별도로 계산한다.

프런트는 새 요청 시작 때 이전 GeoJSON을 지우지 않는다. 이전 결과를 유지하고, 최신 요청만 반영하며, 이전 요청은 abort한다.

## 구현 순서

1. taxonomy/version/assignment/publication schema와 import materialization을 추가한다.
2. 247개 raw path와 모든 점포가 one-to-one assignment인지 검증한다.
3. Top 7을 taxonomy leaf preset으로 옮기고 기존 4개 공식 분석 범위와 비교한다.
4. catalog, count, nearby-map API를 published assignment SQL query로 전환한다.
5. 계층 업종 탐색 UX와 stale-while-revalidate 지도 전환을 적용한다.
6. 연남, 홍대, 합정에서 count와 지도 ID 집합을 비교하고, 홍대 대량 업종 전환을 계측한다.

## 단계적 확장

현재 4,548개 상권 연결 점포에서는 indexed SQL join + 최소 GeoJSON + MapLibre client cluster를 사용한다. bounds API, server-side cluster, vector tile은 상권 범위·응답 크기·`setData()` worker 시간이 실제 병목으로 확인될 때만 도입한다.
