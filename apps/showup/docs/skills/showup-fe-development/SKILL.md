---
name: showup-fe-development
description: ShowUp 프론트엔드 개발 워크플로우 — Firebase 연동, RHF+Zod 폼, 타입 처리
category: software-development
---

# ShowUp FE 개발 워크플로우

## 개요

ShowUp 은 소상공인용 노쇼·악성 고객 이력 관리 서비스. Vite + React + TypeScript + Tailwind CSS + Firebase 스택.

## 개발 패턴

### 1. BE 선행 확인

FE 작업 시작 전, BE 세션이 다음을 완료했는지 확인:

- [ ] `src/services/*.ts` — CRUD 서비스 함수
- [ ] `src/hooks/*.ts` — React 훅 (useAuthState 등)
- [ ] `src/types/schema.ts` — 공통 타입 정의
- [ ] `src/utils/*.ts` — 유틸리티 (phone.ts, risk.ts)

**BE 미완료 시**: UI 먼저 mock 으로 제작, 연동은 BE 완료 후

### 2. 폼 개발 (RHF + Zod)

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 6 자 이상입니다'),
})

type FormInput = z.infer<typeof schema>

const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
  resolver: zodResolver(schema),
})
```

### 3. Firebase 연동

```typescript
import { useAuthState } from '@/hooks/useAuth'
import { signIn } from '@/services/auth'

const { user, loading } = useAuthState()

// 서비스 호출
await signIn({ email, password })
```

### 4. 타입 에러 처리

**자주 발생하는 문제**:

1. **import 경로 불일치**
   ```
   Cannot find module '@/hooks/useAuthState'
   → 실제 파일명 확인: useAuth.ts
   ```

2. **RHF useForm optional 필드**
   ```typescript
   // ❌ 오류: SignInInput(required) 에 할당 불가
   await signIn(data)
   
   // ✅ 해결: 명시적 객체 생성
   await signIn({ email: data.email, password: data.password })
   ```

3. **tsbuildinfo 꼬임**
   ```bash
   # .js 파일 + .tsbuildinfo 정리
   rm -f src/**/*.js src/**/*.tsbuildinfo
   ```

4. **Firestore Timestamp → Date 변환 (any 금지)**
   ```typescript
   import type { FirestoreTimestamp } from '@/types/schema'

   function toDateString(value: FirestoreTimestamp): string {
     if (value && typeof value === 'object' && 'toDate' in value) {
       const ts = value as { toDate: () => Date }
       if (typeof ts.toDate === 'function') {
         return ts.toDate().toISOString().split('T')[0]
       }
     }
     return new Date(value as unknown as Date).toISOString().split('T')[0]
   }
   ```
   - `as any` 절대 사용 금지 (P0 버그)
   - `useState<any>` → `useState<CustomerSearchResult>` 등 정식 타입 사용
   - `getCustomer()` 반환형은 `CustomerSearchResult` (not `Customer`)

5. **mock 데이터 제거 시점**
   - Firestore 서비스 연동 완료 후 `src/mock/` 디렉토리 삭제
   - mock 데이터의 `null as any` 가 타입 안전성 저하 원인

### 5. 빌드 설정

`package.json`:
```json
{
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc -b"
  }
}
```

- `vite build` 만 사용 (tsc 선행 제거)
- 타입 체크는 별도 `npm run typecheck` 로

**⚠️ TypeScript/JS 이중 파일 문제 (12일차 발견)**

`.ts` 파일과 `.js` 파일이 동시에 존재하는 경우가 있음. 이는 `tsc` 빌드나 Vite의 타입 체크 시 충돌을 일으킨다.

```bash
# 작업 시작 전 / 커밋 전에 반드시 .js 파일 정리
find apps/showup/src -name '*.js' -delete
# tsbuildinfo 정리
find apps/showup/src -name '*.tsbuildinfo' -delete
```

`.gitignore`에 `*.js` 추가 (vite.config.ts 같은 설정 파일 제외):
```
src/**/*.js
!vite.config.js
!*.config.js
```

git에서 기존 커밋된 `.js` 파일 제거:
```bash
git rm --cached apps/showup/src/**/*.js
```

### 6. 코드 스플리팅 (10 일차 적용)

**React.lazy + Suspense**:
```typescript
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Customers = lazy(() => import('./pages/Customers'))

