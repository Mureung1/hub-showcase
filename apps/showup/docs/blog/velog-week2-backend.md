# AI Agent Challenge 2주차 백엔드 회고 — ShowUp: 인증·CRUD·예약·위험도 연동

> **ShowUp**은 소상공인을 위한 노쇼·악성 고객 이력 관리 및 위험도 경고 웹서비스입니다.
>
> 1주차에서 기반 세팅을 마쳤고, 2주차(7/13~7/17)부터 본격 개발에 들어갔습니다. 이 글에서는 2주차 백엔드 파트에서 구현한 인증, 고객 CRUD, 예약·사건 기록, 위험도 연동 과정에서 배운 것들을 정리합니다.
>
- 프로젝트 기간: 2026-07-09 ~ 2026-07-30 (16영업일)
- 백엔드: Firebase (Auth / Firestore / Cloud Functions / Hosting)
- 백엔드 세션 모델: Kimi K2.7 Code (Ollama)

> 역사적 회고 문서(2주차 작성 시점). 당시 계획·예정·검증 수치는 현재 상태를 나타내지 않는다. 2026-07-28 현재 운영 상태와 검증 결과는 [ShowUp README](../../README.md), [작업 체크리스트](../checklist.md)를 기준으로 한다.

---

## 2주차 백엔드 작업 요약

| 일차 | 날짜 | 주제 | 핵심 구현 |
|------|------|------|----------|
| 3일차 | 7/13 월 | 인증·폼 | Firebase Auth 회원가입/로그인, 가게 생성 플로우 |
| 4일차 | 7/14 화 | 고객 CRUD | 고객 등록·검색·목록, phoneLast4 자동 생성 |
| 5일차 | 7/15 수 | 예약·사건 | 예약 CRUD, 상태 전환, 사건 기록, riskStats 갱신 헬퍼 |
| 6일차 | 7/16 목 | 위험도 연동 | Cloud Functions 구조 설계, Critical 버그 수정 |
| 7일차 | 7/17 금 | 공휴일 | — |

---

## 1. Firebase Auth 연동 — 회원가입부터 가게 생성까지

3일차에 인증을 담당했습니다. ShowUp의 회원가입은 단순히 계정을 만드는 게 아니라, **Auth 계정 생성 → 가게 문서 생성**까지 한 플로우로 이어집니다.

```typescript
// src/services/auth.ts — 회원가입 플로우 핵심 부분

export async function signUp({
  email, password, storeName, storeCategory, agreedToPrivacy,
}: SignUpInput): Promise<User> {
  if (!agreedToPrivacy) {
    throw new Error('개인정보 수집·이용에 동의해야 가입할 수 있습니다.');
  }

  // 1. Firebase Auth 계정 생성
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: storeName });

  // 2. stores 문서 생성 (ownerUid = user.uid)
  await createStore(user.uid, {
    ownerUid: user.uid,
    name: storeName,
    category: storeCategory,
  });

  return user;
}
```

### 왜 `agreedToPrivacy`를 서비스 함수에서 검증하는가

개인정보 동의 체크박스는 프론트엔드에서도 검증하지만, 서비스 함수에서도 한 번 더 검사했습니다. 클라이언트 검증은 UI 편의성을 위한 것이고, **서비스 레이어 검증은 실제 로직 보호**를 위한 것입니다. 프론트엔드를 우회해서 API를 직접 호출하는 경우를 방지합니다.

### `ownerUid = user.uid` — 가게 ID를 Auth UID와 동일하게

회원가입 시 `user.uid`를 `storeId`로 그대로 사용했습니다. 이렇게 하면:

- 가게마다 고유한 ID가 보장됨 (Auth UID는 중복 없음)
- Security Rules에서 `ownerUid == request.auth.uid` 비교가 단순해짐
- 별도의 ID 생성 로직 불필요

### `onAuthStateChanged`로 인증 상태 감지

```typescript
export function subscribeToAuth(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}
```

`onAuthStateChanged`는 Firebase가 제공하는 인증 상태 변화 감지 함수입니다. 페이지 새로고침 시에도 세션이 유지되는지, 로그아웃 시 즉시 반응하는지를 이 함수 하나로 처리합니다. 반환값이 unsubscribe 함수인데, 컴포넌트 언마운트 시 호출해서 메모리 누수를 방지합니다.

