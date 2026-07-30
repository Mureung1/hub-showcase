# P0 버그 패턴 + 코드 리뷰 체크리스트

> 2026-07-28 ShowUp 14일차 — 외부 리뷰에서 발견된 P0 3건 + P1 패턴 정리.
> 2026-07-29 15일차 — LEAD 전수조사에서 추가 발견분 업데이트.
> 새 기능 추가 후 반드시 아래 항목을 점검할 것.

## P0-1: 라우트 경로 불일치 — `/customers/:id` vs `/app/customers/:id`

### 패턴

보호 라우트가 `/app/*` 접두사를 사용하는데, Link 컴포넌트에서 `/customers/${id}` 처럼 `/app`을 빼먹으면 NotFound 페이지로 이동한다.

### 점검 방법

```bash
grep -rn "to={\`/customers" src/  # /app 접두사 빠진 링크 찾기
grep -rn "to={\`/reservations" src/
grep -rn "to={\`/dashboard" src/
```

### 수정

모든 내부 링크에 `/app` 접두사 확인:
- `Customers.tsx`: `to={`/app/customers/${customer.id}`}`
- `Dashboard.tsx`: `to={`/app/customers/${customer.id}`}`

## P0-2: Modal footer의 submit 버튼이 form과 연결되지 않음

### 패턴

`Modal` 컴포넌트가 `children`(form)과 `footer`(버튼들)를 형제 구조로 렌더링한다. footer의 `<Button type="submit">`이 form 밖에 있어서 submit 이벤트가 발생하지 않는다.

### 수정

```tsx
<form id="incident-form" onSubmit={handleSubmit(handleFormSubmit)}>
  ...
</form>

<Button type="submit" form="incident-form" variant="primary">
  기록
</Button>
```

## P0-3: 중복 고객 검사 — 마스킹 번호 비교 + setState 직후 검사

### 패턴 1: 마스킹된 번호와 원본 번호 비교

`phoneMasked`는 `010-****-5678` → 숫자만 추출하면 `0105678` (8자리).
`phone`은 `010-1234-5678` → 숫자만 추출하면 `01012345678` (11자리).
서로 같을 수 없다.

### 패턴 2: setState 직후 state 검사

```typescript
await checkDuplicate(data.phone)
if (existingCustomer) { return }  // React state는 비동기 → 아직 null일 수 있음
```

### 수정 방향

1. 서비스에 `findCustomerByPhone(storeId, phone)` 추가 — `normalizePhone`으로 원본 비교
2. `checkDuplicate`에서 결과를 직접 반환하고, `onSubmit`에서 직접 검사

```typescript
const existing = await findCustomerByPhone(user.uid, data.phone)
if (existing) {
  setExistingCustomer(existing)
  return
}
```

## P1: tsconfig.app.json noEmit 함정

`"noEmit": false`면 `tsc -b` 실행 시 `.ts` 옆에 `.js` 파일이 생성된다. Vite가 이 `.js`를 우선 참조할 수 있어서 빌드 경고 및 환경 간 불일치 발생.

### 수정

```json
{ "compilerOptions": { "noEmit": true } }
```

또는 typecheck를 `tsc -p tsconfig.app.json --noEmit`로 변경.

이미 생성된 .js 정리:
```bash
find apps/showup/src -name '*.js' -delete
find apps/showup/src -name '*.tsbuildinfo' -delete
```

## P1: Firestore 복합 인덱스 누락

코드에서 `orderBy('riskStats.score', 'desc')` + `orderBy('createdAt', 'desc')` 쿼리를 사용하지만 `firestore.indexes.json`에 해당 인덱스가 없으면 신규 환경에서 쿼리 실패.

### 점검

`firestore.indexes.json`과 실제 쿼리(`where` + `orderBy` 조합)를 비교. 모든 복합 쿼리 패턴이 인덱스에 포함되어야 함.

## P1: 에러를 빈 상태로 숨김

```typescript
// ❌ 검색 실패 시 결과를 비우고 "결과 없음" 표시 — 사용자는 에러인지 구분 불가
catch (error) { setResults([]) }

// ✅ 에러 상태 분리
const [error, setError] = useState<string | null>(null)
catch (error) { setError('데이터를 불러오지 못했습니다') }
```

