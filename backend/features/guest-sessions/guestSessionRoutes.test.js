import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../server.js";

const servers = [];
const pepper = "test-only-pepper-with-at-least-32-characters";
const fixedNow = new Date("2026-07-29T03:00:00.000Z");

async function startServer(guestSessionOptions) {
  const app = createApp({
    guestSessionOptions: {
      pepper,
      now: () => fixedNow,
      purgeExpiredSessions: vi.fn(async () => undefined),
      ...guestSessionOptions
    },
    rateLimitOptions: { limit: 1000 }
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}/api/guest-sessions`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});

describe("guest session API", () => {
  it("returns a recovery key once and stores only its hash", async () => {
    const purgeExpiredSessions = vi.fn(async () => undefined);
    const createSession = vi.fn(async ({ expiresAt }) => ({
      id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: fixedNow.toISOString(),
      last_accessed_at: fixedNow.toISOString(),
      expires_at: expiresAt.toISOString()
    }));
    const url = await startServer({ createSession, purgeExpiredSessions });
    const response = await fetch(url, { method: "POST" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data.recoveryKey).toMatch(/^(?:[0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(createSession.mock.calls[0][0].keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(purgeExpiredSessions).toHaveBeenCalledWith(fixedNow);
    expect(JSON.stringify(createSession.mock.calls)).not.toContain(
      body.data.recoveryKey
    );
    expect(body.data.guestSession.expiresAt).toBe(
      "2026-08-28T03:00:00.000Z"
    );
  });

  it("recovers only the matching active session and updates access time", async () => {
    const session = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: "2026-07-20T00:00:00.000Z",
      last_accessed_at: "2026-07-20T00:00:00.000Z",
      expires_at: "2026-08-19T00:00:00.000Z"
    };
    const findSession = vi.fn(async () => session);
    const touchSession = vi.fn(async () => ({
      ...session,
      last_accessed_at: fixedNow.toISOString()
    }));
    const url = await startServer({ findSession, touchSession });
    const response = await fetch(`${url}/recover`, {
      method: "POST",
      headers: { "X-Guest-Key": "ABCD-EFGH-JKMN-PQRT-VWXY-Z012-3456-789A" }
    });

    expect(response.status).toBe(200);
    expect(findSession).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f]{64}$/),
      fixedNow
    );
    expect(touchSession).toHaveBeenCalledWith(session.id, fixedNow);
  });

  it("returns the same deletion result when a key is absent", async () => {
    const deleteSession = vi.fn();
    const url = await startServer({
      findSession: vi.fn(async () => null),
      deleteSession
    });
    const response = await fetch(`${url}/current`, {
      method: "DELETE",
      headers: { "X-Guest-Key": "ABCD-EFGH-JKMN-PQRT-VWXY-Z012-3456-789A" }
    });

    expect(response.status).toBe(204);
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it("rejects malformed or missing recovery keys without echoing them", async () => {
    const url = await startServer();
    const malformed = "this-key-must-not-be-echoed";
    const response = await fetch(`${url}/recover`, {
      method: "POST",
      headers: { "X-Guest-Key": malformed }
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(JSON.stringify(body)).not.toContain(malformed);
    expect(body.error.code).toBe("INVALID_GUEST_KEY");
  });
});
