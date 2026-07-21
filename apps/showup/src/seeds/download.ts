// ShowUp Firestore 데이터 백업/덤프 스크립트
// 개발/프로덕션 환경의 Firestore 데이터를 JSON 으로 로컬에 저장한다.
//
// 사용법:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
//   npx tsx src/seeds/download.ts [storeId]
//
// 백업 파일: backups/<storeId>/<ISO>.json

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

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

interface BackupData {
  storeId: string;
  exportedAt: string;
  store: Record<string, unknown>;
  customers: Record<string, Record<string, unknown>>;
  reservations: Record<string, Record<string, unknown>>;
  incidents: Record<
    string,
    Record<string, Record<string, unknown>>
  >;
}

async function downloadStore(storeId: string): Promise<BackupData> {
  const storeRef = db.collection('stores').doc(storeId);

  const storeSnap = await storeRef.get();
  const store = storeSnap.data() ?? {};

  const customersSnap = await storeRef.collection('customers').get();
  const customers: Record<string, Record<string, unknown>> = {};
  for (const d of customersSnap.docs) {
    customers[d.id] = d.data();
  }

  const reservationsSnap = await storeRef.collection('reservations').get();
  const reservations: Record<string, Record<string, unknown>> = {};
  for (const d of reservationsSnap.docs) {
    reservations[d.id] = d.data();
  }

  const incidents: Record<
    string,
    Record<string, Record<string, unknown>>
  > = {};
  for (const customerId of Object.keys(customers)) {
    const incidentsSnap = await storeRef
      .collection('customers')
      .doc(customerId)
      .collection('incidents')
      .get();
    const customerIncidents: Record<string, Record<string, unknown>> = {};
    for (const d of incidentsSnap.docs) {
      customerIncidents[d.id] = d.data();
    }
    if (Object.keys(customerIncidents).length > 0) {
      incidents[customerId] = customerIncidents;
    }
  }

  return {
    storeId,
    exportedAt: new Date().toISOString(),
    store,
    customers,
    reservations,
    incidents,
  };
}

async function main(): Promise<void> {
  const storeId = process.argv[2];
  if (!storeId) {
    console.error('사용법: npx tsx src/seeds/download.ts <storeId>');
    process.exit(1);
  }

  const data = await downloadStore(storeId);

  const backupDir = path.join(process.cwd(), 'backups', storeId);
  fs.mkdirSync(backupDir, { recursive: true });

  const fileName = `${data.exportedAt.replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(backupDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`백업 완료: ${filePath}`);
  console.log(
    `customers: ${Object.keys(data.customers).length}, ` +
      `reservations: ${Object.keys(data.reservations).length}, ` +
      `incidents: ${Object.values(data.incidents).reduce(
        (sum, group) => sum + Object.keys(group).length,
        0,
      )}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('백업 실패:', err);
    process.exit(1);
  });