## P1: 테스트 명령 경로 불일치

`package.json` 테스트 명령이 `.cjs`를 가리키지만 실제는 `.mjs`이고 `.gitignore`로 무시됨. "PASS"가 재현 불가능.

### 수정 방향

- 보안 테스트 `.mjs`를 `.gitignore`에서 제외하거나 `tsx` 기반으로 통일
- 테스트 명령 경로와 실제 파일 확장자 일치

## .env symlink 패턴 (Secrets 관리)

`.env` 파일을 프로젝트 폴더가 아닌 `~/Secrets/billable/`에 저장하고 symlink로 연결:

```bash
# 실제 파일: ~/Secrets/billable/hub-showup.env (chmod 600)
# symlink: apps/showup/.env -> ~/Secrets/billable/hub-showup.env
ln -s ~/Secrets/billable/hub-showup.env apps/showup/.env
```

Vite 캐시 문제: `.env` 복구 후 dev 서버 재시작 필수:
```bash
kill $(lsof -ti :5173)
npm run dev -w showup  # 백그라운드 재시작
```

## P0: enrichCustomer riskStats null — 고객 정보 로딩 실패

### 패턴

고객 문서가 REST API 등으로 생성되어 `riskStats` 필드가 없는 경우, `enrichCustomer`에서 `data.riskStats.score` 접근 시 런타임 크래시. `getCustomer()`가 실패하고 CustomerDetail 페이지에 "고객 정보를 불러오는데 실패했습니다" 에러 표시.

또한 `data.phone`이 없으면 `maskPhone(undefined)` → `normalizePhone(undefined)` → `undefined.replace()` → TypeError. `data.name`이 없어도 문제.

### 수정

`customers.ts`의 `enrichCustomer` 시그니처를 `Partial<Customer>`로 변경하고 모든 필드에 null 가드:

```typescript
function enrichCustomer(id: string, storeId: string, data: Partial<Customer>): CustomerSearchResult {
  const phone = data.phone || ''
  const name = data.name || ''
  const riskStats = data.riskStats ?? {
    totalVisits: 0,
    noShowCount: 0,
    lateCancelCount: 0,
    incidentCounts: { abuse: 0, dispute: 0, late: 0, unreasonable: 0 },
    score: 0,
    lastNoShowAt: null,
    updatedAt: null,
  }
  // ...
  return {
    id, storeId, name,
    phoneMasked: phone ? maskPhone(phone) : '',
    riskStats: riskStats as Customer['riskStats'],
    // ...
  }
}
```

### CustomerDetail.tsx null early return

`getCustomer`가 null을 반환할 때 catch 블록이 아닌 "고객을 찾을 수 없습니다" 화면을 표시해야 한다:

```typescript
const customerData = await getCustomer(user.uid, id)
if (!customerData) {
  setCustomer(null)
  setIsLoading(false)
  return  // loadTimeline 호출하지 않음
}
setCustomer(customerData)
await loadTimeline(id)
```

이렇게 하면 존재하지 않는 고객 ID로 직접 접근해도 에러가 아닌 "고객을 찾을 수 없습니다" 메시지가 표시된다.

### ⚠️ 잔존 타입 불일치 (15일차 발견)

`enrichCustomer`의 기본 `riskStats` 객체에서 `updatedAt: null`을 사용하지만, `RiskStats` 타입 정의상 `updatedAt`은 `FirestoreTimestamp` (null 불가). TypeScript가 `as Customer['riskStats']` 캐스팅으로 우회하지만, `null`이 아닌 적절한 기본값이 필요:

```typescript
// ❌ 현재 (타입 불일치 — 캐스팅으로 우회)
updatedAt: null,

// ✅ 수정 방향
updatedAt: serverTimestamp(),  // 또는 Timestamp.now()
```

MVP 단계에서 런타임 크래시는 없지만, strict 타입 검사 시 에러.

## 15일차 전수조사 발견분 (2026-07-29)

### 실제 버그 (수정 필요)

#### Modal backdrop 클릭으로 닫기 안 됨

