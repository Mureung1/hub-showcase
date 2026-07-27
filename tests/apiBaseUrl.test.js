import assert from "node:assert/strict";
import test from "node:test";

import { createProxyRequestUrls } from "../src/agents/noticeLinkAgent.js";
import { buildApiUrl, getConfiguredApiBaseUrl } from "../src/config/apiBaseUrl.js";

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