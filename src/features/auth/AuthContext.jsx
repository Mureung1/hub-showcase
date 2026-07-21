import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, login as loginApi, logout as logoutApi, signup as signupApi } from "../../api/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(employeeNo, password) {
    const loggedInUser = await loginApi({ employeeNo, password });
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function signup(payload) {
    return signupApi(payload);
  }

  async function logout() {
    await logoutApi();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