---

## 2. 고객 CRUD — 검색 쿼리 설계 고민

4일차에는 고객 등록, 목록, 검색을 구현했습니다. 1주차에 미리 만들어둔 `searchCustomers` 함수를 실제 Firestore에 연동하는 작업이었습니다.

### 검색어가 이름인지 전화번호인지 판별하는 문제

사장님이 검색창에 "김철수"를 입력할 수도 있고, "5678"을 입력할 수도 있습니다. 두 경우를 어떻게 구분할까 고민했는데, 마스터 클래스에서 TDD를 배운 뒤라 **테스트 먼저 작성**해보기로 했습니다.

```typescript
// src/utils/search.ts — TDD로 작성 (red → green)

export function extractSearchPhoneLast4(keyword: string): string | null {
  const digits = keyword.trim().replace(/[^0-9]/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function isNameSearch(keyword: string): boolean {
  const digits = keyword.trim().replace(/[^0-9]/g, '');
  if (digits.length >= 4) return false;  // 숫자 4자리 이상 → 전화번호
  return true;                           // 그 외 → 이름
}
```

검색어에서 숫자만 추출한 뒤, 4자리 이상이면 전화번호 검색, 4자리 미만이면 이름 검색으로 분기합니다. "김철수5678" 같은 혼합 입력도 마지막 4자리를 추출해서 전화번호 검색으로 처리합니다.

### TDD 사이클 경험

수업에서 배운 TDD 흐름을 직접 적용해봤습니다:

1. **Red**: 테스트 케이스 작성 — `extractSearchPhoneLast4('5678')`이 `'5678'`을 반환해야 한다
2. **Green**: 최소 구현 — 로직 작성 후 테스트 통과
3. **Refactor**: 중복 제거, 가독성 개선

테스트를 먼저 쓰니 "이 함수가 어떤 입력을 받고 어떤 출력을 해야 하는지"가 명확해졌습니다. 구현하면서 방황하지 않게 되더군요.

---

## 3. 예약·사건 기록 — riskStats 갱신을 어디서 할 것인가

5일차에는 예약 CRUD와 사건 기록을 구현했습니다. 핵심 고민은 **riskStats를 언제, 어디서 갱신하느냐**였습니다.

### 문제: 예약 상태가 바뀔 때 위험도도 바뀌어야 한다

사장님이 예약을 "노쇼"로 변경하면, 해당 고객의 위험도 점수가 올라가야 합니다. "방문"으로 변경하면 점수가 내려가고요. 이 갱신 로직을 어디에 둘까 고민했습니다.

### 선택: 클라이언트 갱신 헬퍼 (안티패턴에서 어쩔 수 없는 선택)

```typescript
// src/services/riskRefresh.ts — 예약/사건 변경 후 riskStats 갱신

export async function transitionReservationStatusAndRefresh(
  storeId: string,
  customerId: string,
  resId: string,
  nextStatus: Reservation['status'],
): Promise<void> {
  await transitionReservationStatus(storeId, resId, nextStatus);
  await refreshRiskStats(storeId, customerId);
}

async function refreshRiskStats(storeId: string, customerId: string): Promise<void> {
  const [reservations, incidents] = await Promise.all([
    listReservations(storeId, customerId),
    listIncidents(storeId, customerId),
  ]);
  await refreshCustomerRiskStats(storeId, customerId, reservations, incidents);
}
```

**AndRefresh 패턴** — 원래 작업(예약 상태 변경)과 갱신(riskStats 재계산)을 하나의 함수로 묶었습니다. 호출하는 쪽에서 "갱신까지 해야 한다"는 것을 잊을 수 없도록 했습니다.

이건 사실 Cloud Function으로 해야 하는 일입니다. 예약 상태가 바뀌면 서버에서 자동으로 riskStats를 갱신하는 게 이상적이죠. 하지만 Cloud Functions는 Blaze 요금제(종량제)가 필요하고, 현재는 Spark(무료) 요금제라 배포할 수 없었습니다.

