export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
};

export type MagicLinkResult = {
  email: string;
};

export interface AuthService {
  isConfigured(): boolean;
  restoreSession(): Promise<AuthSession | null>;
  refreshSession(session: AuthSession): Promise<AuthSession>;
  consumeCallback(hash: string): Promise<AuthSession | null>;
  sendMagicLink(email: string, redirectTo: string): Promise<MagicLinkResult>;
  signOut(session: AuthSession | null): Promise<void>;
}

const STORAGE_KEY = "modu-brain.auth-session.v1";

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
  msg?: string;
  error_description?: string;
};

export class SupabaseRestAuthService implements AuthService {
  private readonly url: string;
  private readonly apiKey: string;

  constructor(config: { url?: string; publishableKey?: string; anonKey?: string } = {}) {
    this.url = (config.url ?? import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
    this.apiKey =
      config.publishableKey ??
      config.anonKey ??
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      import.meta.env.VITE_SUPABASE_ANON_KEY ??
      "";
  }

  isConfigured() {
    return Boolean(this.url && this.apiKey);
  }

  async restoreSession(): Promise<AuthSession | null> {
    const stored = readStoredSession();
    if (!stored) return null;

    if (stored.expiresAt > Date.now() + 60_000) return stored;
    if (!this.isConfigured() || !stored.refreshToken) {
      clearStoredSession();
      return null;
    }

    try {
      return await this.refreshSession(stored);
    } catch {
      return null;
    }
  }

  async refreshSession(session: AuthSession): Promise<AuthSession> {
    if (!this.isConfigured() || !session.refreshToken) {
      clearStoredSession();
      throw new Error("로그인 세션을 갱신할 수 없습니다.");
    }

    try {
      const payload = await this.request<SupabaseAuthResponse>(
        "/auth/v1/token?grant_type=refresh_token",
        { method: "POST", body: JSON.stringify({ refresh_token: session.refreshToken }) },
      );
      return this.persistResponse(payload, session.user);
    } catch (error) {
      clearStoredSession();
      throw error;
    }
  }

  async consumeCallback(hash: string): Promise<AuthSession | null> {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return null;

    const expiresIn = Number(params.get("expires_in") ?? 3600);
    const claims = decodeJwtClaims(accessToken);
    const user = {
      id: typeof claims.sub === "string" ? claims.sub : "",
      email: typeof claims.email === "string" ? claims.email : "",
    };
    if (!user.id) throw new Error("로그인 응답에서 사용자 정보를 확인할 수 없습니다.");

    const session: AuthSession = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
      user,
    };
    writeStoredSession(session);
    return session;
  }

  async sendMagicLink(email: string, redirectTo: string): Promise<MagicLinkResult> {
    if (!this.isConfigured()) {
      throw new Error("Supabase 공개 URL과 publishable key가 구성되지 않았습니다.");
    }

    await this.request<SupabaseAuthResponse>(
      `/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
      method: "POST",
      body: JSON.stringify({
        email,
        create_user: true,
      }),
      },
    );
    return { email };
  }

  async signOut(session: AuthSession | null) {
    clearStoredSession();
    if (!session || !this.isConfigured()) return;

    try {
      await fetch(`${this.url}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    } catch {
      // Local logout remains successful when the remote session is unavailable.
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.url}${path}`, {
      ...init,
      headers: {
        apikey: this.apiKey,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as SupabaseAuthResponse;
    if (!response.ok) {
      throw new Error(
        payload.error_description ?? payload.msg ?? "로그인 요청을 처리하지 못했습니다.",
      );
    }
    return payload as T;
  }

  private persistResponse(payload: SupabaseAuthResponse, fallbackUser: AuthUser) {
    if (!payload.access_token || !payload.refresh_token) {
      throw new Error("세션 갱신 응답이 올바르지 않습니다.");
    }
    const session: AuthSession = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
      user: {
        id: payload.user?.id ?? fallbackUser.id,
        email: payload.user?.email ?? fallbackUser.email,
      },
    };
    writeStoredSession(session);
    return session;
  }
}

function decodeJwtClaims(token: string): Record<string, unknown> {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return {};
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readStoredSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<AuthSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      !parsed.user ||
      typeof parsed.user.id !== "string" ||
      typeof parsed.user.email !== "string"
    ) {
      clearStoredSession();
      return null;
    }
    return parsed as AuthSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

function writeStoredSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export const authService = new SupabaseRestAuthService();
