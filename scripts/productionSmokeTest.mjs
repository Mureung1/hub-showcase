import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function waitForHealth(baseUrl, timeoutMs = 15_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        const body = await response.json();
        if (response.ok && body.ok === true) {
          clearInterval(interval);
          resolve(body);
          return;
        }
      } catch {
        // The server may still be starting.
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(interval);
        reject(new Error("Production server health check timed out."));
      }
    }, 200);
  });
}

const port = await getAvailablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ALLOWED_ORIGINS: baseUrl,
    HOST: "127.0.0.1",
    NODE_ENV: "production",
    PORT: String(port),
    PUBLIC_URL: baseUrl,
    SERVE_CLIENT: "true",
    TRUST_PROXY: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  const health = await waitForHealth(baseUrl);
  assert.equal(health.ok, true);

  const page = await fetch(`${baseUrl}/`);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /<div id="root"><\/div>/);
  console.log(`Production smoke test passed: ${baseUrl}`);
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));

  if (server.exitCode && server.exitCode !== 0) {
    throw new Error(`Production server exited unexpectedly. ${serverOutput.slice(-1000)}`);
  }
}