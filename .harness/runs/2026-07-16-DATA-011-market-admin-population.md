# Run Report: DATA-011 상권·행정동 인구 연결

## 결과

- 상태: Passed
- GitHub Issue: #40
- 환경: local React/FastAPI + development Supabase PostgreSQL
- Migration: `20260716_0007`
- raw snapshot: 로컬 ignored `seoul-market/20260716T083510Z`
- secret 값과 API query URL은 문서·log·DB provenance에 기록하지 않았다.

## 데이터 결과

| 지원 상권 | 상권 상주인구 | 상권 직장인구 | 연결 행정동 | 행정동 주민 | 행정동 종사자 |
| --- | ---: | ---: | --- | ---: | ---: |
| 연남 | 2,654 | 486 | 연남동 | 13,782 | 8,850 |
| 홍대 | 4,546 | 7,185 | 서교동 | 23,500 | 62,010 |
| 합정 | 5,348 | 4,035 | 합정동 | 15,629 | 13,968 |

- 상권 값: 서울시 상권분석서비스 `VwsmTrdarRepopQq`, `VwsmTrdarWrcPopltnQq`, 2025.1Q
- 행정동 값: KOSIS 주민등록인구 2025.12, 전국사업체조사 2024
- 상권과 행정동 경계가 다르므로 행정동 값을 상권에 배분하지 않고 배후통계로만 표시한다.

## 검증

```text
development Supabase market_population_metrics: 3 rows
같은 importer 2회 실행 후 row count: 3
상주·직장인구 성별 합 = 총인구: passed
전체·성별 6개 연령구간 합 = 총인구: passed
API pytest: 93 passed
API Ruff: passed
Web Vitest: 50 passed
Web TypeScript typecheck: passed
Web lint: passed
Web production build: passed
git diff --check: passed
```

오류 fixture에서는 provider 실패를 `0명`이나 빈 metric으로 바꾸지 않고 명시적인 오류 문구를 표시한다. 모든 source에는 period와 `과거 기준` 상태를 표시한다.

## 보안·운영 경계

- 서울 열린데이터광장 공식 endpoint가 HTTP를 사용하므로 key 전송 hardening은 `SEC-006`에서 계속 관리한다.
- 자동 수집 주기와 production DB 반영은 `DATA-007`, `DEPLOY-002` 범위다.
