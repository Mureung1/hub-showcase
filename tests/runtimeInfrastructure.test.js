import assert from "node:assert/strict";
import test from "node:test";

import { getRuntimeConfig } from "../server/config/runtimeConfig.js";
import { createCorsOptions } from "../server/middleware/httpSecurity.js";
import { createFixedWindowRateLimit } from "../server/middleware/rateLimit.js";

const ENV_KEYS = [
  "ALLOWED_ORIGINS",
  "ANALYZE_RATE_LIMIT_ENABLED",
  "ANALYZE_RATE_LIMIT_MAX",
  "ANALYZE_RATE_LIMIT_WINDOW_MS",
  "HOST",
  "HTML_FETCH_RATE_LIMIT_ENABLED",
  "HTML_FETCH_RATE_LIMIT_MAX",
  "HTML_FETCH_RATE_LIMIT_WINDOW_MS",
  "NODE_ENV",
  "PORT",
  "PUBLIC_URL",
  "SERVE_CLIENT",
  "TRUST_PROXY",
];

function withEnvironment(values, callback) {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);

  try {
    return callback();
  } finally {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

test("기본 런타임은 외부에 바인딩하거나 frontend를 제공하지 않는다", () => {
  withEnvironment({}, () => {
    const config = getRuntimeConfig();

    assert.equal(config.host, "127.0.0.1");
    assert.equal(config.analyzeRateLimitEnabled, false);
    assert.equal(config.htmlFetchRateLimitEnabled, false);
    assert.equal(config.serveClient, false);
    assert.equal(config.trustProxy, false);
    assert.ok(config.allowedOrigins.includes("http://127.0.0.1:5173"));
  });
});

test("production 환경은 명시한 도메인과 단일 frontend 제공 설정을 읽는다", () => {
  withEnvironment({
    ALLOWED_ORIGINS: "https://example.kr, https://www.example.kr/",
    HOST: "0.0.0.0",
    NODE_ENV: "production",
    PUBLIC_URL: "https://example.kr/",
    TRUST_PROXY: "true",
  }, () => {
    const config = getRuntimeConfig();

    assert.equal(config.host, "0.0.0.0");
    assert.equal(config.analyzeRateLimitEnabled, true);
    assert.equal(config.htmlFetchRateLimitEnabled, true);
    assert.equal(config.serveClient, true);
    assert.equal(config.publicUrl, "https://example.kr");
    assert.equal(config.trustProxy, true);
    assert.deepEqual(config.allowedOrigins, ["https://example.kr", "https://www.example.kr"]);
  });
});

test("CORS는 등록된 출처만 허용한다", async () => {
  const corsOptions = createCorsOptions(["https://example.kr"]);
  const evaluate = (origin) => new Promise((resolve) => {
    corsOptions.origin(origin, (error, allowed) => resolve({ allowed, error }));
  });

  assert.equal((await evaluate("https://example.kr")).allowed, true);
  assert.equal((await evaluate(undefined)).allowed, true);
  assert.equal((await evaluate("https://attacker.example")).error.code, "CORS_ORIGIN_DENIED");
});

test("분석 요청 제한을 넘으면 429를 반환한다", () => {
  const middleware = createFixedWindowRateLimit({ maxRequests: 2, windowMs: 60_000 });
  const request = { ip: "127.0.0.1", socket: {} };
  const responses = [];
  let nextCount = 0;

  function createResponse() {
    const response = {
      body: null,
      headers: {},
      statusCode: 200,
      json(body) {
        this.body = body;
        responses.push(this);
        return this;
      },
      setHeader(name, value) {
        this.headers[name] = value;
      },
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
    };
    return response;
  }

  middleware(request, createResponse(), () => { nextCount += 1; });
  middleware(request, createResponse(), () => { nextCount += 1; });
  middleware(request, createResponse(), () => { nextCount += 1; });

  assert.equal(nextCount, 2);
  assert.equal(responses[0].statusCode, 429);
  assert.equal(responses[0].body.error, "rate_limit_exceeded");
});
