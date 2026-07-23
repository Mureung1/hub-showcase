import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";
import { config } from "../src/config/env.js";

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "김지우",
  title: "Frontend Engineer",
  theme_slug: "minimal-clean",
  theme_name: "Minimal Clean",
  html: "<!doctype html><html></html>",
  is_favorite: false,
  created_at: "2026-07-14T00:00:00.000Z",
};

function request(server, { method = "GET", path, body }) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        method,
        path,
        headers: body ? { "content-type": "application/json" } : {},
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
      },
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test("POST /api/portfolios가 저장 결과를 201로 반환한다", async (t) => {
  config.supabase.url = "https://example.supabase.co";
  config.supabase.secretKey = "sb_secret_test";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([ROW]), { status: 201 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const server = createApp().listen(0);
  t.after(() => server.close());

  const response = await request(server, {
    method: "POST",
    path: "/api/portfolios",
    body: {
      name: ROW.name,
      title: ROW.title,
      themeSlug: ROW.theme_slug,
      themeName: ROW.theme_name,
      html: ROW.html,
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.portfolio.id, ROW.id);
  assert.equal(response.body.portfolio.themeSlug, ROW.theme_slug);
});

test("GET /api/portfolios가 최신 목록을 반환한다", async (t) => {
  config.supabase.url = "https://example.supabase.co";
  config.supabase.secretKey = "sb_secret_test";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([ROW]), { status: 200 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const server = createApp().listen(0);
  t.after(() => server.close());
  const response = await request(server, { path: "/api/portfolios?limit=5" });

  assert.equal(response.status, 200);
  assert.equal(response.body.portfolios[0].name, ROW.name);
  assert.equal("html" in response.body.portfolios[0], false);
});

test("PATCH /api/portfolios/:id/favorite가 즐겨찾기 결과를 반환한다", async (t) => {
  config.supabase.url = "https://example.supabase.co";
  config.supabase.secretKey = "sb_secret_test";
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (url, options) => {
    upstreamRequest = { url, options };
    return new Response(JSON.stringify([{ ...ROW, is_favorite: true }]), {
      status: 200,
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const server = createApp().listen(0);
  t.after(() => server.close());
  const response = await request(server, {
    method: "PATCH",
    path: `/api/portfolios/${ROW.id}/favorite`,
    body: { isFavorite: true },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.portfolio.isFavorite, true);
  assert.equal(upstreamRequest.options.method, "PATCH");
});

test("즐겨찾기 값이 boolean이 아니면 Supabase 호출 전에 400으로 거절한다", async (t) => {
  config.supabase.url = "https://example.supabase.co";
  config.supabase.secretKey = "sb_secret_test";
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("[]");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const server = createApp().listen(0);
  t.after(() => server.close());
  const response = await request(server, {
    method: "PATCH",
    path: `/api/portfolios/${ROW.id}/favorite`,
    body: { isFavorite: "true" },
  });

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("즐겨찾기 대상 id가 UUID가 아니면 Supabase 호출 전에 400으로 거절한다", async (t) => {
  config.supabase.url = "https://example.supabase.co";
  config.supabase.secretKey = "sb_secret_test";
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("[]");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const server = createApp().listen(0);
  t.after(() => server.close());
  const response = await request(server, {
    method: "PATCH",
    path: "/api/portfolios/not-a-uuid/favorite",
    body: { isFavorite: true },
  });

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("필수 입력 누락은 Supabase 호출 전에 400으로 거절한다", async (t) => {
  config.supabase.url = "https://example.supabase.co";
  config.supabase.secretKey = "sb_secret_test";
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("[]");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const server = createApp().listen(0);
  t.after(() => server.close());
  const response = await request(server, {
    method: "POST",
    path: "/api/portfolios",
    body: { html: ROW.html },
  });

  assert.equal(response.status, 400);
  assert.equal(called, false);
});
