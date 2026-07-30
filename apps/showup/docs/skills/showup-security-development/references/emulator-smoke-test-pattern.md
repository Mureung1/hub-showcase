# Firebase 에뮬레이터 기반 보안 스모크 테스트 패턴

> 13일차 (7/27) SECURITY 세션에서 확립한 패턴.

## 개요

`@firebase/rules-unit-testing` v5를 사용해 Firestore Security Rules를 에뮬레이터에서 회귀 테스트.
Jest 불필요 — 순수 Node.js ESM 스크립트로 실행.

## 사전 준비

### 1. 에뮬레이터 시작

```bash
cd apps/showup
firebase emulators:start --only firestore
# 백그라운드 실행 — 포트 8080
```

준비 확인:
```bash
curl -s http://localhost:8080 | head -1  # "Ok"
```

### 2. 의존성 resolve 문제 (npm workspaces)

**증상**: `@firebase/rules-unit-testing` v5 ESM이 `firebase/compat/*`를 import하는데, npm workspaces hoisting으로 `@firebase/rules-unit-testing`은 hub 루트에, `firebase`는 showup workspace에 있어서 `ERR_MODULE_NOT_FOUND` 발생.

**해결 방법 A** (빠름):
```bash
ln -sf apps/showup/node_modules/firebase hub/node_modules/firebase
```

**해결 방법 B** (정식):
```bash
cd apps/showup
npm install --save-dev @firebase/rules-unit-testing@5 --legacy-peer-deps
```

## 테스트 스크립트 구조

파일: `security/smoke-test.mjs`

```javascript
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

// 단일 테스트 환경 — 각 테스트 사이에 DB 초기화
const env = await initializeTestEnvironment({
  projectId: 'showup-smoke-test',
  firestore: { rules, host: 'localhost', port: 8080 },
});

function clearDb() {
  return env.clearFirestore({ projectId: 'showup-smoke-test' });
}

// 헬퍼
async function test(name, fn) {
  try { await fn(); passCount++; results.push(`✅ PASS — ${name}`); }
  catch (err) { failCount++; results.push(`❌ FAIL — ${name}: ${err.message}`); }
}
async function makeCtx(uid) {
  return (await env.authenticatedContext(uid)).firestore();
}
```

### 핵심 패턴: 각 테스트 전 DB 초기화

```javascript
await test('타 가게 고객 read/write 차단', async () => {
  await clearDb();  // ← 필수: 이전 테스트 문서 잔존 방지
  const dbA = await makeCtx('ownerA');
  const dbB = await makeCtx('ownerB');
  await dbA.doc('stores/storeA').set({ ownerUid: 'ownerA' });
  await dbA.doc('stores/storeA/customers/cust1').set({
    name: '홍길동', phone: '01012345678', phoneLast4: '5678',
  });
  await assertFails(dbB.doc('stores/storeA/customers/cust1').get());
  await assertFails(dbB.doc('stores/storeA/customers/cust2').set({...}));
});
```

## 실행

```bash
cd hub  # 루트에서 실행 (의존성 resolve 때문에)
node --experimental-vm-modules apps/showup/security/smoke-test.mjs
```

## 결과 해석

- 에뮬레이터 로그의 `PERMISSION_DENIED` 메시지는 `assertFails`의 정상 동작 결과 — 무시
- 최종 요약 라인만 확인: `총 14개: ✅ 14 PASS, ❌ 0 FAIL`
- `exit_code !== 0`이면 FAIL 존재

## 14개 시나리오 목록

1. 비로그인 store read/write 차단
2. 타 가게 store read 차단
3. ownerUid 위조 store create 차단
4. 타 가게 고객 read/write 차단
5. 타 가게 사건 read/write 차단
6. 허용되지 않은 incident type create 차단
7. incident update 시 허용되지 않은 type 차단
8. 타 가게 예약 read/write 차단
9. 예약 status 허용값 외 차단
10. 고객 create 필드 타입 검증 (name/phone/phoneLast4)
11. riskStats 클라이언트 갱신 허용 (Spark 요금제)
12. 고객 update 필드 검증 (name 빈 문자열 차단)
13. 비로그인 고객/예약/사건 접근 전 차단
14. 정상 소유자 CRUD 허용 (store+customer+reservation+incident)

## 에뮬레이터 종료

```bash
# 백그라운드 프로세스 kill
# 또는 Ctrl+C
```

## 주의사항

- `npx tsx`로 실행 시 `tsx`의 module resolution이 `@firebase/rules-unit-testing`의 ESM import를 resolve하지 못할 수 있음 — `node --experimental-vm-modules`를 직접 사용
- `clearFirestore()`를 호출하지 않으면 같은 projectId 내에서 문서가 잔존하여 `set()`이 update로 동작 → 규칙 평가가 달라짐
- `assertSucceeds` / `assertFails`는 Promise를 반환 — `await` 필수