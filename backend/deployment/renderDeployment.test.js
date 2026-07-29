import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../server.js";

const servers = [];

async function startServer(healthStatus) {
  const app = createApp({
    healthStatus,
    rateLimitOptions: { limit: 1000 }
  });
  const server = await new Promise((resolveServer) => {
    const listener = app.listen(0, "127.0.0.1", () =>
      resolveServer(listener)
    );
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolveServer, reject) => {
          server.close((error) =>
            error ? reject(error) : resolveServer()
          );
        })
    )
  );
});

describe("Render deployment contract", () => {
  it("keeps secrets out of the Blueprint and creates no background service", async () => {
    const blueprint = await readFile(
      resolve(process.cwd(), "render.yaml"),
      "utf8"
    );

    expect(blueprint).toContain("type: web");
    expect(blueprint).not.toMatch(/type:\s*(worker|cron)/);
    expect(blueprint).toContain("healthCheckPath: /health");
    expect(blueprint).toContain("startCommand: npm start");
    expect(blueprint).toMatch(/key: SUPABASE_SECRET_KEY\s+sync: false/);
    expect(blueprint).toMatch(/key: GUEST_KEY_PEPPER\s+generateValue: true/);
    expect(blueprint).not.toContain("service_role=");
  });

  it("reports ready only when database and guest configuration exist", async () => {
    const readyUrl = await startServer(() => ({
      databaseConfigured: true,
      guestSessionsConfigured: true
    }));
    const notReadyUrl = await startServer(() => ({
      databaseConfigured: true,
      guestSessionsConfigured: false
    }));

    const readyResponse = await fetch(`${readyUrl}/health`);
    const notReadyResponse = await fetch(`${notReadyUrl}/health`);

    expect(readyResponse.status).toBe(200);
    await expect(readyResponse.json()).resolves.toMatchObject({
      status: "ok"
    });
    expect(notReadyResponse.status).toBe(503);
  });
});
