import assert from "node:assert/strict";
import test from "node:test";

import {
  extractOpportunityTextFromHtml,
  readResponseTextWithLimit,
} from "../server/services/fetchOpportunityText.js";

function createStreamingResponse(chunks, contentLength = null) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  const headers = new Headers();

  if (contentLength !== null) {
    headers.set("content-length", String(contentLength));
  }

  return { body, headers };
}

test("제한보다 작은 HTML 응답은 변경하지 않는다", async () => {
  const html = "<html><body><main>정상 공고 본문입니다.</main></body></html>";
  const result = await readResponseTextWithLimit(createStreamingResponse([html]), {
    maxBytes: 1024,
  });

  assert.equal(result, html);
});

test("Content-Length가 커도 제한까지 읽고 오류 대신 안전하게 잘라낸다", async () => {
  const htmlStart = "<html><body><main>공지 본문</main><script>";
  const response = createStreamingResponse([htmlStart, "x".repeat(200)], 10000);
  const result = await readResponseTextWithLimit(response, { maxBytes: 64 });

  assert.ok(new TextEncoder().encode(result).byteLength > 64);
  assert.ok(result.startsWith(htmlStart));
  assert.ok(result.endsWith("</script></style></body></html>"));
  assert.doesNotThrow(() => extractOpportunityTextFromHtml(result));
  assert.equal(extractOpportunityTextFromHtml(result).includes("xxxxxxxx"), false);
});

test("단일 청크가 제한보다 커도 정확히 제한까지만 보관한다", async () => {
  const response = createStreamingResponse(["가".repeat(100)]);
  const result = await readResponseTextWithLimit(response, { maxBytes: 30 });
  const contentWithoutSuffix = result.replace("\n</script></style></body></html>", "");

  assert.ok(new TextEncoder().encode(contentWithoutSuffix).byteLength <= 30);
  assert.ok(result.endsWith("</script></style></body></html>"));
});
