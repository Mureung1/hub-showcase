// ShowUp Firestore 시드 업로드 스크립트
// 개발/데모 환경용. Node.js(tsx)로 실행.
// 실행 전 .env 에 Firebase Admin SDK 서비스 계정 키 경로(SHOWUP_FIREBASE_SERVICE_ACCOUNT)를 설정하거나,
// GOOGLE_APPLICATION_CREDENTIALS 환경변수가 필요하다.
//
// 사용법:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
//   npx tsx src/seeds/upload.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

import {
  DEMO_STORE_ID,
  demoStore,
  demoReservations,
  demoIncidents,
  customerIds,
  reservationIds,
  incidentIds,
  demoCustomersWithRisk,
} from './seed';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`환경변수 ${key} 가 설정되지 않았습니다.`);
  }
  return value;
}

const app = initializeApp({
  credential: cert(getEnv('GOOGLE_APPLICATION_CREDENTIALS')),
  projectId: 'showup-project',
});

const db = getFirestore(app);

async function uploadSeeds(): Promise<void> {
  const batch = db.batch();

  // store 문서
  const storeRef = db.collection('stores').doc(DEMO_STORE_ID);
  batch.set(storeRef, {
    ...demoStore,
    createdAt: Timestamp.fromDate(demoStore.createdAt as unknown as Date),
  });

  // customer 문서 (riskStats 포함)
  for (let i = 0; i < demoCustomersWithRisk.length; i++) {
    const customer = demoCustomersWithRisk[i];
    const customerRef = storeRef.collection('customers').doc(customerIds[i]);
    batch.set(customerRef, {
      name: customer.name,
      phone: customer.phone,
      phoneLast4: customer.phoneLast4,
      createdAt: Timestamp.fromDate(customer.createdAt as unknown as Date),
      riskStats: {
        totalVisits: customer.riskStats.totalVisits,
        noShowCount: customer.riskStats.noShowCount,
        lateCancelCount: customer.riskStats.lateCancelCount,
        incidentCounts: customer.riskStats.incidentCounts,
        score: customer.riskStats.score,
        lastNoShowAt: customer.riskStats.lastNoShowAt
          ? Timestamp.fromDate(customer.riskStats.lastNoShowAt as unknown as Date)
          : null,
        updatedAt: Timestamp.fromDate(customer.riskStats.updatedAt as unknown as Date),
      },
    });
  }

  // reservation 문서
  for (let i = 0; i < demoReservations.length; i++) {
    const reservation = demoReservations[i];
    const reservationRef = storeRef.collection('reservations').doc(reservationIds[i]);
    batch.set(reservationRef, {
      customerId: reservation.customerId,
      date: reservation.date,
      time: reservation.time,
      status: reservation.status,
      cancelledSameDay: reservation.cancelledSameDay,
      memo: reservation.memo,
      createdAt: Timestamp.fromDate(reservation.createdAt as unknown as Date),
    });
  }

  // incident 문서
  const incidentCustomerIds = [0, 0, 4, 5, 5, 6, 6, 7];
  for (let i = 0; i < demoIncidents.length; i++) {
    const incident = demoIncidents[i];
    const customerId = customerIds[incidentCustomerIds[i]];
    const incidentRef = storeRef
      .collection('customers')
      .doc(customerId)
      .collection('incidents')
      .doc(incidentIds[i]);
    batch.set(incidentRef, {
      type: incident.type,
      memo: incident.memo,
      occurredAt: Timestamp.fromDate(incident.occurredAt as unknown as Date),
      createdAt: Timestamp.fromDate(incident.createdAt as unknown as Date),
    });
  }

  await batch.commit();
  console.log('시드 데이터 업로드 완료');
}

uploadSeeds()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('업로드 실패:', err);
    process.exit(1);
  });