그래서 MVP에서는 클라이언트에서 갱신하고, **나중에 Cloud Function으로 이관할 수 있도록** 로직을 `risk.ts` 순수 함수에만 한정해뒀습니다.

### 고민: 이중 쓰기 문제

클라이언트에서 riskStats를 직접 쓰면, 두 사용자가 동시에 같은 고객의 예약을 변경했을 때 경쟁 조건(race condition)이 발생할 수 있습니다. 이건 현재 MVP 단계에서는 감수하고, Cloud Function 이관 후에는 서버에서 원자적으로 처리하도록 할 예정입니다.

---

## 4. Cloud Functions 구조 설계 — 결국 포기한 이유

6일차에 Cloud Functions 초기 구조를 만들었습니다. 예약 상태나 사건이 변경될 때 riskStats를 자동 재계산하는 트리거입니다.

```
functions/src/index.ts
  - onReservationStatusChange: reservations/{resId} status 변경 → riskStats 재계산
  - onIncidentWrite: incidents/{incidentId} 생성/수정/삭제 → riskStats 재계산
```

### 왜 결국 포기했는가

Cloud Functions를 배포하려면 Firebase 프로젝트가 **Blaze 요금제(종량제)**여야 합니다. 현재 Spark(무료) 요금제로는 배포할 수 없었습니다.

결정 과정:
1. Cloud Functions 구조 설계 → 커밋
2. 배포 시도 → Blaze 요금제 필요 확인
3. 대안 검토 → 클라이언트 `riskRefresh.ts`로 대체
4. Security Rules에서 riskStats 쓰기 허용 (원래는 차단하려 했던 부분)

이 과정에서 **"이상적인 아키텍처와 현실의差距"**를 느꼈습니다. Cloud Function이 맞는 설계인 걸 알지만, 요금제 제약 때문에 클라이언트 갱신으로 타협했습니다. 다만 `functions/` 디렉토리와 로직은 유지해둬서, Blaze로 업그레이드하면 바로 이관할 수 있도록 했습니다.

---

## 5. Critical 버그 수정 — 6일차의 하이라이트

6일차에 보안 세션의 침투 테스트 결과를 받아서, 백엔드에서 4개 Critical 버그를 수정했습니다. 이번 주에 가장 많이 배운 부분입니다.

### 버그 1: `getCustomer()`가 원본 전화번호를 반환

```typescript
// Before: 원본 phone 반환 (보안 위험)
async function getCustomer(storeId, customerId): Promise<Customer> {
  return snap.data() as Customer;  // phone 원본 포함
}

// After: CustomerSearchResult 반환 (마스킹 적용)
async function getCustomer(storeId, customerId): Promise<CustomerSearchResult> {
  const data = snap.data() as Customer;
  return enrichCustomer(id, storeId, data);  // phoneMasked만 반환
}
```

`enrichCustomer` 함수는 `maskPhone(data.phone)`을 거쳐서 `phoneMasked`만 반환합니다. 원본 `phone` 필드는 응답에서 제외됩니다.

### 버그 2: `isSameDay()` 타임존 버그

```typescript
// Before: Date 객체 비교 (타임존 문제)
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && ...;
}

// After: 문자열 비교 (YYYY-MM-DD)
function isSameDay(dateStr: string, at: Date): boolean {
  const target = new Date(dateStr);
  return target.getFullYear() === at.getFullYear() && ...;
}
```

Firestore에 저장된 예약 날짜는 `YYYY-MM-DD` 문자열인데, `new Date(dateStr)`로 파싱하면 타임존에 따라 하루가 어긋날 수 있습니다. 특히 한국(KST)과 UTC의 차이 때문에 자정 무렵에 예약이 하루 어긋나는 문제가 있었습니다. 문자열 비교로 변경해서 이 문제를 해결했습니다.

### 버그 3: `serverTimestamp()` 누락

riskStats 갱신 시 `updatedAt`을 `new Date()`로 설정하고 있었습니다. 이러면 클라이언트 시간이 서버 시간과 달라서, 마지막 갱신 시각이 부정확해집니다. `serverTimestamp()`로 변경해서 Firestore 서버 시간을 사용하도록 했습니다.

