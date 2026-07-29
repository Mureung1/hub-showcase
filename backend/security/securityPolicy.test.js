import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.NODE_ENV = "test";

const { createApp } = await import("../../server.js");
const { createServerConfig } = await import("../config/serverConfig.js");
const { consumeGuestAiQuota } = await import(
  "../repositories/guestSessionRepository.js"
);

async function withServer(app, verify) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  try {
    const address = server.address();
    await verify(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("health response does not expose configuration checks", async () => {
  const app = createApp({
    healthStatus: () => ({
      databaseConfigured: true,
      guestSessionsConfigured: true
    }),
    rateLimitOptions: { limit: 1000 }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("direct API responses disable caching and hide Express", async () => {
  const app = createApp({ rateLimitOptions: { limit: 1000 } });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("pragma"), "no-cache");
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  });
});

test("production CORS origins exclude local development hosts", () => {
  const config = createServerConfig({
    NODE_ENV: "production",
    CLIENT_URL: "https://example.test"
  });

  assert.deepEqual(config.allowedOrigins, ["https://example.test"]);
});

test("guest AI quota rejection happens before provider generation", async () => {
  let generated = false;
  const app = createApp({
    authenticateGuest: async () => ({
      session: { id: "018f4f7e-8a45-7a12-8abc-1234567890ab" }
    }),
    consumeAiQuota: async () => false,
    generateAiResponse: async () => {
      generated = true;
      return { response: "should not run", source: "test" };
    },
    rateLimitOptions: { limit: 1000 },
    aiRateLimitOptions: { limit: 1000 }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai-chat/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "안녕하세요" })
    });
    const payload = await response.json();

    assert.equal(response.status, 429);
    assert.equal(payload.error.code, "AI_RATE_LIMIT_EXCEEDED");
    assert.equal(generated, false);
  });
});

test("AI quota consumption uses the shared database function", async () => {
  const calls = [];
  const consumed = await consumeGuestAiQuota(
    "018f4f7e-8a45-7a12-8abc-1234567890ab",
    {
      limit: 10,
      windowSeconds: 900,
      client: {
        async rpc(name, parameters) {
          calls.push({ name, parameters });
          return { data: true, error: null };
        }
      }
    }
  );

  assert.equal(consumed, true);
  assert.deepEqual(calls, [
    {
      name: "consume_guest_ai_quota",
      parameters: {
        p_guest_session_id: "018f4f7e-8a45-7a12-8abc-1234567890ab",
        p_limit: 10,
        p_window_seconds: 900
      }
    }
  ]);
});

test("quota migration is atomic and not executable by browser roles", async () => {
  const migration = await readFile(
    new URL(
      "../migrations/20260729_add_guest_usage_quotas.sql",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(migration, /update public\.guest_sessions/);
  assert.match(migration, /ai_request_count < p_limit/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /\) >= 200 then/);
  assert.match(
    migration,
    /revoke all on function public\.consume_guest_ai_quota[\s\S]*from public, anon, authenticated/
  );
});

test("Vercel serves restrictive document security headers", async () => {
  const config = JSON.parse(
    await readFile(new URL("../../vercel.json", import.meta.url), "utf8")
  );
  const documentHeaders = config.headers.find(
    ({ source }) => source === "/(.*)"
  )?.headers;
  assert.ok(documentHeaders);
  const headers = Object.fromEntries(
    documentHeaders.map(({ key, value }) => [key.toLowerCase(), value])
  );

  assert.match(headers["content-security-policy"], /default-src 'self'/);
  assert.match(
    headers["content-security-policy"],
    /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/
  );
  assert.match(headers["content-security-policy"], /object-src 'none'/);
  assert.match(headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(
    headers["permissions-policy"],
    "camera=(self), microphone=(), geolocation=()"
  );
  assert.equal(headers["x-content-type-options"], "nosniff");
});