`Modal.tsx` 구조:
```tsx
<div className="fixed inset-0 z-50">
  <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />  // backdrop
  <div className="flex min-h-full items-center justify-center p-4">  // wrapper
    <div className="relative bg-white rounded-xl shadow-xl">  // panel
```

backdrop이 `fixed inset-0`, wrapper도 일반 div. DOM 순서상 wrapper가 backdrop 위에 렌더링되어 backdrop의 onClick이 트리거되지 않음. 사용자가 패널 외부 영역을 클릭해도 모달이 닫히지 않음.

**수정 방향**:
```tsx
// wrapper에 onClick 추가 + 패널에서 stopPropagation
<div className="flex min-h-full items-center justify-center p-4" onClick={onClose}>
  <div className="relative bg-white ..." onClick={(e) => e.stopPropagation()}>
```

또는 backdrop을 wrapper 내부가 아닌 별도 형제 요소로 분리하고 z-index로 패널 위에 배치.

#### Modal 접근성 속성 누락

- `role="dialog"` 없음
- `aria-modal="true"` 없음
- `aria-labelledby` 없음 (title 연결)
- ESC 키 닫기 없음
- 포커스 트랩 없음 (모달 열려도 배경 요소에 포커스 이동 가능)

데모 단계에서 비필수로 분류했으나, 실제 사용자 불편 발생 가능. 우선 ESC 닫기 + role/aria 속성만이라도 추가 권장.

#### Input 컴포넌트 id 충돌

`Input.tsx:11`:
```typescript
const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
```

동일한 label을 가진 Input 컴포넌트가 2개 이상이면 같은 HTML id 생성 → HTML invalid. 현재 사용처에서 동일 label 중복은 없으나 잠재적 위험.

**수정 방향**: `useId()` 훅 사용 또는 label 기반 id에 난수/카운터 추가.

#### useAuth 에러 콜백 누락

`useAuth.ts:22-28`:
```typescript
const unsubscribe = subscribeToAuth((user) => {
  setState({ user, loading: false, error: null })
})
```

`onAuthStateChanged`의 두 번째 인자(error callback)를 전달하지 않음. 인증 에러 발생 시 `state.error`가 갱신되지 않고 항상 `null`. 사용자가 인증 실패 원인을 알 수 없음.

**수정 방향**: `subscribeToAuth`에 에러 콜백 추가:
```typescript
export function subscribeToAuth(
  callback: (user: User | null) => void,
  errorCallback?: (error: Error) => void,
): () => void {
  return onAuthStateChanged(auth, callback, errorCallback)
}
```

#### Reservations.tsx 상태 변경 후 목록 재로드 로직 중복

`Reservations.tsx:77-93` — `handleStatusChange` 성공 후 전체 목록을 다시 로드하는 로직이 `useEffect` 내부의 `loadReservations`와 동일한 코드를 인라인으로 반복.

**수정 방향**: `loadReservations`를 `useCallback`으로 추출하여 재사용.

### 성능/리팩토링 권장

#### N+1 쿼리 — Reservations.tsx

`Reservations.tsx:38-48` — 각 예약마다 개별적으로 `getCustomer` 호출. 예약이 많아지면 Firestore 요청이 선형 증가.

MVP 규모(하루 수십 건)에서는 문제 없으나, 확장 시 배치 조회 또는 customers 컬렉션을 한 번에 읽어 Map으로 매핑 권장.

#### withErrorHandling 래퍼 미사용

`withErrorHandling.ts`가 정의되어 있지만, 실제 서비스 함수들(`auth.ts`, `customers.ts`, `reservations.ts`, `incidents.ts`, `stores.ts`)이 이 래퍼를 사용하지 않음. raw Firebase 에러가 그대로 전파되어 사용자에게 기술적 에러 메시지 노출.

**수정 방향**: 서비스 함수 내부에 `withErrorHandling` 적용하거나, 각 서비스 호출 지점에서 `try-catch`로 `wrapFirestoreError` 호출.

#### AppLayout lazy import 누락

`App.tsx:5`에서 `AppLayout`만 정적 import. 다른 모든 페이지는 `lazy()`로 코드 스플리팅되어 있는데 AppLayout은 초기 번들에 포함됨. 경미 — AppLayout 자체가 작음.

#### functions/src/index.ts updatedAt 타입

