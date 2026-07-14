# ShowUp BE ↔ FE 인터페이스 가이드

> 본 문서는 백엔드(BE) 세션이 작성하며, 프론트엔드(FE) 세션이 Firebase 서비스 함수를 사용할 때 참고한다.

## 인증

`src/services/auth.ts`

| 함수 | 사용처 | 반환/동작 |
|------|--------|----------|
| `signUp(input)` | 회원가입 페이지 | `User` 객체, 동시에 `stores/{uid}` 문서 생성 |
| `signIn(input)` | 로그인 페이지 | `User` 객체 |
| `signOutUser()` | 로그아웃 버튼 | 로그아웃 |
| `subscribeToAuth(cb)` | 인증 상태 감지 | `onAuthStateChanged` 구독 해제 함수 반환 |
| `getCurrentUser()` | 즉시 현재 사용자 조회 | `User \| null` |

`src/hooks/useAuth.ts`

| 훅/함수 | 용도 |
|--------|------|
| `useAuthState()` | `{ user, loading, error }` 반환 |
| `logout()` | 로그아웃 래퍼 |
| `getCurrentStoreId(user)` | `user.uid`를 `storeId`로 반환 |

> storeId === ownerUid === Firebase Auth uid

## 고객

`src/services/customers.ts`

| 함수 | 파라미터 | 반환 | 설명 |
|------|----------|------|------|
| `searchCustomers(storeId, keyword)` | storeId, 검색어 | `CustomerSearchResult[]` | 이름 prefix 또는 phoneLast4 검색, score 내림차순 |
| `createCustomer(storeId, customerId, { name, phone })` | storeId, 고객ID, 입력 | `CustomerSearchResult` | phoneLast4 자동 생성, riskStats 초기화 |
| `getCustomer(storeId, customerId)` | storeId, 고객ID | `Customer \| null` | 원본 포함 |
| `updateCustomer(...)` | storeId, customerId, Partial | void | 이름/전화 변경, phoneLast4 자동 갱신 |
| `deleteCustomer(...)` | storeId, customerId | void | 하위 예약/사건은 FE/BE에서 함께 처리 |
| `getTopRiskyCustomers(storeId, limit)` | storeId, 개수 | `CustomerSearchResult[]` | score 내림차순 Top N |

### CustomerSearchResult

```typescript
{
  id: string;
  storeId: string;
  name: string;
  phoneMasked: string;   // "010-****-1234"
  riskStats: RiskStats;
  riskLevel: 'low' | 'medium' | 'high';
  alert: boolean;       // noShow>=3 || abuse>=1
}
```

## 예약

`src/services/reservations.ts`

| 함수 | 설명 |
|------|------|
| `createReservation(storeId, resId, input)` | status=pending, cancelledSameDay=false |
| `listReservations(storeId, customerId?)` | 전체 또는 고객별 예약, date/time 내림차순 |
| `listTodayReservations(storeId, today?)` | 오늘 날짜 예약, time 오름차순 |
| `getReservation(storeId, resId)` | 단일 예약 조회 |
| `updateReservation(storeId, resId, input)` | 날짜/시간/메모 수정 |
| `transitionReservationStatus(storeId, resId, nextStatus, now?)` | `visited/noShow/cancelled` 등 상태 전환, 당일취소 자동 판별 |
| `deleteReservation(storeId, resId)` | 예약 삭제 |

## 사건

`src/services/incidents.ts`

| 함수 | 설명 |
|------|------|
| `createIncident(storeId, customerId, incidentId, input)` | type/memo/occurredAt |
| `listIncidents(storeId, customerId)` | occurredAt 내림차순 |
| `getIncident(...)` | 단일 조회 |
| `updateIncident(...)` | 수정 |
| `deleteIncident(...)` | 삭제 |

## 위험도 자동 갱신

`src/services/riskRefresh.ts`

예약/사건 변경 직후 호출하면 해당 customer 의 `riskStats` 를 재계산한다.

| 함수 | 사용처 |
|------|--------|
| `createReservationAndRefresh(storeId, customerId, resId, input)` | 예약 생성 후 |
| `transitionReservationStatusAndRefresh(...)` | 방문/노쇼/취소 버튼 클릭 후 |
| `createIncidentAndRefresh(...)` | 사건 기록 후 |
| `updateIncidentAndRefresh(...)` | 사건 수정 후 |
| `deleteIncidentAndRefresh(...)` | 사건 삭제 후 |
| `refreshRiskStats(storeId, customerId)` | 수동 전체 갱신 |

## 경고 배너

`src/utils/risk.ts`

```typescript
const payload = createRiskAlertPayload(customer.riskStats);
// payload: { show, noShowCount, abuseCount, disputeCount, lateCount, unreasonableCount, message }
```

FE 의 `RiskAlertBanner` 는 `noShowCount`, `incidentCounts` 객체를 받지만,
BE 의 `createRiskAlertPayload` 는 모든 count 를 flatten 해서 제공한다.
필요하면 FE 가 payload 를 `incidentCounts` 객체로 변환해 사용.

## 전화번호

`src/utils/phone.ts`

| 함수 | 설명 |
|------|------|
| `parsePhone(raw)` | `{ phone, phoneLast4, phoneMasked }` 반환 |
| `isValidPhone(raw)` | 국내 휴대폰 번호 검증 |
| `maskPhone(phone)` | "010-****-1234" 반환 |

## 시드 데이터

`src/seeds/seed.ts` — 데모 데이터 객체
`src/seeds/upload.ts` — Firestore 업로드 스크립트 (개발/데모용)

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
npm run seed:upload -w showup
```

## Firebase 설정

`apps/showup/.env` (git 제외):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=showup-project
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
