import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { resolveBrowserSupabaseClient } from './auth/supabaseClient.js'
import './styles/tokens.css'
import './styles/global.css'

const { client, configError } = resolveBrowserSupabaseClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider client={client} configError={configError}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
