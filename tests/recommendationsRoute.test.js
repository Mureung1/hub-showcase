import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "vitest";

import express from "express";

import { createRecommendationsRouter } from "../backend/routes/recommendations.js";

async function withServer(app, callback) {
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function createTestApp(recommendationService) {
  const app = express();
  app.use(express.json());
  app.use("/api/recommendations", createRecommendationsRouter({ recommendationService }));
  return app;
}

test("빈 요청에는 안전한 추천 기본값을 적용한다", async () => {
  let receivedRequest;
  const app = createTestApp({
    async recommend(request) {
      receivedRequest = request;
      return { recipes: [], meta: { source: "test" } };
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 200);
  });

  assert.equal(receivedRequest.mode, "quick");
  assert.equal(receivedRequest.maxMissingIngredients, 0);
  assert.equal(receivedRequest.batchSize, 3);
  assert.equal(receivedRequest.batchNumber, 1);
});

test("지원하지 않는 추천 조건은 400 오류로 차단한다", async () => {
  const app = createTestApp({
    recommend() { throw new Error("호출되면 안 됩니다"); },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "special", batchSize: 4 }),
    });
    const result = await response.json();
    assert.equal(response.status, 400);
    assert.equal(result.error.code, "INVALID_RECOMMENDATION_REQUEST");
  });
});
