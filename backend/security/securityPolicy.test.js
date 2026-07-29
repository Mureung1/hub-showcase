import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.NODE_ENV = "test";

const { createApp } = await import("../../server.js");
const { createServerConfig } = await import("../config/serverConfig.js");

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
  assert.match(headers["content-security-policy"], /object-src 'none'/);
  assert.match(headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(
    headers["permissions-policy"],
    "camera=(self), microphone=(), geolocation=()"
  );
  assert.equal(headers["x-content-type-options"], "nosniff");
});
