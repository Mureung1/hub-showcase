# Run Report: ANALYSIS-002 이동 가능한 반경 분석

> 2026-07-19 정책 변경: 이 보고서의 1km 수치는 초기 성능 실험 기록으로만 보존한다. 현재 제품,
> URL contract와 API가 지원하는 반경은 100m·300m·500m이며 `radius=1000`은 기본 300m로
> 복구되고 API 직접 요청은 HTTP 422를 반환한다. 현재 기준은 DOCS-005 Run Report를 따른다.

## 결과

- 상태: Passed
- GitHub Issue: #26
- Jira: LT-9
- 대상 DB: development Supabase PostgreSQL
- Alembic head: `20260716_0004`

## 구현 결과

- `GET /api/v1/stores/nearby`가 지원 polygon 내부의 확정 중심을 검증한다.
- 당시 실험은 `100 / 300 / 500 / 1,000m` bbox 후보를 측정했다. 현재 제품 지원은 500m까지다.
- 원은 상권 경계를 넘을 수 있으며 결과를 `store_market_links`로 자르지 않는다.
- 카페·음식점·베이커리·편의점 제품 분류를 공식 세부 업종명과 매핑한다.
- FE가 committed center와 이동 중 draft center를 분리한다.
- 이동 중에는 조회하지 않고 `이 위치에서 검색` 확정 시 한 번만 조회한다.
- URL의 `market/category/radius/layer/lng/lat`와 지도·목록·패널을 동기화한다.
- 지원 영역 밖에서는 확정 버튼을 비활성화하고 기존 결과를 유지한다.

## 자동 검증

```text
API pytest: 63 passed
API Ruff: passed
Web Vitest: 25 passed
Web TypeScript typecheck: passed
Web lint: passed
Web production build: passed
```

## 실제 Supabase 조회

연남 공식 polygon 내부 중심 `126.922788, 37.563496` 기준:

| 반경 | 전체 점포 | 카페 | 반환 marker | 측정 시간 |
| ---: | ---: | ---: | ---: | ---: |
| 100m | 71 | 14 | 71 | 254ms |
| 300m | 1,151 | 111 | 200 | 114ms |
| 500m | 2,656 | 224 | 200 | 226ms |
| 1km | 8,320 | 545 | 200 | 1,666ms |

전체 집계는 반경 안의 모든 점포로 계산하며 marker payload만 거리·ID 순서의 최대 200개로 제한한다.
1km 조회는 두 복합 index 적용 전 약 4.1초에서 적용 후 약 1.7초로 줄었다. 공개 운영 전에는
PostGIS 또는 DB 거리 계산으로 추가 최적화를 검토한다.

## 브라우저 smoke

- 300m 실제 응답: HTTP 200, 주변 카페 111개
- 1km 변경: 당시 URL `radius=1000`, 주변 카페 545개, API HTTP 200 (현재는 제거됨)
- 이동 mode pan: URL과 API 요청 유지
- 위치 확정: URL 중심 변경, 새 nearby 요청 1회, HTTP 200
- 지원 영역 밖 pan: 안내 표시와 확정 버튼 disabled
- 취소: 이전 committed center URL과 결과 유지

## 알려진 비차단 항목

- OpenFreeMap sprite 누락과 MapLibre nullable numeric 경고는 MAP-005에서 기록한 외부 style 경고다.
- 1km marker 기록은 제거 전 성능 실험 근거로만 보존한다.
- provider 장애·stale request·새 환경 전체 smoke는 후속 EVAL-002 / GitHub #27에서 마감한다.
