/**
 * ShowUp Firestore Security Rules 회귀 테스트.
 * 실행: firebase emulators:exec --only firestore "npm run verify:security"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.join(currentDir, '..', 'firestore.rules'), 'utf8');
const projectId = 'showup-smoke-test';
const env = await initializeTestEnvironment({
  projectId,
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});

const now = new Date('2026-07-28T12:00:00+09:00');
const validRiskStats = (score = 0) => ({
  totalVisits: 0,
  noShowCount: 0,
  lateCancelCount: 0,
  incidentCounts: { abuse: 0, dispute: 0, late: 0, unreasonable: 0 },
  score,
  lastNoShowAt: null,
  updatedAt: now,
});
const validStore = (ownerUid) => ({
  ownerUid,
  name: '테스트 가게',
  category: 'cafe',
  createdAt: now,
});
const validCustomer = (overrides = {}) => ({
  name: '홍길동',
  phone: '01012345678',
  phoneLast4: '5678',
  createdAt: now,
  riskStats: validRiskStats(),
  ...overrides,
});
const validIncident = (overrides = {}) => ({
  type: 'abuse',
  memo: '사실 기록',
  occurredAt: now,
  createdAt: now,
  ...overrides,
});
const validReservation = (overrides = {}) => ({
  customerId: 'cust1',
  date: '2026-07-28',
  time: '14:00',
  status: 'pending',
  cancelledSameDay: false,
  statusChangedAt: null,
  memo: '',
  createdAt: now,
  ...overrides,
});

const ownerDb = async (uid = 'ownerA') =>
  (await env.authenticatedContext(uid)).firestore();
const setupStore = async (db, storeId = 'storeA', ownerUid = 'ownerA') => {
  await db.doc(`stores/${storeId}`).set(validStore(ownerUid));
};

const cases = [];
const test = async (name, run) => {
  await env.clearFirestore({ projectId });
  try {
    await run();
    cases.push({ name, passed: true });
  } catch (error) {
    cases.push({ name, passed: false, error });
  }
};

await test('1. 비로그인 store read/write 차단', async () => {
  const db = (await env.unauthenticatedContext()).firestore();
  await assertFails(db.doc('stores/storeA').get());
  await assertFails(db.doc('stores/storeA').set(validStore('ownerA')));
});

await test('2. 타 가게 store 접근 차단', async () => {
  const dbA = await ownerDb();
  const dbB = await ownerDb('ownerB');
  await setupStore(dbA);
  await assertFails(dbB.doc('stores/storeA').get());
  await assertFails(dbB.doc('stores/storeA').update({ name: '탈취' }));
});

await test('3. ownerUid 위조 store 생성 차단', async () => {
  const db = await ownerDb();
  await assertFails(db.doc('stores/storeA').set(validStore('ownerB')));
  await assertSucceeds(db.doc('stores/storeB').set(validStore('ownerA')));
});

await test('4. ownerUid 변경 및 store 직접 삭제 차단', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await assertFails(db.doc('stores/storeA').update({ ownerUid: 'ownerB' }));
  await assertFails(db.doc('stores/storeA').delete());
});

await test('5. 타 가게 고객 CRUD 차단', async () => {
  const dbA = await ownerDb();
  const dbB = await ownerDb('ownerB');
  await setupStore(dbA);
  await dbA.doc('stores/storeA/customers/cust1').set(validCustomer());
  await assertFails(dbB.doc('stores/storeA/customers/cust1').get());
  await assertFails(dbB.doc('stores/storeA/customers/cust1').update({ name: '탈취' }));
});

await test('6. 고객 필수 필드·형식 검증', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await assertFails(db.doc('stores/storeA/customers/bad1').set(validCustomer({ name: '' })));
  await assertFails(db.doc('stores/storeA/customers/bad2').set(validCustomer({ phoneLast4: '12' })));
  await assertFails(db.doc('stores/storeA/customers/bad3').set(validCustomer({ phone: '1234567890' })));
  await assertFails(db.doc('stores/storeA/customers/bad4').set(validCustomer({ phoneLast4: '9999' })));
  await assertSucceeds(db.doc('stores/storeA/customers/good').set(validCustomer()));
});

await test('7. phoneLast4 단독 변경 차단', async () => {
  const db = await ownerDb();
  await setupStore(db);
  const ref = db.doc('stores/storeA/customers/cust1');
  await ref.set(validCustomer());
  await assertFails(ref.update({ phoneLast4: '9999' }));
  await assertSucceeds(ref.update({ phone: '01099999999', phoneLast4: '9999' }));
});

await test('8. riskStats 스키마 검증', async () => {
  const db = await ownerDb();
  await setupStore(db);
  const ref = db.doc('stores/storeA/customers/cust1');
  await ref.set(validCustomer());
  await assertFails(ref.update({ riskStats: { score: 999 } }));
  await assertSucceeds(ref.update({ riskStats: validRiskStats(10) }));
});

await test('9. 타 가게 사건 CRUD 차단', async () => {
  const dbA = await ownerDb();
  const dbB = await ownerDb('ownerB');
  await setupStore(dbA);
  await dbA.doc('stores/storeA/customers/cust1').set(validCustomer());
  const ref = dbA.doc('stores/storeA/customers/cust1/incidents/inc1');
  await ref.set(validIncident());
  await assertFails(dbB.doc(ref.path).get());
  await assertFails(dbB.doc(ref.path).update({ memo: '탈취' }));
});

await test('10. 사건 type·memo 검증', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await db.doc('stores/storeA/customers/cust1').set(validCustomer());
  await assertFails(db.doc('stores/storeA/customers/cust1/incidents/bad').set(validIncident({ type: 'spam' })));
  await assertFails(db.doc('stores/storeA/customers/cust1/incidents/long').set(validIncident({ memo: '가'.repeat(501) })));
  await assertSucceeds(db.doc('stores/storeA/customers/cust1/incidents/good').set(validIncident()));
});

await test('10b. 예약 날짜·시간 형식 검증', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await db.doc('stores/storeA/customers/cust1').set(validCustomer());
  await assertFails(db.doc('stores/storeA/reservations/bad-date').set(validReservation({ date: '2026-13-01' })));
  await assertFails(db.doc('stores/storeA/reservations/bad-time').set(validReservation({ time: '25:00' })));
  await assertSucceeds(db.doc('stores/storeA/reservations/good-date').set(validReservation()));
});

await test('11. 사건 생성 시 임의 필드 차단', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await db.doc('stores/storeA/customers/cust1').set(validCustomer());
  await assertFails(db.doc('stores/storeA/customers/cust1/incidents/bad').set(validIncident({ admin: true })));
});

await test('12. 타 가게 예약 CRUD 차단', async () => {
  const dbA = await ownerDb();
  const dbB = await ownerDb('ownerB');
  await setupStore(dbA);
  await dbA.doc('stores/storeA/customers/cust1').set(validCustomer());
  const ref = dbA.doc('stores/storeA/reservations/res1');
  await ref.set(validReservation());
  await assertFails(dbB.doc(ref.path).get());
  await assertFails(dbB.doc(ref.path).update({ status: 'visited' }));
});

await test('13. 예약 status 검증 및 customerId 변경 차단', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await db.doc('stores/storeA/customers/cust1').set(validCustomer());
  const ref = db.doc('stores/storeA/reservations/res1');
  await ref.set(validReservation());
  await assertFails(db.doc('stores/storeA/reservations/bad').set(validReservation({ status: 'blocked' })));
  await assertFails(ref.update({ customerId: 'cust2' }));
  await assertSucceeds(ref.update({ status: 'confirmed', statusChangedAt: null }));
  await assertSucceeds(ref.update({ status: 'visited', statusChangedAt: now }));
  await assertFails(ref.update({ statusChangedAt: new Date('2026-07-29T12:00:00+09:00') }));
  await assertFails(ref.update({ cancelledSameDay: true }));
  await assertFails(ref.update({ date: '2026-07-29' }));
});

await test('14. 정상 소유자 핵심 CRUD 허용', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await assertSucceeds(db.doc('stores/storeA').update({ name: '수정 가게' }));
  await assertSucceeds(db.doc('stores/storeA/customers/cust1').set(validCustomer()));
  await assertSucceeds(db.doc('stores/storeA/reservations/res1').set(validReservation()));
  await assertSucceeds(db.doc('stores/storeA/customers/cust1/incidents/inc1').set(validIncident()));
});

await test('15. 예약 고객 존재·상태 역행 차단', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await assertFails(
    db.doc('stores/storeA/reservations/orphan').set(validReservation({ customerId: 'missing' })),
  );

  await db.doc('stores/storeA/customers/cust1').set(validCustomer());
  const validRef = db.doc('stores/storeA/reservations/res1');
  await validRef.set(validReservation());
  await assertSucceeds(validRef.update({ status: 'visited', statusChangedAt: now }));
  await assertFails(validRef.update({ status: 'pending', statusChangedAt: null }));
  await assertFails(validRef.update({ status: 'visited', statusChangedAt: null }));
});

await test('16. 존재하지 않는 고객 사건 생성 차단', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await assertFails(
    db.doc('stores/storeA/customers/missing/incidents/inc1').set(validIncident()),
  );
});

await test('17. 고객 삭제 후 orphan 예약·사건 read 차단', async () => {
  const db = await ownerDb();
  await setupStore(db);
  await db.doc('stores/storeA/customers/cust1').set(validCustomer());
  await db.doc('stores/storeA/customers/cust1/incidents/inc1').set(validIncident());
  await db.doc('stores/storeA/reservations/res1').set(validReservation());
  await assertSucceeds(
    getDocs(collection(db, 'stores', 'storeA', 'reservations')),
  );

  await db.doc('stores/storeA/customers/cust1').delete();
  await assertFails(db.doc('stores/storeA/customers/cust1/incidents/inc1').get());
  await assertFails(db.doc('stores/storeA/reservations/res1').get());
  await assertSucceeds(
    getDocs(collection(db, 'stores', 'storeA', 'reservations')),
  );
});

await env.cleanup();

for (const result of cases) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} - ${result.name}`);
  if (!result.passed) console.error(result.error?.message ?? result.error);
}
const failed = cases.filter((result) => !result.passed).length;
console.log(`총 ${cases.length}개: ${cases.length - failed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
