// ShowUp 데모용 가게 계정 생성 스크립트
// 개발/데모 환경에서 테스트용 가게와 샘플 데이터를 생성한다.
//
// 사용법:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
//   npx tsx src/seeds/createDemoStore.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import {
  customerIds,
  demoCustomersWithRisk,
  demoIncidents,
  demoReservations,
  incidentInputs,
  incidentIds,
} from './seed';

const PROJECT_ID = 'showup-project';
const STORE_NAME = '카페 마루 (데모)';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`환경변수 ${key} 가 설정되지 않았습니다.`);
  }
  return value;
}

const app = initializeApp({
  credential: cert(getEnv('GOOGLE_APPLICATION_CREDENTIALS')),
  projectId: PROJECT_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

const DEMO_EMAIL = 'demo@showup.example';
const DEMO_PASSWORD = 'demoPassword123!';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }
  throw new Error('시드 Timestamp 형식이 올바르지 않습니다.');
}

async function createDemoStore(): Promise<void> {
  let uid: string;

  try {
    const userRecord = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    uid = userRecord.uid;
    console.log(`데모 사용자 생성: ${uid}`);
  } catch (err) {
    const error = err as Error;
    if (error.message.includes('already exists')) {
      const userRecord = await auth.getUserByEmail(DEMO_EMAIL);
      uid = userRecord.uid;
      console.log(`기존 데모 사용자 사용: ${uid}`);
    } else {
      throw err;
    }
  }

  const storeRef = db.collection('stores').doc(uid);
  const storeSnap = await storeRef.get();
  if (!storeSnap.exists) {
    await storeRef.set({
      ownerUid: uid,
      name: STORE_NAME,
      category: '카페',
      createdAt: AdminTimestamp.now(),
    });
    console.log('가게 문서 생성');
  } else {
    console.log('기존 가게 문서 사용');
  }

  // 고객 생성/갱신
  const customerBatch = db.batch();
  for (const [i, customer] of demoCustomersWithRisk.entries()) {
    const customerRef = storeRef.collection('customers').doc(customerIds[i]);
    customerBatch.set(
      customerRef,
      {
        name: customer.name,
        phone: customer.phone,
        phoneLast4: customer.phoneLast4,
        createdAt: AdminTimestamp.fromDate(toDate(customer.createdAt)),
        riskStats: {
          ...customer.riskStats,
          lastNoShowAt: customer.riskStats.lastNoShowAt
            ? AdminTimestamp.fromDate(toDate(customer.riskStats.lastNoShowAt))
            : null,
          updatedAt: AdminTimestamp.fromDate(toDate(customer.riskStats.updatedAt)),
        },
      },
      { merge: true },
    );
  }
  await customerBatch.commit();
  console.log(`고객 ${demoCustomersWithRisk.length}명 생성/갱신`);

  // 예약 생성/갱신
  const reservationBatch = db.batch();
  for (const [i, reservation] of demoReservations.entries()) {
    const resId = `reservation-${String(i + 1).padStart(3, '0')}`;
    const resRef = storeRef.collection('reservations').doc(resId);
    reservationBatch.set(
      resRef,
      {
        customerId: reservation.customerId,
        date: reservation.date,
        time: reservation.time,
        status: reservation.status,
        cancelledSameDay: reservation.cancelledSameDay,
        memo: reservation.memo,
        createdAt: AdminTimestamp.fromDate(toDate(reservation.createdAt)),
      },
      { merge: true },
    );
  }
  await reservationBatch.commit();
  console.log(`예약 ${demoReservations.length}건 생성/갱신`);

  // 사건 생성/갱신
  const incidentBatch = db.batch();
  for (const [i, incident] of demoIncidents.entries()) {
    const customerIndex = incidentInputs[i].customerIndex;
    const incidentId = incidentIds[i];
    const incidentRef = storeRef
      .collection('customers')
      .doc(customerIds[customerIndex])
      .collection('incidents')
      .doc(incidentId);
    incidentBatch.set(
      incidentRef,
      {
        type: incident.type,
        memo: incident.memo,
        occurredAt: AdminTimestamp.fromDate(toDate(incident.occurredAt)),
        createdAt: AdminTimestamp.fromDate(toDate(incident.createdAt)),
      },
      { merge: true },
    );
  }
  await incidentBatch.commit();
  console.log(`사건 ${demoIncidents.length}건 생성/갱신`);

  console.log('');
  console.log('=== 데모 계정 ===');
  console.log(`이메일: ${DEMO_EMAIL}`);
  console.log(`비밀번호: ${DEMO_PASSWORD}`);
  console.log(`storeId: ${uid}`);
}

createDemoStore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('데모 가게 생성 실패:', err);
    process.exit(1);
  });
