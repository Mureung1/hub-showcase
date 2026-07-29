import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../server.js";
import { createManualAnalysisPayload } from "../../../test/fixtures/emotionAnalysisFixtures.js";

const servers = [];
const guestSessionId = "550e8400-e29b-41d4-a716-446655440000";

async function startServer(options = {}) {
  const app = createApp({
    authenticateGuest: options.authenticateGuest,
    guestAuthenticationOptions: options.guestAuthenticationOptions,
    createAnalysis: options.createAnalysis,
    listAnalyses: options.listAnalyses,
    rateLimitOptions: { limit: 1000 }
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}/api/emotion-analyses`;
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

describe("guest-protected emotion analysis API", () => {
  it("rejects requests without guest authentication", async () => {
    const url = await startServer({
      guestAuthenticationOptions: {
        pepper: "test-only-pepper-with-at-least-32-characters"
      }
    });
    const response = await fetch(url);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "GUEST_AUTH_REQUIRED" }
    });
  });

  it("uses only the authenticated guest id when creating a record", async () => {
    const createAnalysis = vi.fn(async (record) => ({
      id: crypto.randomUUID(),
      ...record,
      created_at: new Date().toISOString()
    }));
    const url = await startServer({
      authenticateGuest: vi.fn(async () => ({
        session: { id: guestSessionId }
      })),
      createAnalysis
    });
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        createManualAnalysisPayload({
          sessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        })
      )
    });

    expect(response.status).toBe(201);
    expect(createAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ guest_session_id: guestSessionId })
    );
    expect(createAnalysis.mock.calls[0][0]).not.toHaveProperty("session_id");
    expect(await response.json()).not.toHaveProperty(
      "data.emotionAnalysis.sessionId"
    );
  });

  it("lists records only through the authenticated guest id", async () => {
    const listAnalyses = vi.fn(async () => []);
    const url = await startServer({
      authenticateGuest: vi.fn(async () => ({
        session: { id: guestSessionId }
      })),
      listAnalyses
    });
    const response = await fetch(
      `${url}?sessionId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&limit=10`
    );

    expect(response.status).toBe(200);
    expect(listAnalyses).toHaveBeenCalledWith(guestSessionId, 10);
  });
});
