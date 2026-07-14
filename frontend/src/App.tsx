import { useState } from 'react';
import { AuthForm } from './components/AuthForm';
import type { AuthUser, LoginResponse } from './api/auth';

const STORAGE_KEY = 'gc_auth';

interface StoredAuth {
  token: string;
  user: AuthUser;
}

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function App() {
  const [auth, setAuth] = useState<StoredAuth | null>(loadStoredAuth);

  function handleLoggedIn(result: LoginResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setAuth(result);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }

  return (
    <div className="phone center-screen">
      {auth ? (
        <>
          <h1 className="heading" style={{ fontSize: 22 }}>
            환영합니다, {auth.user.name || auth.user.email}
          </h1>
          <p className="sub">{auth.user.email}</p>
          <button className="btn" type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </>
      ) : (
        <AuthForm onLoggedIn={handleLoggedIn} />
      )}
    </div>
  );
}

export default App;
