# WEB-012 Data Period Provenance Run Report

## 발견한 문제

근거 보기 상단의 `2025.1Q`와 오래된 점포 snapshot 문구만으로는 상권 분석, 행정동 통계와
개별 점포가 서로 다른 기간의 원천임을 알 수 없었다. 날짜 선택 기능처럼 보이는 UI도 실제로는
기간을 변경하지 않았다.

## 변경 결과

- 반경 점포 API가 실제 `data_sources`의 provider, dataset, source URL, period와 collected_at을 반환한다.
- 화면이 상권, 행정동, 개별 점포별 source·period·geography를 중복 없이 모아 보여준다.
- 원천의 갱신 주기가 달라 같은 날짜로 강제하지 않는다고 명시한다.
- 현재는 제공 가능한 snapshot 조합이며 사용자가 기간을 바꾸는 기능은 없다고 명시한다.
- raw 절대경로, DB 접속 정보와 credential은 응답하지 않는다.

## 검증

```text
API full test: 110 passed
API Ruff: passed
Web full test: 55 passed
TypeScript typecheck: passed
Oxlint: passed
Production build: passed
Local API: analysis 20251, background 20251/202512/2024, nearby 202603
Local browser: 2025년 1분기·2025년 12월·2024년·2026년 3월 표시
Local browser: source별 상권·행정동·개별 점포 공간 단위 표시
Local browser: 비정렬 안내와 기간 변경 미지원 안내 표시
```

기존 MapLibre large chunk warning은 이번 provenance 표시 변경과 별도 성능 작업이다. 공개 환경은
production DB 연결 및 수동 release 후 다시 검증한다.
