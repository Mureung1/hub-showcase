import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeYoutubeWithGemini,
  GeminiYoutubeError,
} from "./geminiYoutube.service.js";

test("원본 URL과 제목·채널명만 Gemini 영상 분석에 전달한다", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;

  const fetchMock = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    requestedUrl = String(input);
    requestedInit = init;

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    "돼지고기와 김치를 넣고 충분히 끓인다.",
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  const result = await analyzeYoutubeWithGemini(
    {
      sourceUrl:
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "김치찌개 만들기",
      author: "우리집 요리",
    },
    {
      apiKey: "gemini-api-key",
      model: "gemini-3.6-flash",
      timeoutMs: 30_000,
      fetchImpl: fetchMock,
    },
  );

  assert.equal(
    result,
    "돼지고기와 김치를 넣고 충분히 끓인다.",
  );

  assert.equal(
    requestedUrl,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
  );

  const headers = new Headers(requestedInit?.headers);

  assert.equal(
    headers.get("x-goog-api-key"),
    "gemini-api-key",
  );
  assert.equal(
    headers.get("content-type"),
    "application/json",
  );
  assert.equal(requestedInit?.method, "POST");
  assert.ok(requestedInit?.signal instanceof AbortSignal);

  const requestBody = JSON.parse(
    String(requestedInit?.body),
  ) as {
    contents: Array<{
      parts: Array<{
        text?: string;
        file_data?: {
          file_uri: string;
        };
      }>;
    }>;
  };

  assert.deepEqual(
    requestBody.contents[0]?.parts[0],
    {
      file_data: {
        file_uri:
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    },
  );

  const prompt = requestBody.contents[0]?.parts[1]?.text;

  assert.match(prompt ?? "", /김치찌개 만들기/);
  assert.match(prompt ?? "", /우리집 요리/);
});

test("Gemini timeout을 재시도 없이 실패로 처리한다", async () => {
  let requestCount = 0;

  const timeoutFetch = ((_input: string | URL | Request, init?: RequestInit) => {
    requestCount += 1;

    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });
  }) as typeof fetch;

  await assert.rejects(
    analyzeYoutubeWithGemini(
      {
        sourceUrl:
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "김치찌개 만들기",
        author: "우리집 요리",
      },
      {
        apiKey: "gemini-api-key",
        model: "gemini-3.6-flash",
        timeoutMs: 1,
        fetchImpl: timeoutFetch,
      },
    ),
    GeminiYoutubeError,
  );

  assert.equal(requestCount, 1);
});

test("Gemini 제공자 오류와 잘못된 응답을 실패로 처리한다", async () => {
  const failedFetch = (async () =>
    new Response("provider error", {
      status: 503,
    })) as typeof fetch;

  const invalidResponseFetch = (async () =>
    new Response(JSON.stringify({ candidates: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    })) as typeof fetch;

  const input = {
    sourceUrl:
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "김치찌개 만들기",
    author: "우리집 요리",
  };

  for (const fetchImpl of [failedFetch, invalidResponseFetch]) {
    await assert.rejects(
      analyzeYoutubeWithGemini(input, {
        apiKey: "gemini-api-key",
        model: "gemini-3.6-flash",
        timeoutMs: 30_000,
        fetchImpl,
      }),
      GeminiYoutubeError,
    );
  }
});
