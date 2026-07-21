import { useEffect, useState } from "react";
import { getCurrentUser } from "./api/auth";
import AppRoutes from "./routes/AppRoutes";
import { clearAccessToken, clearCurrentUserRole, getAccessToken, setCurrentUserRole } from "./utils/authStorage";

function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsRestoringSession(false);
      return;
    }

    getCurrentUser()
      .then((response) => {
        setCurrentUserRole(response.data.role);
      })
      .catch(() => {
        clearAccessToken();
        clearCurrentUserRole();
      })
      .finally(() => {
        setIsRestoringSession(false);
      });
  }, []);

  if (isRestoringSession) {
    return null;
  }

  return <AppRoutes />;
}

export default App;
