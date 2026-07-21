import { UserProvider } from './context/UserContext.jsx'
import AppRouter from './router.jsx'
import { useAndroidBackButton } from './lib/useAndroidBackButton.js'

function App() {
  // 안드로이드 앱(Capacitor)에서만 동작 — 웹에서는 no-op.
  useAndroidBackButton()
  return (
    <UserProvider>
      <AppRouter />
    </UserProvider>
  )
}

export default App
