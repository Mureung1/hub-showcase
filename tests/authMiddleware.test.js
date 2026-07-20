import assert from "node:assert/strict";
import test from "node:test";

import { createRequireAuth } from "../server/middleware/requireAuth.js";
import { getSupabaseAuthConfig } from "../server/services/supabaseAuth.js";

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

test("Supabase 인증 설정은 URL과 anon key가 모두 있어야 활성화된다", () => {
  assert.equal(getSupabaseAuthConfig({}).configured, false);
  assert.equal(getSupabaseAuthConfig({ SUPABASE_URL: "https://example.supabase.co" }).configured, false);
  assert.equal(getSupabaseAuthConfig({
    SUPABASE_ANON_KEY: "public-anon-key",
    SUPABASE_URL: "https://example.supabase.co",
  }).configured, true);
});

test("Authorization 헤더가 없으면 프로필 API는 401로 차단된다", async () => {
  const middleware = createRequireAuth({ getUser: async () => ({ id: "ignored" }) });
  const response = createResponse();
  let nextCalled = false;

  await middleware({ get: () => "" }, response, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, "authentication_required");
  assert.equal(nextCalled, false);
});

test("검증된 토큰의 사용자 ID만 request에 설정한다", async () => {
  const middleware = createRequireAuth({
    getUser: async (token) => ({ email: "student@example.com", id: token === "token-a" ? "account-a" : "wrong" }),
  });
  const request = { get: () => "Bearer token-a" };
  const response = createResponse();
  let nextCalled = false;

  await middleware(request, response, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.user, { id: "account-a", email: "student@example.com" });
  assert.equal(request.accessToken, "token-a");
});
