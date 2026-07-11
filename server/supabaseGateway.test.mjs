// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createPostgrestClient, createSupabaseGateway } from "./supabaseGateway.mjs";

describe("Supabase gateway", () => {
  it("verifies a bearer token with Auth and creates scoped PostgREST clients", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { id: "user-1", email: "a@example.com" }));
    const gateway = createSupabaseGateway({
      url: "https://project.supabase.co/",
      publishableKey: "publishable-key",
      secretKey: "opaque-service-key-for-tests",
      fetch: fetchMock,
    });
    const user = await gateway.authenticate("access-token");
    expect(user).toEqual({ id: "user-1", email: "a@example.com", accessToken: "access-token" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/user",
      expect.objectContaining({ headers: { apikey: "publishable-key", Authorization: "Bearer access-token" } }),
    );

    fetchMock.mockResolvedValue(response(200, []));
    await gateway.forUser("access-token").request("projects?select=id");
    await gateway.asServiceRole().request("projects?select=id");
    expect(fetchMock.mock.calls.at(-2)[1].headers.Authorization).toBe("Bearer access-token");
    expect(fetchMock.mock.calls.at(-1)[1].headers.apikey).toBe("opaque-service-key-for-tests");
    expect(fetchMock.mock.calls.at(-1)[1].headers).not.toHaveProperty("Authorization");
  });

  it("rejects missing/invalid tokens and unavailable auth without leaking upstream bodies", async () => {
    const gateway = createSupabaseGateway({
      url: "https://project.supabase.co",
      anonKey: "anon",
      fetch: vi.fn().mockResolvedValue(response(401, { message: "secret jwt detail" })),
    });
    await expect(gateway.authenticate()).rejects.toMatchObject({ status: 401, code: "AUTH_REQUIRED" });
    await expect(gateway.authenticate("bad")).rejects.toMatchObject({
      status: 401,
      code: "INVALID_ACCESS_TOKEN",
    });

    const unavailable = createSupabaseGateway({
      url: "https://project.supabase.co",
      anonKey: "anon",
      fetch: vi.fn().mockRejectedValue(new Error("network secret")),
    });
    await expect(unavailable.authenticate("token")).rejects.toMatchObject({
      status: 503,
      code: "AUTH_SERVICE_UNAVAILABLE",
    });
  });

  it("reports missing deployment configuration", () => {
    const gateway = createSupabaseGateway({ url: "", publishableKey: "", secretKey: "" });
    expect(() => gateway.assertConfigured()).toThrow(expect.objectContaining({ code: "DATABASE_NOT_CONFIGURED" }));
    const partial = createSupabaseGateway({
      url: "https://project.supabase.co",
      publishableKey: "publishable",
    });
    expect(() => partial.asServiceRole()).toThrow(
      expect.objectContaining({ details: { missing: ["SUPABASE_SECRET_KEY"] } }),
    );
  });

  it("keeps legacy JWT service-role keys in Authorization while opaque secrets use apikey only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, []));
    const gateway = createSupabaseGateway({
      url: "https://project.supabase.co",
      anonKey: "legacy-anon",
      serviceRoleKey: "header.payload.signature",
      fetch: fetchMock,
    });
    await gateway.asServiceRole().request("projects?select=id");
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      apikey: "header.payload.signature",
      Authorization: "Bearer header.payload.signature",
    });
  });
});

describe("PostgREST client", () => {
  it("sends JSON with return preferences and parses successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(201, [{ id: "one" }]));
    const client = createPostgrestClient({
      url: "https://project.supabase.co",
      apiKey: "anon",
      accessToken: "jwt",
      fetchImpl: fetchMock,
    });
    await expect(
      client.request("projects", { method: "POST", body: { title: "x" }, prefer: "return=representation" }),
    ).resolves.toEqual([{ id: "one" }]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ title: "x" }),
      headers: expect.objectContaining({ Prefer: "return=representation", "Content-Type": "application/json" }),
    });
  });

  it.each([
    [400, { message: "IDEMPOTENCY_CONFLICT" }, 409, "IDEMPOTENCY_CONFLICT"],
    [400, { message: "RUN_NOT_ANNOTATABLE" }, 409, "RUN_NOT_ANNOTATABLE"],
    [400, { message: "INVALID_ANNOTATION_TARGET" }, 400, "INVALID_ANNOTATION"],
    [400, { message: "ANNOTATION_TARGET_NOT_FOUND" }, 400, "INVALID_ANNOTATION"],
    [400, { message: "ANALYSIS_ARTIFACT_IMMUTABLE" }, 409, "ANALYSIS_ARTIFACT_IMMUTABLE"],
    [409, { code: "23505" }, 409, "ANALYSIS_ALREADY_RUNNING"],
    [400, { message: "INVALID_SOURCE_SELECTION" }, 400, "INVALID_SOURCE_SELECTION"],
    [400, { message: "RATE_LIMITED" }, 429, "RATE_LIMITED"],
    [400, { message: "INVALID_SOURCE_SEGMENT_TEXT" }, 400, "INVALID_CONTEXT_IMPORT"],
    [400, { message: "IMPORTED_SOURCE_IMMUTABLE" }, 409, "IMPORTED_SOURCE_IMMUTABLE"],
    [406, { code: "PGRST116" }, 404, "NOT_FOUND"],
    [404, { code: "PGRST205" }, 503, "DATABASE_UNAVAILABLE"],
    [404, { message: "missing API route" }, 503, "DATABASE_UNAVAILABLE"],
    [403, { code: "42501" }, 404, "NOT_FOUND"],
    [500, { message: "postgres unavailable secret" }, 503, "DATABASE_UNAVAILABLE"],
    [400, { message: "constraint" }, 400, "DATABASE_REQUEST_REJECTED"],
  ])("maps PostgREST %i to a stable API error", async (status, payload, expectedStatus, code) => {
    const client = createPostgrestClient({
      url: "https://project.supabase.co",
      apiKey: "anon",
      accessToken: "jwt",
      fetchImpl: vi.fn().mockResolvedValue(response(status, payload)),
    });
    await expect(client.request("rpc/test")).rejects.toMatchObject({ status: expectedStatus, code });
  });

  it("maps network failures to database unavailability", async () => {
    const client = createPostgrestClient({
      url: "https://project.supabase.co",
      apiKey: "anon",
      accessToken: "jwt",
      fetchImpl: vi.fn().mockRejectedValue(new Error("socket failed")),
    });
    await expect(client.request("projects")).rejects.toMatchObject({
      status: 503,
      code: "DATABASE_UNAVAILABLE",
    });
  });
});

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => (payload === undefined ? "" : JSON.stringify(payload)),
  };
}