### 버그 4: `incident` occurredAt 캐스팅

```typescript
// Before: occurredAt을 강제 캐스팅
occurredAt: input.occurredAt as unknown as Timestamp

// After: Date 그대로 전달
occurredAt: input.occurredAt
```

Firestore는 JavaScript `Date` 객체를 자동으로 `Timestamp`로 변환합니다. 불필요한 타입 캐스팅을 제거하고, 원본 `Date`를 그대로 전달하도록 수정했습니다.

### 이 과정에서 배운 것

침투 테스트를 통해 발견된 버그들을 수정하면서, **보안 관점에서 코드를 다시 보는 법**을 배웠습니다. "이 필드가 클라이언트에 노출되면 안 되는가?", "이 타입 변환이 안전한가?"를 개발 단계에서 미리 검토해야 한다는 걸 깨달았습니다.

---

## 6. Firestore Security Rules 발전 — 필드 검증 추가

1주차에는 단순히 `ownerUid` 검증만 했던 Rules를, 2주차에는 필드별 검증까지 추가했습니다.

```
// firestore.rules — customers create 검증
allow create: if isStoreOwner(storeId)
  && request.resource.data.name is string
  && request.resource.data.name.size() > 0
  && request.resource.data.phone is string
  && request.resource.data.phoneLast4 is string;
```

### `isStoreOwner` helper 함수로 중복 제거

```
// Before: 모든 match 블록에서 get() 호출
allow read, write: if request.auth != null
  && get(/databases/$(database)/documents/stores/$(storeId))
    .data.ownerUid == request.auth.uid;

// After: helper 함수로 추출
function isStoreOwner(storeId) {
  return request.auth != null
    && get(/databases/$(database)/documents/stores/$(storeId))
      .data.ownerUid == request.auth.uid;
}
```

`isStoreOwner` helper를 만들어서 중복을 제거했습니다. Firestore Rules에서 `get()` 호출은 같은 요청 내에서 캐싱되기 때문에, 여러 규칙에서 같은 store 문서를 읽어도 비용은 1회만 발생합니다.

### incident type 화이트리스트

```
allow create: if isStoreOwner(storeId)
  && request.resource.data.type is string
  && request.resource.data.type in ['abuse', 'dispute', 'late', 'unreasonable'];
```

사건 type을 클라이언트에서 자유롭게 설정할 수 없도록, 허용된 4개 값만 통과시킵니다. 이것은 클라이언트 Zod 검증과 **이중화**된 서버 검증입니다.

---

## 7. 침투 테스트 — 8개 시나리오 에뮬레이터 실행

보안 세션에서 1주차에 설계만 했던 8개 침투 테스트 시나리오를 Firestore 에뮬레이터에서 실제로 실행했습니다. 전부 PASS했지만, 실행하면서 발견된 문제들이 6일차 Critical 버그 수정으로 이어졌습니다.

침투 테스트가 단순히 "규칙이 잘 작동하는가"만 확인하는 게 아니라, **실제 코드의 보안 취약점을 발견하는 도구**로 작동했습니다.

---

## 마무리

2주차 백엔드 작업의 핵심은 **"설계가 현실과 부딪힐 때 어떻게 타협하고 대안을 찾는가"**였습니다.

- Cloud Functions가 이상적이지만 Spark 요금제 제약 → 클라이언트 riskRefresh.ts로 대체
- 침투 테스트로 발견된 4개 Critical 버그 → 원본 노출, 타임존, 서버시간, 캐스팅
- TDD로 검색 함수 구현 → 테스트 먼저, 구현 나중
- Security Rules 필드 검증 → 클라이언트 + 서버 이중화

3주차에는 대시보드 집계, 에러 핸들링 표준화, 모바일 QA, 통합 QA, 배포가 진행됩니다.

---

**참고:** 본 프로젝트의 코드는 Hermes Agent 프레임워크 + Ollama Pro 모델(Kimi K2.7 Code)과 협업하여 작성되었으며, 설계 검토와 방향 수립, 코드 리뷰와 수정은 직접 진행했습니다.
