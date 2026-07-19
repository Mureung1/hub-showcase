# Run Report: DATA-011 분석 기간 정책

## 1. 정책

- 기본값은 점포·매출·유동인구가 함께 적재된 최신 완결 분기다.
- 원천별 갱신 주기는 다르므로 행정동 인구·사업체 등 보조 근거의 날짜는 evidence에서 별도로 표시한다.
- 사용 가능한 분석 분기가 하나면 선택 UI는 보이되 비활성화하여 현재 제한을 설명한다.
- 데이터가 없는 분기는 0으로 대체하지 않고 unavailable로 처리한다.

## 2. 현재 검증

- 기간 API fixture: 20251 한 건, latest_complete_quarter 정책 확인
- Market analysis API tests: 6개 통과
- Ruff: 통과

Web 연결과 browser smoke는 다음 commit에서 기록한다.
