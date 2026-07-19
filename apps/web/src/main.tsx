import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Theme } from '@astryxdesign/core/theme'
import { ToastViewport } from '@astryxdesign/core/Toast'
import './index.css'
import { decisionLogTheme } from './theme.ts'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 브랜드 토큰은 라이트 값만 확정된 상태라 mode를 light로 고정한다 (docs/DESIGN.md 4장) */}
    <Theme theme={decisionLogTheme} mode="light">
      {/* 해소 완료 토스트 표시 영역 (Step 6-6) */}
      <ToastViewport position="bottomEnd">
        {/* 인증 세션(초기 1회 확인) → 라우팅 (SPEC-AUTH-001 2장) */}
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ToastViewport>
    </Theme>
  </StrictMode>,
)
