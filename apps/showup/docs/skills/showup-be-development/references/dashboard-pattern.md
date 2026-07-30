# ShowUp 대시보드 집계 구현 패턴

## 적용 시점

- 체크리스트 8일차(또는 그 이상)에서 대시보드 집계 쿼리를 구현할 때
- `Dashboard.tsx`가 TODO 상태이거나 통계/카드/주의 고객/오늘 예약을 한 번에 받아야 할 때

## 구현 요약

1. **순수 함수는 `src/utils/dashboard.ts`**
   - 입력: `Reservation[]`, `today?: Date`
   - 출력: `{ today: DailyStats, month: { total, noShowCount, noShowRate } }`
   - 날짜 비교는 `YYYY-MM-DD` 문자열 직접 비교 (타임존 버그 회피)

2. **서비스 함수는 `src/services/dashboard.ts`**
   - `getDashboardData(storeId, today?)`
   - `Promise.all([listReservations(storeId), getTopRiskyCustomers(storeId, 5)])` 로 병렬 호출
   - 반환: `{ todayReservations, todayVisited, todayNoShow, thisMonthNoShowRate, attentionCustomers, todayReservationList }`

3. **FE 연동은 `Dashboard.tsx`에서 한 번의 호출로 처리**
   - `useEffect` 안에서 `getDashboardData(user.uid)`
   - loading 상태 처리
   - 카드 + 주의 고객 리스트 + 오늘 예약 리스트 모두 같은 데이터로 렌더링

## 비용 고려

- MVP에서는 `listReservations(storeId)`로 전체 예약을 읽은 뒤 클라이언트/서비스 레이어에서 집계
- 데이터량이 작은 가게 기준으로 읽기 비용이 미미
- 7/28 Cloud Functions 배포 후 서버 집계로 이전 가능

## 관련 파일

- `src/utils/dashboard.ts`
- `src/services/dashboard.ts`
- `src/pages/Dashboard.tsx`
- `src/services/customers.ts` (`getTopRiskyCustomers`)
- `src/services/reservations.ts` (`listReservations`, `Reservation`/`ReservationWithId`)
