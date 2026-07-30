# 시드 데이터 무결성 및 데모 날짜 갱신 패턴

> 2026-07-27 ShowUp 13일차 BE 세션에서 얻은 실전 패턴.

## 1. upload.ts 하드코딩 인덱스 배열 desync 버그

### 증상

`upload.ts`의 `incidentCustomerIds` 배열이 `seed.ts`의 `incidentInputs` customerIndex와 불일치.

```typescript
// seed.ts — 실제 customerIndex
const incidentInputs = [
  { customerIndex: 0, type: 'abuse', memo: '직원에게 폭언', ... },
  { customerIndex: 4, type: 'abuse', memo: '환불 요구하며 위협 발언', ... },
  { customerIndex: 5, type: 'dispute', ... },
  ...
];

// upload.ts — 하드코딩된 배열 (불일치!)
const incidentCustomerIds = [0, 0, 4, 5, 5, 6, 6, 7];
//                                      ↑ 0이어야 하는데 4, ... 8이어야 하는데 7
```

사건이 잘못된 고객에게 할당되어 riskStats 계산이 전부 틀어짐.

### 근본 원인

두 파일에 동일한 정보를 복제하면 한쪽만 바뀌었을 때 desync가 발생한다.

### 해결: source of truth import

```typescript
// seed.ts — incidentInputs를 export
export const incidentInputs: { customerIndex: number; ... }[] = [...];

// upload.ts — 직접 import, 별도 배열 없음
import { incidentInputs } from './seed';

for (let i = 0; i < demoIncidents.length; i++) {
  const customerId = customerIds[incidentInputs[i].customerIndex];
  // ...
}
```

### 교훈

- 시드 업로드 스크립트의 모든 할당은 source of truth(seed.ts)에서 직접 가져와야 함
- 하드코딩된 병렬 배열(`incidentCustomerIds`, `reservationCustomerIds` 등)은 절대 유지하지 말 것
- 리뷰 시 `seed.ts`의 인덱스 배열과 `upload.ts`의 배열이 일치하는지 반드시 교차 검증

## 2. 데모 시연용 시드 날짜 갱신

### 증상

시드 예약 날짜가 `2026-05-01 ~ 2026-07-07` 범위인데, 데모 당일이 `7/27`이면 대시보드 "오늘 예약"이 빈 화면으로 표시됨.

### 해결

데모 1~2일 전에 시드 데이터의 예약 날짜를 갱신:

```typescript
// seed.ts reservationInputs에 추가

// 오늘(7/27) 예약 — 3가지 시연 시나리오
{ customerIndex: 9, date: '2026-07-27', time: '10:00', status: 'pending' },  // 기본 pending
{ customerIndex: 0, date: '2026-07-27', time: '14:00', status: 'pending' }, // 주의 고객 → 경고 배너 시연
{ customerIndex: 3, date: '2026-07-27', time: '12:00', status: 'visited' },  // 안심 고객 → 정상 방문 시연

// 내일(7/28) 예약
{ customerIndex: 2, date: '2026-07-28', time: '13:00', status: 'pending' },  // 예정 예약 시연
```

### 시연용 고객 선택 기준

| 시연 시나리오 | 고객 타입 | riskLevel | 용도 |
|---|---|---|---|
| 경고 배너 표시 | 주의 고객 (noShow 3+ 또는 abuse 1+) | medium | RiskAlertBanner 정상 작동 확인 |
| 정상 방문 | 안심 고객 (noShow 0, abuse 0) | low | 대시보드 "오늘 방문" 카드 |
| 예정 예약 | 모든 고객 | any | "예약 대기" 상태 표시 |

### 검증

```bash
npx tsx --no-cache -e "
import { demoReservations, demoCustomers, customerIds } from './src/seeds/seed';
const today = demoReservations.filter(r => r.date === '2026-07-27');
console.log('오늘 예약:', today.length, '건');
"
```

### 주의

- `npx tsx`가 캐시된 import를 반환할 수 있음 — `--no-cache` 플래그 필수
- 날짜 갱신 후 `previewSeedCustomers()`로 위험도 분포가 정상 유지되는지 확인
- `verify:seed` 스크립트로 alert 조건(noShow ≥ 3 || abuse ≥ 1)이 여전히 통과하는지 검증

## 3. tsx 캐시 문제

### 증상

`seed.ts`를 수정했는데 `npx tsx -e "..."`가 이전 데이터를 반환.

### 원인

tsx가 ES module 캐시를 유지.

### 해결

```bash
npx tsx --no-cache -e "..."
# 또는
rm -rf node_modules/.cache && npx tsx -e "..."
```