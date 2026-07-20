# WEB-010 Neutral Store Selection Run Report

## 재현 원인

- `selectedStore`가 첫 점포 이름으로 초기화됐다.
- 선택을 찾지 못하면 `market.stores[0]`으로 다시 fallback했다.
- radius API가 loading·error여도 정적 `market.stores`와 예시 동일 업종 수를 표시했다.
- URL sync가 첫 render부터 실행돼 사용자가 조작하지 않아도 기본 query string이 생성됐다.

## 변경 결과

- 점포 선택을 nullable explicit state로 변경했다.
- 첫 진입은 상권 분석 inspector만 표시하고 점포 marker·detail은 표시하지 않는다.
- radius 목록과 집계는 현재 API 응답만 사용한다.
- 반경·분석 기준·중심·상권·업종 변경 시 이전 점포 선택을 해제한다.
- query string 없는 첫 진입은 `/`를 유지하고 실제 조작 뒤에만 URL을 기록한다.

## 검증

```text
App regression: 8 passed
Web full test: 53 passed
TypeScript typecheck: passed
Oxlint: passed
Production build: passed
Local browser `/`: selected location 0, aggregate header 1, query string 없음
Local browser radius change: store 선택 1 -> 500m 변경 뒤 선택 0, URL radius=500
```

build의 기존 Spark·MapLibre large chunk warning은 남아 있으며 이번 state bug와는 별도 성능
작업으로 관리한다.
