export type AuthUser = {
  id: string;
  email: string;
};

export const COOKIE_SESSION_SENTINEL = "modu-brain-cookie-session" as const;

export type AuthSession = {
  accessToken: typeof COOKIE_SESSION_SENTINEL;
  expiresAt: number;
  user: AuthUser;
};

export type MagicLinkResult = {
  email: string;
};

export class AuthRequestError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface AuthService {
  isConfigured(): boolean;
  restoreSession(): Promise<AuthSession | null>;
  refreshSession(session: AuthSession): Promise<AuthSession>;
  consumeCallback(hash: string): Promise<AuthSession | null>;
  sendMagicLink(
    email: string,
    redirectTo: string,
    captchaToken?: string,
  ): Promise<MagicLinkResult>;
  signOut(session: AuthSession | null): Promise<void>;
}

const LEGACY_STORAGE_KEY = "modu-brain.auth-session.v1";

type SessionEnvelope = {
  data?: {
    user?: { id?: string; email?: string | null };
    expiresAt?: number;
  };
  error?: {
    message?: string;
  };
};

export class SupabaseRestAuthService implements AuthService {
  private readonly url: string;
  private readonly apiKey: string;
  private callbackExchange: Promise<AuthSession | null> | null = null;

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
    clearLegacyTokenStorage();
    return this.requestSession("/api/v1/auth/session", { method: "GET" }, true);
  }

  async refreshSession(session: AuthSession): Promise<AuthSession> {
    void session;
    clearLegacyTokenStorage();
    const refreshed = await this.requestSession("/api/v1/auth/refresh", { method: "POST" });
    if (!refreshed) throw new Error("The login session could not be refreshed.");
    return refreshed;
  }

  async consumeCallback(hash: string): Promise<AuthSession | null> {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const callbackError = params.get("error_code") || params.get("error");
    if (callbackError) {
      clearSensitiveAuthFragment();
      clearLegacyTokenStorage();
      throw new AuthRequestError(callbackErrorMessage(callbackError), 400);
    }
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken && !refreshToken) return this.callbackExchange;

    clearSensitiveAuthFragment();
    clearLegacyTokenStorage();
    if (!accessToken || !refreshToken) {
      throw new Error("The login callback did not contain a complete session.");
    }
    const expiresIn = Number(params.get("expires_in") ?? 3600);
    if (this.callbackExchange) return this.callbackExchange;
    const exchange = this.requestSession("/api/v1/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken, expiresIn }),
    });
    this.callbackExchange = exchange;
    void exchange.then(
      () => this.clearCallbackExchangeLater(exchange),
      () => this.clearCallbackExchangeLater(exchange),
    );
    const session = await exchange;
    if (!session) throw new Error("The login session could not be created.");
    return session;
  }

  async sendMagicLink(
    email: string,
    redirectTo: string,
    captchaToken?: string,
  ): Promise<MagicLinkResult> {
    if (!this.isConfigured()) {
      throw new Error("Supabase public URL and publishable key are not configured.");
    }

    const response = await fetch("/api/v1/auth/magic-link", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as SessionEnvelope;
    if (!response.ok) {
      throw new AuthRequestError(
        payload.error?.message ?? "The login request failed.",
        response.status,
        retryAfter(response),
      );
    }
    return { email };
  }

  async signOut(session: AuthSession | null) {
    void session;
    this.callbackExchange = null;
    clearLegacyTokenStorage();
    const response = await fetch("/api/v1/auth/session", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (response.ok) return;
    const payload = (await response.json().catch(() => ({}))) as SessionEnvelope;
    throw new AuthRequestError(
      payload.error?.message ?? "The login session could not be cleared.",
      response.status,
      retryAfter(response),
    );
  }

  private async requestSession(
    path: string,
    init: RequestInit,
    allowMissing = false,
  ): Promise<AuthSession | null> {
    const response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as SessionEnvelope;
    if (allowMissing && response.status === 401) return null;
    if (!response.ok) {
      throw new AuthRequestError(
        payload.error?.message ?? "The login session request failed.",
        response.status,
        retryAfter(response),
      );
    }
    const user = payload.data?.user;
    const expiresAt = payload.data?.expiresAt;
    if (!user?.id || typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
      throw new Error("The login session response is invalid.");
    }
    return {
      accessToken: COOKIE_SESSION_SENTINEL,
      expiresAt,
      user: {
        id: user.id,
        email: typeof user.email === "string" ? user.email : "",
      },
    };
  }

  private clearCallbackExchangeLater(exchange: Promise<AuthSession | null>) {
    setTimeout(() => {
      if (this.callbackExchange === exchange) this.callbackExchange = null;
    }, 0);
  }
}

function clearSensitiveAuthFragment() {
  if (typeof window === "undefined") return;
  const cleanUrl = `${window.location.pathname}${window.location.search}` || "/";
  window.history.replaceState(window.history.state, "", cleanUrl);
}

function clearLegacyTokenStorage() {
  for (const storage of [
    typeof localStorage === "undefined" ? null : localStorage,
    typeof sessionStorage === "undefined" ? null : sessionStorage,
  ]) {
    try {
      storage?.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // A blocked storage API must not prevent the HttpOnly-cookie session.
    }
  }
}

function retryAfter(response: Response) {
  const value = Number(response.headers?.get?.("Retry-After") ?? NaN);
  return Number.isFinite(value) ? value : null;
}

function callbackErrorMessage(code: string) {
  if (code === "otp_expired") {
    return "로그인 링크가 만료되었습니다. 새 링크를 요청해 주세요.";
  }
  if (code === "access_denied") {
    return "로그인 링크를 사용할 수 없습니다. 새 링크를 요청해 주세요.";
  }
  return "로그인을 완료할 수 없습니다. 새 링크를 요청해 주세요.";
}

export const authService = new SupabaseRestAuthService();
