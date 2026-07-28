import assert from "node:assert/strict";
import test from "node:test";

import {
  extractHtmlContent,
  isPublicIpAddress,
  parseSourceUrl,
  UrlContentError,
} from "./urlContent.service.js";

function createHtmlResponse(html: string) {
  return {
    statusCode: 200,
    location: null,
    contentType: "text/html; charset=utf-8",
    body: Buffer.from(html),
  };
}

test("레시피 영역만 추출하고 실행 콘텐츠를 제거한다", () => {
  const result = extractHtmlContent(
    createHtmlResponse(`
        <html>
          <body>
            <p>광고 문구</p>
            <main>
              <div itemtype="https://schema.org/Recipe">
                <h1>김치찌개</h1>
                <p>김치 200g</p>
                <script>실행하면 안 되는 코드</script>
              </div>
              <p>사용자 후기</p>
            </main>
          </body>
        </html>
      `),
  );

  assert.equal(result.text, "김치찌개\n김치 200g");
});

test("레시피 본문 영역이 없는 페이지를 거부한다", () => {
  assert.throws(
    () =>
      extractHtmlContent(
        createHtmlResponse("<html><body><p>일반 페이지</p></body></html>"),
      ),
    (error) =>
      error instanceof UrlContentError &&
      error.code === "URL_FETCH_FAILED",
  );
});

test("허용하지 않는 프로토콜과 로컬 주소를 차단한다", () => {
  const blockedUrls = [
    ["ftp://example.com/recipe", "INVALID_URL"],
    ["http://localhost/recipe", "URL_NOT_ALLOWED"],
    ["http://127.0.0.1/recipe", "URL_NOT_ALLOWED"],
    ["http://169.254.169.254/recipe", "URL_NOT_ALLOWED"],
    ["http://10.0.0.1/recipe", "URL_NOT_ALLOWED"],
    ["http://[::1]/recipe", "URL_NOT_ALLOWED"],
  ] as const;

  for (const [sourceUrl, expectedCode] of blockedUrls) {
    assert.throws(
      () => parseSourceUrl(sourceUrl),
      (error) =>
        error instanceof UrlContentError &&
        error.code === expectedCode,
    );
  }
});

test("지원하는 일반 공개 웹페이지와 YouTube URL은 유지한다", () => {
  assert.equal(
    parseSourceUrl("https://example.com/recipe").hostname,
    "example.com",
  );
  assert.equal(
    parseSourceUrl("https://www.youtube.com/watch?v=abcdefghijk")
      .hostname,
    "www.youtube.com",
  );
});

test("MVP에서 네이버 블로그 URL은 직접 입력 안내 실패로 처리한다", () => {
  const unsupportedUrls = [
    "https://blog.naver.com/recipe/123",
    "https://m.blog.naver.com/recipe/123",
  ];

  for (const sourceUrl of unsupportedUrls) {
    assert.throws(
      () => parseSourceUrl(sourceUrl),
      (error) =>
        error instanceof UrlContentError &&
        error.code === "URL_FETCH_FAILED",
    );
  }
});

test("공개 IP와 차단 IP를 구분한다", () => {
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("10.0.0.1"), false);
  assert.equal(isPublicIpAddress("169.254.169.254"), false);
  assert.equal(isPublicIpAddress("127.0.0.1"), false);
  assert.equal(isPublicIpAddress("::1"), false);
  assert.equal(isPublicIpAddress("2001:4860:4860::8888"), true);
});


test("추출 본문 길이 제한을 초과하면 거부한다", () => {
  const oversizedText = "가".repeat(20_001);

  assert.throws(
    () =>
      extractHtmlContent(
        createHtmlResponse(`<main><p>${oversizedText}</p></main>`),
      ),
    (error) =>
      error instanceof UrlContentError &&
      error.code === "URL_FETCH_FAILED",
  );
});
