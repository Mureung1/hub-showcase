# ShowUp BE Critical Fix 패턴 참고

> 6일차(2026-07-16) critical fix에서 확인된 구체적 버그/수정 패턴.

## 1. `getCustomer()` 마스킹 반환

### 문제
- `getCustomer()`가 `Customer` 타입(원본 `phone` 포함)을 반환하면, FE `Reservations.tsx`에서 `customer.phone.slice(-4)`로 원본 번호에 접근.
- Firestore rules는 필드 단위 읽기 차단을 지원하지 않으므로, 서비스 레이어에서 반드시 마스킹해야 함.

### 수정
- 반환 타입을 `CustomerSearchResult`로 변경.
- `enrichCustomer()`를 거쳐 `phoneMasked`만 반환.

```typescript
export async function getCustomer(
  storeId: string,
  customerId: string,
): Promise<CustomerSearchResult | null> {
  const snap = await getDoc(customerRef(storeId, customerId));
  if (!snap.exists()) return null;
  return enrichCustomer(snap.id, storeId, snap.data() as Customer);
}
```

### FE 연동
- `Reservations.tsx`에서 `customer.phone` 접근을 `customer.phoneMasked`로 교체.

## 2. `isSameDay()` 문자열 비교

### 문제
- `new Date(dateStr)`로 변환 후 `Date` 객체 비교 시 타임존/시간대 버그 발생.

### 수정
- `YYYY-MM-DD` 문자열로 직접 비교.

```typescript
function isSameDay(dateStr: string, at: Date): boolean {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return dateStr === todayStr;
}
```

## 3. `refreshCustomerRiskStats()` serverTimestamp

### 수정
- `updatedAt` 필드를 `serverTimestamp()`로 갱신.

```typescript
await updateDoc(customerRef(storeId, customerId), {
  riskStats: stats,
  updatedAt: serverTimestamp(),
});
```

## 4. `incidents.ts` `occurredAt` 캐스팅 제거

### 문제
- `input.occurredAt as unknown as Timestamp` 같은 캐스팅은 런타임에 실제 `Timestamp` 객체가 아니어서 Firestore 쓰기 실패.

### 수정
- `Timestamp.fromDate(date)` 사용.

```typescript
function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

const data: Incident = {
  type: input.type,
  memo: input.memo,
  occurredAt: dateToTimestamp(input.occurredAt),
  createdAt: serverTimestamp(),
};
```

## 5. `riskRefresh.ts` 제거

### 배경
- `firestore.rules`에서 `customers` update 시 `riskStats` 필드 직접 쓰기를 차단.
- 클라이언트 `updateDoc(customerRef, { riskStats: ... })`는 Permission denied.

### 결정
- Cloud Functions `onDocumentWritten` 트리거만 사용.
- `riskRefresh.ts` 및 클라이언트 갱신 래퍼 제거.

## 6. compiled `.js` 파일 정리

### 문제
- `tsc`나 다른 빌드로 생성된 `src/**/*.js` 파일이 남아 있으면 lint/typecheck 실패.

### 해결
- 작업 시작/커밋 전 정리.

```bash
find apps/showup/src -name '*.js' -delete
```

## 7. 예약 문서 ID 반환

### 문제
- `listReservations` 등이 `Reservation`만 반환하면 FE가 `res.customerId`를 임시 ID로 사용해 상태 변경에 실패.

### 수정
- `ReservationWithId` 인터페이스 추가, 모든 예약 조회 함수에 `id` 포함.

```typescript
export interface ReservationWithId extends Reservation {
  id: string;
}
```
