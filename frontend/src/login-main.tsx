import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './pages/Login'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element를 찾을 수 없습니다.')
}

createRoot(root).render(
  <StrictMode>
    <Login />
  </StrictMode>,
)
