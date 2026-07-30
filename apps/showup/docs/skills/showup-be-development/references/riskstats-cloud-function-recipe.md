# ShowUp riskStats Cloud Function 재계산 레시피

## 배경

`firestore.rules`에서 `customers` 문서의 `riskStats` 필드 직접 수정을 차단하면, 클라이언트의 `riskRefresh.ts`(`updateDoc(customerRef, { riskStats: ... })`)가 **Permission denied** 로 실패한다. 예약/사건 변경 후 자동 위험도 갱신을 유지하려면 Cloud Functions `onDocumentWritten` 트리거로 이관해야 한다.

## 파일 구조

```
apps/showup/functions/
  package.json        # firebase-admin + firebase-functions
  tsconfig.json       # CommonJS, es2020
  src/
    risk.ts           # apps/showup/src/utils/risk.ts 와 동기화된 복사본
    index.ts          # onDocumentWritten 트리거 2개
```

## package.json

```json
{
  "name": "showup-functions",
  "version": "0.0.1",
  "private": true,
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2020",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

## src/index.ts 초안

```typescript
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import type { FirestoreEvent, Change } from 'firebase-functions/v2/firestore';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

import { calculateRiskStats } from './risk';

initializeApp();
const db = getFirestore();

interface ReservationDoc {
  customerId: string;
  status: 'pending' | 'confirmed' | 'visited' | 'noShow' | 'cancelled';
  cancelledSameDay: boolean;
  createdAt: unknown;
}

interface IncidentDoc {
  type: 'abuse' | 'dispute' | 'late' | 'unreasonable';
  occurredAt: unknown;
  createdAt: unknown;
}

export const recalculateRiskOnReservationChange = onDocumentWritten(
  'stores/{storeId}/reservations/{reservationId}',
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const storeId = event.params.storeId;
    const afterData = event.data?.after?.data() as ReservationDoc | undefined;
    const beforeData = event.data?.before?.data() as ReservationDoc | undefined;
    const customerId = afterData?.customerId ?? beforeData?.customerId;
    if (!customerId) return;
    await recalculateAndSaveRiskStats(storeId, customerId);
  },
);

export const recalculateRiskOnIncidentChange = onDocumentWritten(
  'stores/{storeId}/customers/{customerId}/incidents/{incidentId}',
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
    const storeId = event.params.storeId;
    const customerId = event.params.customerId;
    await recalculateAndSaveRiskStats(storeId, customerId);
  },
);

async function recalculateAndSaveRiskStats(
  storeId: string,
  customerId: string,
): Promise<void> {
  const reservationsSnap = await db
    .collection('stores').doc(storeId).collection('reservations')
    .where('customerId', '==', customerId)
    .get();

  const incidentsSnap = await db
    .collection('stores').doc(storeId).collection('customers').doc(customerId).collection('incidents')
    .get();

  const reservations = reservationsSnap.docs.map((d) => d.data() as ReservationDoc);
  const incidents = incidentsSnap.docs.map((d) => d.data() as IncidentDoc);

  const stats = calculateRiskStats({ reservations, incidents });

  await db
    .collection('stores').doc(storeId).collection('customers').doc(customerId)
    .update({ riskStats: stats });
}
```

## 동기화 유지

- `functions/src/risk.ts` 는 `apps/showup/src/utils/risk.ts` 의 복사본이다.
- `RISK_WEIGHTS`, `RISK_LEVELS`, `calculateRiskStats` 로직이 변경되면 양쪽 동시에 반영해야 한다.
- 배포 전 `npm run build` 또는 `npx tsc --noEmit`로 타입체크 확인.

## MVP 개발 기간 대안

Cloud Function 배포(7/28) 전까지 로컬 개발/데모를 위한 임시 방안:

1. **Cloud Functions emulator 사용**: `firebase emulators:start --only functions` — 보안 규칙 그대로 유지, 가장 안전.
2. **firestore.rules 완화**: `customers` 문서 `allow update`에서 `riskStats` 차단 조건 제거. 프로덕션 배포 전 반드시 복원.
3. **클라이언트에서만 계산**: Firestore 저장 안 하고 화면 표시용만 실시간 계산. 대시보드 집계/정렬에 불리함.

권장: emulator 사용 > rules 완화 > 클라이언트 계산.

## 배포

```bash
cd apps/showup/functions
npm run build
firebase deploy --only functions
```

배포 후 `firestore.rules`에서 `riskStats` 쓰기 차단 규칙을 그대로 유지할 수 있다.
