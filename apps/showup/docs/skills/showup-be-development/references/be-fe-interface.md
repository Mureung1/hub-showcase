# ShowUp BE ↔ FE 서비스 함수 인터페이스 요약

## 고객

`src/services/customers.ts`

| 함수 | 반환 | 설명 |
|------|------|------|
| `searchCustomers(storeId, keyword)` | `CustomerSearchResult[]` | 이름 prefix 또는 phoneLast4 검색 |
| `createCustomer(storeId, customerId, { name, phone })` | `CustomerSearchResult` | phoneLast4 자동 생성 |
| `getCustomer(storeId, customerId)` | `Customer \| null` | 원본 포함 |
| `updateCustomer(...)` | void | 이름/전화 변경 |
| `deleteCustomer(...)` | void | 삭제 |
| `getTopRiskyCustomers(storeId, limit)` | `CustomerSearchResult[]` | score 내림차순 Top N |

## 예약

`src/services/reservations.ts`

> 모든 조회 함수는 `{ id, ...Reservation }` 형태로 반환한다.

| 함수 | 반환/설명 |
|------|-----------|
| `listReservations(storeId, customerId?)` | `ReservationWithId[]` |
| `listTodayReservations(storeId, today?)` | `ReservationWithId[]` |
| `getReservation(storeId, resId)` | `ReservationWithId \| null` |
| `createReservation(storeId, resId, input)` | void |
| `transitionReservationStatus(storeId, resId, nextStatus, now?)` | void |
| `updateReservation(...)` | void |
| `deleteReservation(...)` | void |

## 사건

`src/services/incidents.ts`

| 함수 | 설명 |
|------|------|
| `listIncidents(storeId, customerId)` | occurredAt 내림차순 |
| `createIncident(...)` | 사건 생성 |
| `updateIncident(...)` | 수정 |
| `deleteIncident(...)` | 삭제 |

## 위험도 자동 갱신

`src/services/riskRefresh.ts`

예약/사건 변경 후 호출하면 customer 의 `riskStats`가 재계산된다.

- `createReservationAndRefresh(storeId, customerId, resId, input)`
- `transitionReservationStatusAndRefresh(storeId, customerId, resId, nextStatus, now?)`
- `createIncidentAndRefresh(storeId, customerId, incidentId, input)`
- `updateIncidentAndRefresh(...)`
- `deleteIncidentAndRefresh(...)`
- `refreshRiskStats(storeId, customerId)`

## 인증

`src/services/auth.ts`

- `signUp(input)` — 회원가입 + `stores/{uid}` 문서 생성
- `signIn(input)` — 로그인
- `signOutUser()` — 로그아웃
- `subscribeToAuth(callback)` — `onAuthStateChanged`

`storeId === user.uid`