// Suspense fallback
<Suspense fallback={<div className="text-gray-500">로딩 중...</div>}>
  <Routes>...</Routes>
</Suspense>
```

**Vite manualChunks** (`vite.config.ts`):
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        'ui-vendor': ['@tanstack/react-query', 'react-hook-form', 'zod', '@hookform/resolvers', 'sonner'],
      },
    },
  },
},
```

- 메인 청크: 44KB (gzip 12KB) 으로 감소
- firebase-vendor: 452KB → 별도 캐시

### 7. 접근성

- **키보드 포커스**: `focus-visible` 글로벌 CSS 아웃라인
```css
button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```
- **터치 타겟**: 글로벌 `button, a { min-height: 44px; min-width: 44px; }`

### 7.1 이모지 → SVG 아이콘 교체 패턴 (13 일차 적용)

UI 이모지 금지 규칙(`showup-frontend` §1 참조)의 실제 적용 패턴. 이모지가 남아있는지 정기적으로 스캔:

```
search_files(path="src", pattern="[✅❌🚨⚠️📅🏠👥🚪⭐💡🔄]", target="content")
```

**버튼 텍스트 이모지 교체** (Reservations.tsx, CustomerDetail.tsx):
```tsx
// ❌ 이전
<button>방문 ✅</button>
<button>노쇼 ❌</button>

// ✅ 이후
<button>
  <span className="inline-flex items-center gap-1">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    방문
  </span>
</button>
```

**AppLayout 네비게이션 아이콘 교체**:
- navItems `icon` 필드를 `string` → `ReactNode`로 변경
- 각 아이콘을 별도 SVG 컴포넌트로 정의 (`DashboardIcon`, `CustomersIcon`, `CalendarIcon`, `LogoutIcon`)
- 모바일 하단 네비 + PC 사이드바 모두 `{item.icon}` 으로 직접 렌더링 ( `<span className="text-xl">{item.icon}</span>` 아님)

**타임라인 아이콘 조건부 렌더링** (CustomerDetail.tsx):
- 데이터 배열의 `icon` 필드를 이모지에서 문자열 키(`'calendar'`, `'warning'`)로 변경
- 렌더링 시 조건부 분기:
```tsx
{event.icon === 'warning' ? (
  <svg className="w-5 h-5" ...><path d="M12 9v2m0 4h.01M12 3l9 16H3L12 3z" /></svg>
) : (
  <svg className="w-5 h-5" ...><path d="M8 7V3m8 4V3m-9 8h10M5 21h14..." /></svg>
)}
```

**테스트 파일은 제외**: `*.test.ts` 의 `console.log` 이모지(`✅`/`❌`)는 테스트 출력용이므로 유지. UI 렌더링에만 이모지 금지.

**검증**: 교체 후 `npx eslint .` (warning 0) + `npm run build` (vite build) 반드시 통과 확인.

**⚠️ 사용자가 이모지 사용을 반복적으로 지적함 (14일차에도 발생)**. AppLayout 네비게이션, 버튼, 텍스트 어디든 이모지를 넣지 말 것. "이모지 빼라"는 피드백이 여러 번 나왔으므로, 코드 수정 시 항상 이모지가 들어가지 않았는지 확인하는 습관이 필요하다. 텍스트만 사용한다.

### 8. 라우트 구조 (11 일차 적용)

**공개 라우트 vs 보호된 라우트 분리**:
```typescript
// /  → Landing (서비스 소개, 공개)
// /app/* → ProtectedRoute (대시보드, 고객, 예약)

<Route path="/" element={<Landing />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />

<Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route index element={<Navigate to="/app/dashboard" replace />} />
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="customers" element={<Customers />} />
  ...
</Route>
```

- **모든 내부 링크에 `/app` 접두사 필수**: `to="/app/customers"`, `navigate('/app/dashboard')`
- AppLayout 네비게이션 아이템도 `/app/*` 경로로 설정
- 라우트 변경 시 `grep -rn` 으로 기존 링크 일괄 수정 (`sed` 활용)

