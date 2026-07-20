import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { apiTeamFlowRepository } from './data/apiTeamFlowRepository.js'
import { TeamFlowProvider } from './state/TeamFlowProvider.jsx'
import './styles/tokens.css'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TeamFlowProvider repository={apiTeamFlowRepository}>
        <App />
      </TeamFlowProvider>
    </BrowserRouter>
  </StrictMode>,
)
