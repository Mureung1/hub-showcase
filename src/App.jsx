import { UserProvider } from './context/UserContext.jsx'
import AppRouter from './router.jsx'

function App() {
  return (
    <UserProvider>
      <AppRouter />
    </UserProvider>
  )
}

export default App
