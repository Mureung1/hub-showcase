# Firebase Hosting SPA 배포 + 브라우저 자동화 테스트 노트

> 2026-07-24 ShowUp 12일차 LEAD 세션에서 얻은 실전 패턴.

## firebase.json SPA rewrites 필수

### 문제

Firebase Hosting에 SPA(React Router)를 배포할 때 `firebase.json`에 `rewrites`가 없으면, 클라이언트 사이드 라우트(`/login`, `/app/customers` 등)로 직접 접속 시 404가 뜬다.

### 원인

Firebase Hosting은 정적 파일 서버다. `/login` 경로에 물리적 파일이 없으면 404를 반환한다. SPA는 모든 경로를 `index.html`로 보내서 React Router가 처리해야 한다.

### 해결

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

배포: `npx firebase deploy --only hosting`

### 주의

- `rewrites`가 있어도 **라우트 자체가 없는 경로**(예: `/app/more`)는 React NotFound 컴포넌트가 렌더링된다. HTTP 404가 아니라 SPA 404다.
- `curl -s -o /dev/null -w "%{http_code}"`로 확인하면 200이 나오지만, 브라우저에서는 NotFound 페이지가 보인다.

## stores/{uid} 문서 누락 → 모든 하위 컬렉션 403

### 문제

회원가입은 되지만 고객 등록/조회/예약 생성이 전부 실패. Firestore Security Rules의 `isStoreOwner(storeId)`가 `get(stores/{storeId}).data.ownerUid == auth.uid`를 검사하는데, `stores` 문서가 없으면 `get()`이 실패하고 모든 하위 컬렉션 접근이 403으로 차단된다.

### 원인

`signUp()` 함수에서 `createUserWithEmailAndPassword`는 성공했지만, 이어지는 `createStore()`이 실패하거나 실행되지 않았다. Auth 계정만 만들어지고 `stores/{uid}` 문서는 없는 상태가 된다.

### 해결: Login.tsx 안전장치

로그인 성공 후 `stores` 문서 존재 여부를 확인하고, 없으면 자동 생성:

```typescript
const user = await signIn({ email: data.email, password: data.password })

// 안전장치: stores 문서가 없으면 자동 생성
const existing = await getStore(user.uid)
if (!existing) {
  await createStore(user.uid, {
    ownerUid: user.uid,
    name: user.displayName || '가게',
    category: 'etc',
  })
}

toast.success('로그인되었습니다')
navigate('/app/dashboard')
```

### Firestore REST API로 직접 확인

브라우저 콘솔에서 `stores` 문서 존재 여부 확인:

```javascript
// Auth 토큰 가져오기 (IndexedDB에서)
const authData = await new Promise((resolve) => {
  const req = indexedDB.open('firebaseLocalStorageDb')
  req.onsuccess = (e) => {
    const db = e.target.result
    const tx = db.transaction('firebaseLocalStorage', 'readonly')
    tx.objectStore('firebaseLocalStorage').getAll().onsuccess = (ev) => resolve(ev.target.result)
  }
})
const uid = authData[0].value.uid
const token = authData[0].value.stsTokenManager.accessToken

// stores/{uid} 조회
const resp = await fetch(
  `https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/documents/stores/${uid}`
)
// 403 = 문서 없음 또는 권한 없음
```

## 브라우저 자동화(CDP)로 RHF 폼 테스트 한계

### 문제

`browser_type` + `browser_click`으로 React Hook Form의 submit 버튼을 클릭해도 폼이 제출되지 않는다. `form.requestSubmit()`와 `form.dispatchEvent(new Event('submit'))`도 RHF의 `handleSubmit` 핸들러를 트리거하지 못한다.

### 원인

RHF는 폼의 `onsubmit` 이벤트 핸들러로 `handleSubmit`을 등록한다. CDP의 `browser_type`은 React의 synthetic event를 완전히 발생시키지 않아서 RHF가 input 값을 인식하지 못할 수 있다.

### 대안

1. **Native value setter + input event**:
```javascript
const ns = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
ns.call(input, 'value')
input.dispatchEvent(new Event('input', { bubbles: true }))
```

2. **Firestore REST API로 직접 데이터 생성**: 브라우저 자동화로 안 될 때는 REST API로 우회.

3. **실제 사용자 클릭으로 테스트**: 브라우저 자동화는 입력과 클릭을 시뮬레이션하지만, RHF + Zod 검증 플로우는 실제 사용자 클릭과 다를 수 있다. 최종 검증은 실제 브라우저에서 직접 해야 한다.

## AppLayout 로그아웃 — Link vs button

### 문제

`AppLayout.tsx`에서 로그아웃을 `<Link to="/login">`로 하면 Firebase Auth 세션이 유지된 채 페이지만 이동한다. 사용자가 "로그아웃"했지만 실제로는 안 로그아웃된다.

### 해결

```typescript
import { signOutUser } from '@/services/auth'

const handleLogout = async () => {
  try {
    await signOutUser()
    toast.success('로그아웃되었습니다')
    navigate('/login', { replace: true })
  } catch {
    toast.error('로그아웃 실패')
  }
}

// <button onClick={handleLogout}> 사용, <Link to="/login"> 사용 금지
```

### 네비게이션 링크는 라우트와 1:1 매칭

`AppLayout` 네비게이션에서 `/app/more`로 Link를 걸었지만 `App.tsx`에 해당 라우트가 없으면 React NotFound가 렌더링된다. 모든 네비게이션 링크는 `App.tsx`의 `<Route>`와 1:1로 매칭되어야 한다. 없는 라우트는 네비게이션에서 제거한다.