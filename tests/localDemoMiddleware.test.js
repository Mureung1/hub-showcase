import assert from "node:assert/strict";
import test from "node:test";

import { createRequireLocalDemoMode } from "../server/middleware/requireLocalDemoMode.js";

function createResponse() {
  return {
    body: null,
    statusCode: null,
    json(body) {
      this.body = body;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

test("인증 환경에서는 익명 로컬 저장 공고 API를 차단한다", () => {
  const middleware = createRequireLocalDemoMode({ authConfigured: true });
  const response = createResponse();
  let nextCalled = false;

  middleware({}, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error, "local_demo_disabled");
});

test("인증이 구성되지 않은 로컬 데모에서는 익명 저장 API를 유지한다", () => {
  const middleware = createRequireLocalDemoMode({ authConfigured: false });
  const response = createResponse();
  let nextCalled = false;

  middleware({}, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, null);
});
test("인증이 없더라도 production 또는 Supabase 저장소에서는 익명 저장 API를 차단한다", () => {
  const productionMiddleware = createRequireLocalDemoMode({
    authConfigured: false,
    isProduction: true,
    storageProvider: "sqlite",
  });
  const supabaseMiddleware = createRequireLocalDemoMode({
    authConfigured: false,
    isProduction: false,
    storageProvider: "supabase",
  });

  for (const middleware of [productionMiddleware, supabaseMiddleware]) {
    const response = createResponse();
    let nextCalled = false;

    middleware({}, response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error, "local_demo_disabled");
  }
});