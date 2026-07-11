import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseRestAuthService } from "./auth";

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("SupabaseRestAuthService", () => {
  it("requests a passwordless link with the configured redirect", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(authResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const service = new SupabaseRestAuthService({
      url: "https://demo.supabase.co/",
      publishableKey: "publishable",
    });

    await expect(service.sendMagicLink("team@example.com", "https://demo.example/login")).resolves.toEqual({ email: "team@example.com" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://demo.supabase.co/auth/v1/otp?redirect_to=https%3A%2F%2Fdemo.example%2Flogin",
    );
    expect(init?.headers).toEqual(expect.objectContaining({ apikey: "publishable" }));
    expect(init?.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "team@example.com",
      create_user: true,
    });
  });

  it("consumes and persists the Supabase hash session", async () => {
    const service = new SupabaseRestAuthService({ url: "https://demo.supabase.co", anonKey: "anon" });
    const jwt = tokenFor({ sub: "user-1", email: "team@example.com" });
    const session = await service.consumeCallback(`#access_token=${jwt}&refresh_token=refresh&expires_in=3600`);

    expect(session).toMatchObject({ accessToken: jwt, refreshToken: "refresh", user: { id: "user-1", email: "team@example.com" } });
    await expect(service.restoreSession()).resolves.toMatchObject({ accessToken: jwt });
  });

  it("does not consume the read-only share fragment", async () => {
    const service = new SupabaseRestAuthService({ url: "https://demo.supabase.co", anonKey: "anon" });
    await expect(service.consumeCallback("#token=share-secret")).resolves.toBeNull();
  });

  it("refreshes with only the publishable apikey and persists the replacement session", async () => {
    const service = new SupabaseRestAuthService({
      url: "https://demo.supabase.co",
      publishableKey: "publishable",
    });
    const session = await service.consumeCallback(
      `#access_token=${tokenFor({ sub: "user-1", email: "team@example.com" })}&refresh_token=old-refresh&expires_in=60`,
    );
    if (!session) throw new Error("expected session");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      authResponse({
        access_token: tokenFor({ sub: "user-1", email: "team@example.com" }),
        refresh_token: "new-refresh",
        expires_in: 3600,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(service.refreshSession(session)).resolves.toMatchObject({
      refreshToken: "new-refresh",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://demo.supabase.co/auth/v1/token?grant_type=refresh_token");
    expect(init?.headers).toEqual(expect.objectContaining({ apikey: "publishable" }));
    expect(init?.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "old-refresh" });
  });

  it("clears the persisted session when refresh fails", async () => {
    const service = new SupabaseRestAuthService({
      url: "https://demo.supabase.co",
      publishableKey: "publishable",
    });
    const session = await service.consumeCallback(
      `#access_token=${tokenFor({ sub: "user-1", email: "team@example.com" })}&refresh_token=expired&expires_in=60`,
    );
    if (!session) throw new Error("expected session");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        authResponse({ error_description: "refresh token expired" }, 401),
      ),
    );

    await expect(service.refreshSession(session)).rejects.toThrow("refresh token expired");
    await expect(service.restoreSession()).resolves.toBeNull();
  });
});

function tokenFor(payload: Record<string, string>) {
  return `header.${btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}.signature`;
}

function authResponse(payload: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(payload) } as unknown as Response;
}
