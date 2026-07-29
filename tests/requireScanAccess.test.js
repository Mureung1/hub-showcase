import assert from "node:assert/strict";
import test from "node:test";

import { createRequireScanAccess } from "../server/middleware/requireScanAccess.js";

function createResponse() {
  return {
    body: null,
    statusCode: 200,
    json(body) {
      this.body = body;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

test("인증이 구성된 환경의 HTML 스캔은 인증 미들웨어를 사용한다", () => {
  let authCalls = 0;
  const middleware = createRequireScanAccess({
    authConfigured: true,
    isProduction: true,
    requireAuth: () => { authCalls += 1; },
  });

  middleware({}, createResponse(), () => assert.fail("next should not be called"));
  assert.equal(authCalls, 1);
});

test("인증 없는 로컬 개발에서는 HTML 스캔을 유지하고 production에서는 차단한다", () => {
  let localNextCalls = 0;
  const localMiddleware = createRequireScanAccess({
    authConfigured: false,
    isProduction: false,
    requireAuth: () => assert.fail("requireAuth should not be called"),
  });
  localMiddleware({}, createResponse(), () => { localNextCalls += 1; });
  assert.equal(localNextCalls, 1);

  const productionResponse = createResponse();
  const productionMiddleware = createRequireScanAccess({
    authConfigured: false,
    isProduction: true,
    requireAuth: () => assert.fail("requireAuth should not be called"),
  });
  productionMiddleware({}, productionResponse, () => assert.fail("next should not be called"));
  assert.equal(productionResponse.statusCode, 503);
  assert.equal(productionResponse.body.error, "scan_auth_unavailable");
});