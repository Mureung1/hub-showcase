// @vitest-environment node

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createModuBrainServer } from "./server.mjs";

let rootDir;
let distDir;
let server;
let baseUrl;

beforeAll(async () => {
  rootDir = await mkdtemp(join(tmpdir(), "modu-brain-server-"));
  distDir = join(rootDir, "dist");
  await mkdir(join(distDir, "assets"), { recursive: true });
  await writeFile(join(distDir, "index.html"), "<!doctype html><title>모두의 뇌</title>", "utf8");
  await writeFile(join(distDir, "assets", "app.js"), "globalThis.__APP_READY__ = true;", "utf8");

  server = createModuBrainServer({ rootDir, distDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(rootDir, { recursive: true, force: true });
});

describe("static preview server", () => {
  it("serves the SPA entry point and known assets with safe content types", async () => {
    const indexResponse = await fetch(`${baseUrl}/`);
    const assetResponse = await fetch(`${baseUrl}/assets/app.js`);

    expect(indexResponse.status).toBe(200);
    expect(indexResponse.headers.get("content-type")).toContain("text/html");
    expect(await indexResponse.text()).toContain("모두의 뇌");
    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("content-type")).toContain("text/javascript");
    expect(assetResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(indexResponse.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(indexResponse.headers.get("x-frame-options")).toBe("DENY");
    expect(indexResponse.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await assetResponse.text()).toContain("__APP_READY__");
  });

  it("falls back to index.html for extensionless client routes", async () => {
    const response = await fetch(`${baseUrl}/workspace/project-1`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("모두의 뇌");
  });

  it("sets HSTS only when the original request used HTTPS", async () => {
    const localResponse = await fetch(`${baseUrl}/`);
    const forwardedHttpsResponse = await fetch(`${baseUrl}/`, {
      headers: { "X-Forwarded-Proto": "https" },
    });

    expect(localResponse.headers.get("strict-transport-security")).toBeNull();
    expect(forwardedHttpsResponse.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  it("keeps the unauthenticated legacy analysis endpoint local even when the env requests OpenAI", async () => {
    vi.stubEnv("MODU_BRAIN_ANALYSIS_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    try {
      const response = await fetch(`${baseUrl}/api/context-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectTitle: "레거시 안전성",
          rawText:
            "민지는 공개 엔드포인트에서는 유료 모델을 호출하지 말자고 말했다. 팀은 로컬 분석만 사용하기로 결정했다. " +
            "다음 회의에서는 인증된 프로젝트 분석 흐름을 별도로 검증해야 한다. 이 기록은 충분한 입력 길이를 확보하기 위한 안전성 테스트 문장이다.",
        }),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        provider: { name: "local-heuristic", usedExternalModel: false },
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("returns 404 for missing assets instead of serving HTML", async () => {
    const response = await fetch(`${baseUrl}/assets/missing.js`);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/plain");
  });

  it("survives a malformed encoded path and continues serving assets", async () => {
    const malformedResponse = await fetch(`${baseUrl}/%E0%A4%A`);
    expect(malformedResponse.status).toBe(400);

    const assetResponse = await fetch(`${baseUrl}/assets/app.js`);
    expect(assetResponse.status).toBe(200);
    expect(await assetResponse.text()).toContain("__APP_READY__");
  });

  it.each(["/..%5C..%5Csecret.txt", "/C:%5CWindows%5Cwin.ini"])(
    "blocks encoded Windows path traversal: %s",
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`);

      expect(response.status).toBe(403);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    },
  );
});
