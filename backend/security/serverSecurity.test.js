import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../server.js";

const servers = [];

async function startServer(options) {
  const app = createApp(options);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
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

describe("Express security baseline", () => {
  it("adds security headers without exposing Express", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/missing`);

    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("referrer-policy")).toBeTruthy();
  });

  it("returns 429 when an API client exceeds the configured limit", async () => {
    const baseUrl = await startServer({
      authenticateGuest: async () => ({
        session: { id: "550e8400-e29b-41d4-a716-446655440000" }
      }),
      listAnalyses: async () => [],
      rateLimitOptions: { windowMs: 60_000, limit: 2 }
    });
    const url = `${baseUrl}/api/emotion-analyses`;

    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url)).status).toBe(200);

    const blockedResponse = await fetch(url);
    expect(blockedResponse.status).toBe(429);
    await expect(blockedResponse.json()).resolves.toMatchObject({
      success: false,
      error: { code: "RATE_LIMIT_EXCEEDED" }
    });
  });
});
