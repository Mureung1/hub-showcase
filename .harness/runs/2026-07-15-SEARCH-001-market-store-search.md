# Run Report: SEARCH-001 제한 검색 vertical slice

## 1. Outcome

연남·홍대·합정의 공식 polygon과 개별 점포를 연결하고, development Supabase를 조회하는
`GET /api/v1/search`를 React 검색창·지도 focus·분석 패널에 연결했다. 서울 전체 검색은
구현하지 않았으며 지원 상권 code 3개로 제한했다.

## 2. Data and schema

```text
Alembic revision: 20260716_0002
source CRS: EPSG:5181
runtime CRS: EPSG:4326
market_geometries: 3
store_market_links: 4,548
연남: 330
홍대: 3,111
합정: 1,107
bbox 후보: 9,035
polygon 미포함: 4,487
경계점: 0
foreign key orphan: 0
```

canonical SQLite와 development Supabase의 9개 table count가 일치한다.

```text
data_sources: 10
markets: 1,650
market_geometries: 3
store_metrics: 304,775
sales_metrics: 21,427
flow_metrics: 1,650
store_points: 537,489
store_market_links: 4,548
permit_businesses: 40
```

## 3. API and Front contract

- 이름·주소·업종으로 상권 또는 점포를 검색한다.
- 결과는 type, 안정적인 ID, 좌표, 주소, 업종, 소속 상권 ID를 반환한다.
- query는 1~80자, limit는 1~20으로 제한한다.
- `%`, `_`는 SQL wildcard가 아니라 일반 문자로 처리한다.
- DB 오류는 connection 정보 없이 일반화된 `503`을 반환한다.
- FE는 빈 입력, loading, 결과 없음, API 오류를 서로 다른 상태로 표시한다.
- 오류 시 mock이나 snapshot 검색 결과로 조용히 대체하지 않는다.
- 선택한 실제 점포 좌표를 지도 중심과 분석 반경에 반영하고 도로명 주소를 패널에 표시한다.

## 4. Verification

```text
API full pytest: 57 passed
API Ruff format/lint: 통과
Web Vitest: 6 files / 15 tests 통과
Web TypeScript typecheck: 통과
Web oxlint: 통과
Web production build: 통과
```

실제 development Supabase smoke:

```text
상권명 `연트럴파크`: market result
점포명 `17도씨`: store result, ID MA010120220800219123
주소 `동교로29길 38`: store result
업종 `카페`: store results
존재하지 않는 검색어: HTTP 200, results []
공백 query: HTTP 422
Scene API: HTTP 404, OpenAPI schema 제외
trusted localhost Origin: CORS header 허용
untrusted Origin: CORS header 없음
Supabase Alembic revision: 20260716_0002
Supabase 공간 FK orphan: 0
Supabase provenance 절대경로: 0
```

Playwright 실제 브라우저에서 `17도씨`를 검색·선택해 아래 반영을 확인했다.

```text
검색 결과: 17도씨 / 카페 / 연트럴파크(연남동주민센터)
주변 점포 목록: 17도씨 · 검색 결과
지도 선택 label: 17도씨
분석 패널: 카페 · 서울특별시 마포구 동교로29길 38
분석 데이터 안내: API 결과
```

console에는 기능 오류가 없었고 기존 `favicon.ico` 404 한 건만 남았다.

추가 검증:

```text
Task Packet: 37 packets 통과
Docs index/HTML/local links: 통과
Docs viewer URL normalization: 통과
Product/docs artifact boundary: 통과
git diff credential-like PostgreSQL URL: 0건
```

production build는 성공했으며 기존 Three.js·MapLibre·Spark chunk의 500kB 경고는 성능 후속
범위로 남긴다. 기능 실패나 build 실패는 아니다.

## 5. Failure and correction

첫 full seed에서 요청 chunk 5,000이 PostgreSQL 65,535 parameter 상한을 넘었다. importer가
table column 수에 따라 안전한 parameter budget으로 chunk를 자동 축소하도록 수정하고
regression test를 추가했다. timeout 뒤 남은 server transaction lock이 정리된 것을
`pg_stat_activity`에서 확인한 후, 공간 table만 증분 seed하고 전체 9개 table count를 다시
비교했다.

## 6. Remaining work

- DATA-009 B단계: 서울시 공식 상권·업종별 집계와 4,548개 개별 점포 계산값 비교
- ANALYSIS-002: 실제 점포 좌표를 이용한 100m·300m·500m query
- WEB-002/003: filter·URL 동기화와 전체 실제 점포 marker/layer
- EVAL-002: Front-API 통합 오류·회귀 범위 확대
- SEC-001 B단계와 SEC-002~008
- production Supabase와 공개 제품 배포는 DEPLOY-002에서 별도 수행
