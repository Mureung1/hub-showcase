# Run Report: UX-003 업종별 지표 안내

## 1. 결과

- 종합 분석의 상세 chart 앞에 업종별 우선 지표를 최대 3개 표시한다.
- 각 항목은 지표 이름, 뜻, 실제 판단에 쓰는 방법을 구분한다.
- `details/summary`로 추정매출·유동인구·순증의 한계를 설명한다.
- partial 업종은 점포·경쟁 범위만, unavailable 업종은 대체값 없음만 안내한다.

## 2. 검증

- Component tests: full 3개 지표, unavailable 대체 금지 확인
- FE tests: 21 files, 64 tests 통과
- TypeScript typecheck, lint, production build: 통과
- Task Packet 검사: 56개 통과
