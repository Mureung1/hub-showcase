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

test("긴 메뉴보다 게시글 상세 영역을 우선 추출한다", () => {
  const html = `<html>
    <head><title>경북대학교</title></head>
    <body>
      <nav>${"메뉴 ".repeat(20000)}</nav>
      <div class="board_view">
        <h2>대학-기업 협업 프로젝트 참여기업 모집</h2>
        <div id="viewcontent" class="board_cont">
          지원대상: 대구 지역 내 ABB 관련 기업
          접수기간: 2026. 7. 22. ~ 2026. 8. 9.
        </div>
      </div>
    </body>
  </html>`;

  const result = extractOpportunityTextFromHtml(html);

  assert.match(result, /참여기업 모집/);
  assert.match(result, /지원대상: 대구 지역 내 ABB 관련 기업/);
  assert.equal(result.includes("메뉴 메뉴 메뉴"), false);
});