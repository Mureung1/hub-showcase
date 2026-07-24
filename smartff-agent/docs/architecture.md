# Architecture

## Current (v1.0) — CSV 기반

```
Raw Excel Files
      │
      ▼  Python ETL (data/scripts)
Product Master
      │
      ▼
Master Dataset (data/master/merged_dataset.csv)
      │
      ▼  fs.readFileSync (CsvDataRepository)
FinancialService (집계: summary / category / month)
      │
      ▼
Express API (/api/financial/*)
      │
      ▼
React Frontend
```

`backend/src/repositories/DataRepository.ts` 인터페이스가 데이터 접근을 추상화하고,
`CsvDataRepository`가 현재의 CSV 로딩을 구현한다. `FinancialService`는 repository가
반환한 원본 레코드로 요약/집계만 담당하므로, repository 구현체만 교체하면
서비스·API 계층은 그대로 유지된다.

## Future (v2.0) — Postgres 기반

```
Raw Upload
      │
      ▼  Python ETL
Postgres (Supabase)
      │
      ▼  PostgresDataRepository (DataRepository 구현)
FinancialService (변경 없음)
      │
      ▼
Express API (변경 없음)
      │
      ▼
React Frontend
```

v2.0에서는 `CsvDataRepository`를 `PostgresDataRepository`로 교체하는 것이
핵심 변경이며, 날짜별 이력 조회·여러 매장 지원의 기반이 된다.
`FinancialService`와 API 계약은 이번 v1.0 범위에서 변경하지 않는다.
