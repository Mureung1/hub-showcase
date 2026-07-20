# API-002 상권 분석 runtime PostgreSQL 전환 Run Report

## 변경 결과

- `GET /api/v1/markets/{market_id}`가 배포 artifact에 없는 canonical SQLite 파일을 직접
  열지 않고, 검색·반경 API와 동일한 SQLAlchemy session을 사용한다.
- `MarketAnalysisRepository`가 `markets`, `store_metrics`, `sales_metrics`,
  `flow_metrics`, `data_sources`를 조회한다.
- canonical SQLite 분석 함수는 import 결과와 runtime 응답의 회귀 기준으로 유지한다.
- 기존 schema로 충분하므로 table과 Alembic migration은 추가하지 않았다.

## 검증

```text
targeted market analysis test: 6 passed
full API test: 104 passed
Ruff: passed
Task Packet: 45 passed
docs index, HTML and local links: passed
```

development Supabase 실제 smoke:

```text
endpoint: GET /api/v1/markets/3110562?category=카페&period=20251
status: HTTP 200
market_id: 3110562
period: 20251
ranking groups: 2
```

DB URL과 credential은 출력하거나 문서에 기록하지 않았다.

## 남은 배포 경계

- Render의 현재 release에는 이 변경이 아직 배포되지 않았다.
- 별도 production Supabase 생성·migration·seed 후 Render `DATABASE_URL`을 설정해야 한다.
- 수동 release가 결정될 때 API와 Web을 함께 재배포하고 실제 FE-BE smoke를 수행한다.
