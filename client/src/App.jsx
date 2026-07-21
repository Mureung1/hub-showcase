import { AuthProvider, useAuth } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";

function AppShell() {
  const { isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return null;
  }

  return <AppRoutes />;
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