`recalculateAndSaveRiskStats`에서 `stats.updatedAt`이 `Date` 객체 (`base.updatedAt ?? now`). Cloud Functions에서는 `serverTimestamp()` 사용 권장. 미배포 상태라 영향 없음.

## Landing 페이지 PC 비율 (14일차)

모바일 중심 `max-w-md`를 PC에서도 프로페셔널하게 보이도록 `max-w-4xl`로 변경:

- Hero: `max-w-4xl`, CTA 버튼 `flex-col sm:flex-row` (모바일 세로, PC 가로)
- Features: `grid grid-cols-1 md:grid-cols-2 gap-6` (PC 2열)
- Footer: `max-w-4xl`

## ShowUp 로고 클릭 시 인증 상태별 이동 (14일차)

AppLayout + Landing의 ShowUp 로고 클릭 시:
- 로그인 상태 → `/app/dashboard`
- 비로그인 상태 → `/login`

```typescript
const { user } = useAuthState()
const handleLogoClick = () => {
  if (user) navigate('/app/dashboard')
  else navigate('/login')
}
```

AppLayout에서는 `<div onClick={handleLogoClick}>`, Landing에서는 `<button onClick={handleLogoClick}>`.

## StoreSettings 페이지 — 섹션 순서 (14일차)

사용자가 "현재 설정을 위로 올려"라고 지시. 순서:
1. 현재 설정 (가게 이름, 업종 요약)
2. 가게 정보 수정 (Input + Select + 저장 버튼)
3. 계정 정보 (이메일, 가입일 — 읽기 전용)

저장 버튼 `disabled` 조건에 괄호 주의: `(storeName.trim() === store?.name && storeCategory === store?.category)`

## AppLayout 전체 재작성 패턴 (14일차)

`AppLayout.tsx`를 부분 patch할 때 기존 SVG 아이콘 컴포넌트(DashboardIcon, CustomersIcon 등)가 남아있으면 구조가 깨진다 — 함수 선언이 중복되거나 컴포넌트 스코프가 사라짐.

### 판정 기준

- navItems의 `icon` 필드 타입이 바뀌는 경우 (ReactNode → string 등)
- 기존 SVG 컴포넌트를 제거하는 경우
- `isActive` 함수가 컴포넌트 스코프 밖으로 빠지는 경우

### 해결

부분 patch가 아니라 `write_file`로 전체 파일을 재작성한다. 이모지를 제거하면서 SVG 컴포넌트도 함께 제거할 때 특히 주의.

## 리뷰 분류 기준 (14일차)

외부 코드 리뷰를 받았을 때 수정/놔둘 것 분류 기준:

### 수정 (타당함)
- P0: 핵심 사용자 동선이 막히는 버그 — 라우트 경로, form 제출, 데이터 무결성
- P1: 빌드/배포에 영향 — noEmit, 인덱스, 에러 처리, 테스트 재현성

### 놔둘 것 (MVP 범위 밖)
- Spark 요금제 한계로 인한 것 (Cloud Functions 배포 불가 → 클라이언트 갱신)
- Firestore 필드 단위 read 제한 불가 (원본 전화번호 브라우저 도달)
- 법적 문안 (Phase 2)
- 성능 최적화 (N+1, 경쟁 상태, pagination) — MVP 규모에서 문제 없음
- 접근성 (role/aria) — 데모 단계에서 비필수 (단, ESC 닫기 등 기본 UX는 예외)
- strict mode — 현재 타입 오류 없음
- 미사용 의존성 — 삭제하면 부작용 가능성

### 15일차 분류 업데이트
- Modal backdrop 클릭 버그 → **수정** (UX 동선 막힘)
- Modal 접근성 → **놔둘 것** (데모 단계) 단, ESC 닫기만은 **수정 권장** (키보드 사용자 동선)
- useAuth 에러 콜백 → **수정** (에러 숨김과 동일한 P1 패턴)
- Input id 충돌 → **놔둘 것** (현재 사용처 없음, 잠재적)
- withErrorHandling 미사용 → **놔둘 것** (MVP, 에러 메시지가 toast로 처리됨)
- enrichCustomer updatedAt: null → **수정 권장** (타입 안정성)