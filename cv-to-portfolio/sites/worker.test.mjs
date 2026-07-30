import assert from "node:assert/strict";
import test from "node:test";
import worker from "./worker.mjs";

const baseEnv = {
  ASSETS: {
    fetch: async (request) =>
      new Response(new URL(request.url).pathname, {
        status: new URL(request.url).pathname === "/index.html" ? 200 : 404,
        headers: { "content-type": "text/html" },
      }),
  },
};

test("배포 Worker health가 AI·DB 구성 여부를 구분한다", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/health"),
    {
      ...baseEnv,
      ANTHROPIC_API_KEY: `sk-ant-${"a".repeat(32)}`,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    aiConfigured: true,
    databaseConfigured: true,
  });
});

test("짧은 Anthropic 예시 키는 AI 구성 완료로 표시하지 않는다", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/health"),
    {
      ...baseEnv,
      ANTHROPIC_API_KEY: "sk-ant-example",
    },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).aiConfigured, false);
});

test("빈 생성 입력은 외부 API 호출 전에 400을 반환한다", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cvMarkdown: "", designMarkdown: "", targetMarkdown: "" }),
    }),
    baseEnv,
  );
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /cvMarkdown/);
});

test("잘못된 포트폴리오 id는 DB 호출 전에 400을 반환한다", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/portfolios/not-a-uuid"),
    baseEnv,
  );
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /UUID/);
});

test("루트 요청은 정적 index.html로 연결한다", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/", {
      headers: { accept: "text/html" },
    }),
    baseEnv,
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "/index.html");
});
