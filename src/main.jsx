import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 진입점: #root 에 <App/> 를 그린다. (CSR — 브라우저가 JS로 화면 생성)
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
