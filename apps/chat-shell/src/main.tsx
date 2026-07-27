import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.js'
import { PreparedWorkspaceApp } from './prepared-workspace-app.js'
import './index.css'

const root = document.getElementById('root')

if (!root) throw new Error('Chat Shell root element is missing')

createRoot(root).render(
  <StrictMode>
    {import.meta.env.VITE_AY_PLE_LEGACY_E2E === '1' ? (
      <App />
    ) : (
      <PreparedWorkspaceApp />
    )}
  </StrictMode>,
)
