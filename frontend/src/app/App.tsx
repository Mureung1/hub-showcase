import LandingPage from '../pages/landing/LandingPage'
import AdminPage from '../pages/admin/AdminPage'

function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPage />
  }

  return <LandingPage />
}

export default App
