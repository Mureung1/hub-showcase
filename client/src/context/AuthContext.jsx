import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from "../api/auth";
import { SESSION_EXPIRED_EVENT } from "../api/httpClient";
import { routePaths } from "../routes/routePaths";
import { clearAccessToken, clearCurrentUserRole, getAccessToken, setCurrentUserRole } from "../utils/authStorage";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsCheckingAuth(false);
      return;
    }

    getCurrentUser()
      .then((response) => {
        setCurrentUser(response.data);
        setCurrentUserRole(response.data.role);
      })
      .catch(() => {
        clearAccessToken();
        clearCurrentUserRole();
        setCurrentUser(null);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      navigate(routePaths.landingLogin, {
        replace: true,
        state: { message: "세션이 만료되었습니다. 다시 로그인해 주세요." },
      });
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [navigate]);

  const login = useCallback(async (credentials) => {
    const response = await loginRequest(credentials);
    const user = response.data.user;

    setCurrentUser(user);
    setCurrentUserRole(user.role);

    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // 로그아웃 API 호출이 실패해도 로컬 인증 상태는 항상 정리한다.
    } finally {
      clearCurrentUserRole();
      setCurrentUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isCheckingAuth,
      login,
      logout,
    }),
    [currentUser, isCheckingAuth, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
