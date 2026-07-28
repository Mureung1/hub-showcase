# ShowUp Firestore 비용 점검

> 2026-07-21 (9일차) BE 세션 점검 문서

## 읽기 횟수 현황

| 화면/기능 | 읽기 호출 | 최적화 상태 | 비고 |
|-----------|----------|------------|------|
| 대시보드 | `listReservations()` 1회 + `getTopRiskyCustomers()` 1회 | ✅ 최소화 | 전체 예약을 한 번 읽고 클라이언트에서 집계 |
| 고객 검색 | `searchCustomers()` → name 쿼리 1회 + phoneLast4 쿼리 1회 | ✅ 병렬 | 중복 제거 후 반환 |
| 고객 상세 | `getCustomer()` 1회 + `listReservations()` 1회 + `listIncidents()` 1회 | ✅ 병렬 | Promise.all |
| 오늘 예약 | `listTodayReservations()` 1회 + `getCustomer()` N회 | ⚠️ N+1 | 고객 이름/마스킹을 위해 예약 개수만큼 추가 읽기 |
| 예약 생성 | `searchCustomers()` + `createReservation()` | ✅ 적정 | 중복 확인 필요 |

## 개선 제안

### 1. 예약 목록 N+1 제거 (선택)

현재 `Reservations.tsx`는 전체 예약을 받은 후 각 `customerId`로 `getCustomer()`를 호출한다. 같은 고객 예약이 여러 건이면 중복 읽기도 발생한다.

**개선안 A**: 오늘 예약 쿼리에 고객 이름/phoneLast4 를 denormalize 해 예약 문서에 포함.
- 장점: 읽기 1회로 충분
- 단점: 고객 정보 변경 시 예약 문서도 갱신 필요

**개선안 B**: Cloud Function 으로 오늘 예약 집계 API 제공.
- 장점: 클라이언트 읽기 최소화
- 단점: 7/28 배포 후 적용 가능

**MVP 결정**: 현재 N+1 상태를 유지. 제출 후 우선 최적화 대상.

### 2. 대시보드 실시간 갱신 (선택)

현재는 페이지 진입 시 한 번 읽는다.

**개선안**: `onSnapshot` 으로 오늘 예약/주의 고객 실시간 구독.
- 상태 변경 즉시 반영 (노쇼 버튼 클릭 후 대시보드 카드 업데이트)
- Firestore 읽기 비용은 동일, 연결 비용 추가

### 3. 인덱스 확인

필요 인덱스:
- `customers`: `phoneLast4` (단일), `name` (단일), `riskStats.score` (단일)
- `reservations`: `date` + `time`, `customerId` + `date`

`firestore.indexes.json` 에 모두 정의되어 있음.

## 권장

- Functions는 2026-07-28 기준 미배포. Blaze 전환 후 위험도 갱신 서버화를 먼저 하고, 집계 최적화는 별도 판단.
- 현재 MVP 단계에서는 위 상태로 충분.

## 관련 파일

- `src/services/dashboard.ts`
- `src/services/reservations.ts`
- `src/services/customers.ts`
- `firestore.indexes.json`
- `src/seeds/download.ts` (백업)
