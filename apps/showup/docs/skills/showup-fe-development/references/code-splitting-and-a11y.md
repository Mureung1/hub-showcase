# Code Splitting & Accessibility (10 일차 적용)

## 코드 스플리팅

### 문제
단일 청크 804KB (gzip 211KB) — 초기 로딩 느림

### 해결

1. **React.lazy + Suspense** (App.tsx)
```typescript
import { lazy, Suspense } from 'react'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
// ... 모든 페이지 lazy

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-gray-500">로딩 중...</div>
  </div>
)

// 사용
<Suspense fallback={<PageFallback />}>
  <Routes>...</Routes>
</Suspense>
```

2. **Vite manualChunks** (vite.config.ts)
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

### 결과
- 메인 청크: 44KB (gzip 12KB)
- react-vendor: 162KB (gzip 53KB)
- firebase-vendor: 452KB (gzip 106KB)
- ui-vendor: 144KB (gzip 40KB)
- 각 vendor 청크 별도 캐싱 → 재방문 시 로딩 개선

## 접근성

### 키보드 포커스 (index.css)
```css
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

### 터치 타겟 (index.css)
```css
button, a {
  min-height: 44px;
  min-width: 44px;
}
```

### 에러 페이지
- `NotFound.tsx`: 404 — 대시보드 링크
- `ServerError.tsx`: 500 — 대시보드 링크
- 라우트: `path="*"` (404), `path="/500"` (500)

## 보안 UI 체크리스트

- [ ] 전화번호 원본 노출 0건 (`phoneMasked` 만 사용)
- [ ] `phoneLast4` 직접拼接 금지 (`010-****-{phoneLast4}` → `phoneMasked`)
- [ ] 동의 체크박스 [필수] 검증 (Register.tsx)
- [ ] RiskAlertBanner SVG 아이콘 (이모지 금지)