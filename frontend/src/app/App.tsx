import LandingPage from '../pages/landing/LandingPage'
import AdminPage from '../pages/admin/AdminPage'

function App() {
  const adminMatch = window.location.pathname.match(/^\/admin\/([^/]+)$/)

  if (adminMatch) {
    return <AdminPage guildId={decodeURIComponent(adminMatch[1])} />
  }

  return <LandingPage />
}

export default App
