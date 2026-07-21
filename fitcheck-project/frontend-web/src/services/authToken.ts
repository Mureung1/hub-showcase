const AUTH_TOKEN_KEY = 'fitcheck-access-token';

/** Supabase access token for authenticated API calls (optional until login UI exists). */
export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(AUTH_TOKEN_KEY);
    if (stored?.trim()) return stored.trim();
  }

  const envToken = import.meta.env.VITE_SUPABASE_ACCESS_TOKEN;
  if (typeof envToken === 'string' && envToken.trim()) {
    return envToken.trim();
  }

  return null;
}

export function setAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token?.trim()) {
    localStorage.setItem(AUTH_TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}
