import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from "../api/auth";
import { SESSION_EXPIRED_EVENT } from "../api/httpClient";
import supabaseClient from "../api/supabaseClient";
import { routePaths } from "../routes/routePaths";
import { clearAccessToken, getAccessToken, getRefreshToken } from "../utils/authStorage";

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
        supabaseClient?.auth.setSession({
          access_token: getAccessToken(),
          refresh_token: getRefreshToken(),
        });
      })
      .catch(() => {
        clearAccessToken();
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
    const { accessToken, refreshToken, user } = response.data;

    setCurrentUser(user);
    supabaseClient?.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // 로그아웃 API 호출이 실패해도 로컬 인증 상태는 항상 정리한다.
    } finally {
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
