import assert from "node:assert/strict";
import test from "node:test";

import { createProxyRequestHeaders, createProxyRequestUrls } from "../src/agents/noticeLinkAgent.js";
import { buildApiUrl, getConfiguredApiBaseUrl } from "../src/config/apiBaseUrl.js";
import { analyzeOpportunity, discoverNotices, recommendSites } from "../src/api.js";

test("VITE_API_BASE_URL이 없으면 개발 프록시용 상대 API 경로를 사용한다", () => {
  assert.equal(getConfiguredApiBaseUrl({}), "");
  assert.equal(buildApiUrl("api/health", ""), "/api/health");
});

test("배포 API URL은 중복 슬래시 없이 모든 API 경로 앞에 붙는다", () => {
  const apiBaseUrl = "https://uniradar-api.onrender.com/";

  assert.equal(buildApiUrl("/api/health", apiBaseUrl), "https://uniradar-api.onrender.com/api/health");
  assert.deepEqual(
    createProxyRequestUrls("https://example.com/notices/1", apiBaseUrl),
    ["https://uniradar-api.onrender.com/api/fetch-html?url=https%3A%2F%2Fexample.com%2Fnotices%2F1"],
  );
});
test("공지 HTML 프록시 요청은 로그인 토큰이 있을 때만 Bearer 헤더를 넣는다", () => {
  assert.deepEqual(createProxyRequestHeaders(), {
    Accept: "text/html,application/xhtml+xml",
  });
  assert.deepEqual(createProxyRequestHeaders("session-token"), {
    Accept: "text/html,application/xhtml+xml",
    Authorization: "Bearer session-token",
  });
});
test("보호된 분석·추천·탐색 API는 Bearer 토큰을 전송한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => ({ items: [], recommendations: [] }),
    };
  };

  try {
    await analyzeOpportunity({ rawText: "공고 본문" }, "session-token");
    await recommendSites({ profile: {}, trackedSiteIds: [] }, "session-token");
    await discoverNotices({ sourceId: "knu-notices" }, "session-token");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requests.length, 3);
  requests.forEach(({ options }) => {
    assert.equal(options.headers.Authorization, "Bearer session-token");
  });
  assert.equal(requests[0].options.headers["Content-Type"], "application/json");
  assert.equal(requests[1].options.headers["Content-Type"], "application/json");
  assert.equal(requests[2].options.headers["Content-Type"], undefined);
});

test("보호된 API는 토큰이 없으면 브라우저 요청을 만들지 않는다", async () => {
  await assert.rejects(() => analyzeOpportunity({ rawText: "공고 본문" }), /로그인 상태/);
  await assert.rejects(() => recommendSites({ profile: {}, trackedSiteIds: [] }), /로그인 상태/);
  await assert.rejects(() => discoverNotices({ sourceId: "knu-notices" }), /로그인 상태/);
});