### 9. 에러 페이지

- 404: `<Route path="*" element={<NotFound />} />`
- 500: `<Route path="/500" element={<ServerError />} />`
- 대시보드로 돌아가기 링크 포함 (`to="/app/dashboard"`)

### 9.1 AppLayout 네비게이션 주의사항 (12일차)

- **네비게이션 링크는 반드시 `App.tsx`에 존재하는 라우트와 1:1로 매칭되어야 한다**: 존재하지 않는 라우트(예: `/app/more`)로 Link를 걸면 React NotFound 컴포넌트가 렌더링되어 사용자에게 404로 보인다. SPA rewrites가 있어도 라우트 자체가 없으면 NotFound 페이지가 뜬다.
- **로그아웃은 `<Link>`가 아니라 `<button onClick>` + `signOutUser()` 호출이어야 한다**: 단순히 `/login`으로 Link를 걸면 Firebase Auth 세션이 유지된 채 페이지만 이동한다. `signOutUser()` 호출 후 `navigate('/login', { replace: true })` + `toast.success('로그아웃되었습니다')` 패턴을 사용한다.

### 10. riskStats 갱신 — AndRefresh 함수 사용 (11 일차)

**규칙**: 예약 상태 변경 / 사건 기록 시, 원본 함수 + 수동 `refreshCustomerRiskStats` 호출을 직접 조합하지 말고 `@/services/riskRefresh` 의 `*AndRefresh` 함수를 사용한다.

```typescript
// ❌ 이전 방식 (수동 갱신)
import { transitionReservationStatus } from '@/services/reservations'
import { refreshCustomerRiskStats } from '@/services/customers'

await transitionReservationStatus(storeId, resId, nextStatus)
const [incidents, reservations] = await Promise.all([...])
await refreshCustomerRiskStats(storeId, customerId, reservations, incidents)

// ✅ AndRefresh 방식
import { transitionReservationStatusAndRefresh, createIncidentAndRefresh } from '@/services/riskRefresh'

// 예약 상태 변경 + riskStats 자동 갱신
await transitionReservationStatusAndRefresh(storeId, customerId, resId, nextStatus)

// 사건 기록 + riskStats 자동 갱신
await createIncidentAndRefresh(storeId, customerId, incidentId, input)
```

**주의**: `transitionReservationStatusAndRefresh` 는 `customerId` 파라미터가 원본 함수보다 하나 더 필요하다 (두 번째 인자). `Reservations.tsx` 의 `handleStatusChange` 도 `(resId, customerId, nextStatus)` 3-arg 시그니처로 변경하고 버튼 onClick 에 `res.customerId` 를 전달해야 한다.

**CustomerDetail.tsx 주의**: `handleStatusChange` 에서 `transitionReservationStatusAndRefresh(user.uid, id, id, nextStatus)` 로 호출 — `id` 가 customerId 겸 resId 로 사용되는 경우가 있으니 실제 reservation ID 와 customer ID 를 정확히 구분해서 전달할 것.

### 11. 커밋 규칙

- **의미 있는 작업 단위**마다 자동 커밋
- 커밋 메시지 접두어: `FE-`
- 예: `FE- 고객 등록 폼 + 검색 기능 연동`

## 검증 시나리오

### 고객 등록 폼
1. `/customers/new` 접근
2. 이름 (2 자 이상) + 전화번호 (010-xxxxxxxx) 입력
3. "등록" 클릭
4. 중복 전화번호 → 모달 표시 (기존 고객 안내)
5. 신규 고객 → toast 성공 + `/customers` 리다이렉트

### 고객 검색
1. `/customers` 접근
2. 전화번호 뒤 4 자리 또는 이름 입력
3. 300ms debounce 후 검색
4. 결과 목록 표시 (이름 + 마스킹 번호 + RiskBadge)
5. 위험 조건 (노쇼 3 회+ 또는 abuse 1 회+) → 경고 배너 자동 표시

## LEAD 전수조사 워크플로우 (15일차)

