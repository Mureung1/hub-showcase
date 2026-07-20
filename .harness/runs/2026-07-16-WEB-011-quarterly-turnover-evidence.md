# WEB-011 Quarterly Turnover Evidence Run Report

## 발견한 문제

기존 `개·폐업 추이`의 12개 막대는 API 데이터가 아니라 고정 배열이었다. 축과 월 표기도 없어 실제
월별 변화처럼 보이지만 어떤 기간도 나타내지 못했다.

## 변경 결과

- 고정 배열과 가짜 positive·negative 위치를 제거했다.
- `analysis.raw.opening_count`, `closure_count`를 두 개의 이름 있는 막대로 표시한다.
- `analysis.period`를 `2025년 1분기` 형식으로 변환한다.
- 순증은 `opening_count - closure_count`로 계산한다.
- 월별 변화가 아니라 선택 분기 합계이며 시계열은 후속 제공임을 화면에 명시한다.

## 검증

```text
MarketInspector regression: 4 passed
Web full test: 54 passed
TypeScript typecheck: passed
Oxlint: passed
Production build: passed
Local browser: 현황 heading 1, 2025년 1분기 1, fake 추이 0, 범위 note 1, 실제 bars 1
```

기존 Spark·MapLibre large chunk warning은 이번 데이터 표현 수정과 별도 성능 작업이다.
