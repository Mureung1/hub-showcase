import { deleteApp, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getFirestore,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { loadEnv } from 'vite';
import {
  customerIds,
  demoCustomersWithRisk,
  demoIncidents,
  demoReservations,
  incidentIds,
  incidentInputs,
  reservationIds,
} from './seed';

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

async function seedDemoClient(): Promise<void> {
  const env = loadEnv('development', process.cwd(), 'VITE_');
  const app = initializeApp(
    {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    },
    'demo-seed-client',
  );
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    const credential = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    const uid = credential.user.uid;
    const storeRef = doc(db, 'stores', uid);

    await setDoc(
      storeRef,
      {
        ownerUid: uid,
        name: '카페 마루 (데모)',
        category: '카페',
        createdAt: Timestamp.now(),
      },
      { merge: true },
    );

    const batch = writeBatch(db);

    for (const [index, customer] of demoCustomersWithRisk.entries()) {
      batch.set(
        doc(collection(storeRef, 'customers'), customerIds[index]),
        {
          name: customer.name,
          phone: customer.phone,
          phoneLast4: customer.phoneLast4,
          createdAt: Timestamp.fromDate(toDate(customer.createdAt)),
          riskStats: {
            ...customer.riskStats,
            lastNoShowAt: customer.riskStats.lastNoShowAt
              ? Timestamp.fromDate(toDate(customer.riskStats.lastNoShowAt))
              : null,
            updatedAt: Timestamp.fromDate(toDate(customer.riskStats.updatedAt)),
          },
        },
        { merge: true },
      );
    }

    for (const [index, reservation] of demoReservations.entries()) {
      batch.set(
        doc(collection(storeRef, 'reservations'), reservationIds[index]),
        {
          ...reservation,
          createdAt: Timestamp.fromDate(toDate(reservation.createdAt)),
        },
        { merge: true },
      );
    }

    for (const [index, incident] of demoIncidents.entries()) {
      const customerId = customerIds[incidentInputs[index].customerIndex];
      batch.set(
        doc(collection(storeRef, 'customers', customerId, 'incidents'), incidentIds[index]),
        {
          ...incident,
          occurredAt: Timestamp.fromDate(toDate(incident.occurredAt)),
          createdAt: Timestamp.fromDate(toDate(incident.createdAt)),
        },
        { merge: true },
      );
    }

    await batch.commit();
    console.log(`데모 DB 시드 완료: 고객 ${demoCustomersWithRisk.length}명`);
  } finally {
    await signOut(auth).catch(() => undefined);
    await deleteApp(app);
  }
}

seedDemoClient().catch((error) => {
  console.error('데모 DB 시드 실패:', error);
  process.exit(1);
});
