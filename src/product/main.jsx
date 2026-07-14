import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import ProductPage from './pages/ProductPage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProductPage />
  </StrictMode>,
)
