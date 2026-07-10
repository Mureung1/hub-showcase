import { Route, Routes } from 'react-router-dom'
import { AppStateProvider } from './state/AppStateContext'
import AppLayout from './components/layout/AppLayout'
import StartPage from './pages/StartPage'
import MainPage from './pages/MainPage'
import SendPage from './pages/SendPage'
import SentPage from './pages/SentPage'
import RecommendPage from './pages/RecommendPage'
import StoragePage from './pages/StoragePage'

function App() {
  return (
    <AppStateProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<StartPage />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/send" element={<SendPage />} />
          <Route path="/sent" element={<SentPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/storage" element={<StoragePage />} />
        </Route>
      </Routes>
    </AppStateProvider>
  )
}

export default App
