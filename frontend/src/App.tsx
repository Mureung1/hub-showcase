import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import MainPage from './pages/MainPage'
import StoreDetailPage from './pages/StoreDetailPage'

function App() {
  const location = useLocation()
  const isDetailPage = location.pathname.startsWith('/stores/')

  return (
    <>
      <div hidden={isDetailPage}>
        <MainPage />
      </div>

      <Routes>
        <Route path="/" element={null} />
        <Route path="/stores/:storeId" element={<StoreDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
