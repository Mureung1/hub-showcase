import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@astryxdesign/core/theme'
import './index.css'
import { decisionLogTheme } from './theme.ts'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 브랜드 토큰은 라이트 값만 확정된 상태라 mode를 light로 고정한다 (docs/DESIGN.md 4장) */}
    <Theme theme={decisionLogTheme} mode="light">
      <App />
    </Theme>
  </StrictMode>,
)