LEAD 세션에서 "파일 전부 확인해보고 아직 안된거 찾아서 가져와라" 지시 시:

1. **기본 검증 먼저**: `npm run typecheck && npm run lint && npm run build` + 단위 테스트 (risk/phone/search/seed) + **Firestore Rules 회귀 테스트** (`npm run verify:security` — Firebase 에뮬레이터 기반 18개 시나리오, `security/smoke-test.mjs`). 에뮬레이터가 실행 중이어야 함 (`firebase emulators:start --only firestore` 백그라운드). 전부 통과 확인 후 진입.
2. **병렬 서브에이전트 분할 리뷰**: `delegate_task`로 3개 배치:
   - 1군 (pages + components): App.tsx, main.tsx, pages/*.tsx, components/*.tsx, components/ui/*.tsx
   - 2군 (services + lib + hooks + utils + types): services/*.ts, lib/*.ts, hooks/*.ts, utils/*.ts, types/schema.ts
   - 3군 (seeds + functions + config + rules): seeds/*.ts, functions/src/*.ts, firestore.rules, security/smoke-test.mjs, *.config.*, firebase.json
   - 각 서브에이전트에 "파일별 이슈 있으면 파일명:라인:내용 형태 보고, 없으면 '이슈 없음' 명시" 지시. 한국어 보고 지시.
3. **보고 형식**: 즉시 수정 권장 / 성능·리팩토링 권장 / 경미·확인 권장 / 이슈 없음 4분류 표.
4. **발견 패턴**: `references/p0-bug-patterns-and-review-checklist.md`의 "15일차 전수조사 발견분" 섹션에 정리됨. 재조사 시 이 섹션을 먼저 읽고 동일 이슈 재확인.

### 전수조사에서 발견된 공통 이슈 (15일차)

- **Modal backdrop 클릭 안 됨** — wrapper div가 backdrop 가림, `onClick={onClose}`가 안 닿음. 수정: wrapper에 onClick 추가 + 패널 `stopPropagation`.
- **Modal 접근성** — `role="dialog"`, `aria-modal`, ESC 닫기, 포커스 트랩 전부 없음. 데모 단계 비필수 단 ESC 닫기는 권장.
- **Input id 충돌** — 동일 label 시 같은 id 생성. `useId()` 권장.
- **useAuth 에러 콜백** — `onAuthStateChanged` 에러 콜백 누락, 인증 실패 시 `state.error` 미갱신.
- **Reservations.tsx DRY 위반** — `handleStatusChange` 후 재로드 로직이 useEffect와 중복.
- **enrichCustomer updatedAt: null** — `RiskStats.updatedAt`은 null 불가인데 기본값이 null. 타입 불일치.

## 참고

- **전화번호 마스킹**: `maskPhone()` 함수만 사용 (원본 노출 금지)
- **debounce**: 300ms (useEffect + setTimeout/clearTimeout)
- **모달**: `Modal` 컴포넌트 사용 (isOpen/onClose/title/footer)
- **toast**: `toast.success()`, `toast.error()`
- **코드 스플리팅 & 접근성 상세**: `references/code-splitting-and-a11y.md` 참조
- **라우트 구조 & 랜딩 페이지**: `references/route-structure-and-lading.md` 참조
- **riskStats 갱신 패턴**: 위 §10 참조 — `@/services/riskRefresh` 의 `*AndRefresh` 함수 사용
- **Firebase Hosting SPA 배포 + stores 문서 누락 + 브라우저 자동화 한계**: `references/firebase-hosting-spa-deployment.md` 참조 — firebase.json rewrites, Login.tsx stores 안전장치, CDP RHF 폼 테스트 한계, AppLayout 로그아웃 button 패턴
- **P0 버그 패턴 + 코드 리뷰 체크리스트**: `references/p0-bug-patterns-and-review-checklist.md` 참조 — 라우트 경로 불일치, Modal form submit, 중복 고객 검사, noEmit 함정, 인덱스 누락, 에러 숨김, .env symlink, 15일차 전수조사 발견분 (Modal backdrop, 접근성, Input id 충돌, useAuth 에러 콜백, DRY 위반, updatedAt 타입 불일치)
