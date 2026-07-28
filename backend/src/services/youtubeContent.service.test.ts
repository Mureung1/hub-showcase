import assert from "node:assert/strict";
import test from "node:test";

import {
  collectYoutubeContent,
  fetchYoutubeMetadata,
  isYoutubeSourceUrl,
  parseYoutubeUrl,
  YoutubeContentError,
} from "./youtubeContent.service.js";

test("지원하는 YouTube URL에서 video ID를 추출한다", () => {
  assert.deepEqual(
    parseYoutubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ),
    {
      sourceUrl:
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
    },
  );

  assert.deepEqual(
    parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ"),
    {
      sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
    },
  );

  assert.deepEqual(
    parseYoutubeUrl(
      "https://www.youtube.com/shorts/dQw4w9WgXcQ?si=test",
    ),
    {
      sourceUrl:
        "https://www.youtube.com/shorts/dQw4w9WgXcQ?si=test",
      videoId: "dQw4w9WgXcQ",
    },
  );
});

test("지원하지 않는 호스트와 잘못된 video ID를 거부한다", () => {
  const invalidUrls = [
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.example.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/shorts/short",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ/extra",
    "https://youtu.be/short",
    "ftp://youtu.be/dQw4w9WgXcQ",
  ];

  for (const sourceUrl of invalidUrls) {
    assert.throws(
      () => parseYoutubeUrl(sourceUrl),
      (error) =>
        error instanceof YoutubeContentError &&
        error.code === "INVALID_URL",
    );
  }
});

test("YouTube 호스트만 전용 수집 경로로 분기한다", () => {
  assert.equal(
    isYoutubeSourceUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ),
    true,
  );
  assert.equal(
    isYoutubeSourceUrl("https://youtu.be/dQw4w9WgXcQ"),
    true,
  );
  assert.equal(
    isYoutubeSourceUrl(
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ),
    true,
  );
  assert.equal(
    isYoutubeSourceUrl(
      "https://youtube.com.example.com/watch?v=dQw4w9WgXcQ",
    ),
    false,
  );
  assert.equal(
    isYoutubeSourceUrl("https://example.com/recipe"),
    false,
  );
});

test("YouTube Data API에서 제목과 채널명만 조회한다", async () => {
  let requestedUrl = "";

  const fetchMock = (async (input: string | URL | Request) => {
    requestedUrl = String(input);

    return new Response(
      JSON.stringify({
        items: [
          {
            snippet: {
              title: "김치찌개 만들기",
              channelTitle: "우리집 요리",
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

  const metadata = await fetchYoutubeMetadata(
    "dQw4w9WgXcQ",
    "youtube-api-key",
    fetchMock,
  );

  assert.deepEqual(metadata, {
    title: "김치찌개 만들기",
    author: "우리집 요리",
  });

  const apiUrl = new URL(requestedUrl);

  assert.equal(
    apiUrl.origin + apiUrl.pathname,
    "https://www.googleapis.com/youtube/v3/videos",
  );
  assert.equal(apiUrl.searchParams.get("part"), "snippet");
  assert.equal(apiUrl.searchParams.get("id"), "dQw4w9WgXcQ");
  assert.equal(apiUrl.searchParams.get("key"), "youtube-api-key");
  assert.equal(
    apiUrl.searchParams.get("fields"),
    "items(snippet(title,channelTitle))",
  );
});

test("YouTube 메타데이터를 얻지 못하면 수집 실패로 처리한다", async () => {
  const emptyResponseFetch = (async () =>
    new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    })) as typeof fetch;

  await assert.rejects(
    fetchYoutubeMetadata(
      "dQw4w9WgXcQ",
      "youtube-api-key",
      emptyResponseFetch,
    ),
    (error) =>
      error instanceof YoutubeContentError &&
      error.code === "URL_FETCH_FAILED",
  );
});

test("YouTube Data API timeout을 수집 실패로 처리한다", async () => {
  const timeoutFetch = ((_input: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    })) as typeof fetch;

  await assert.rejects(
    fetchYoutubeMetadata(
      "dQw4w9WgXcQ",
      "youtube-api-key",
      timeoutFetch,
      1,
    ),
    (error) =>
      error instanceof YoutubeContentError &&
      error.code === "URL_FETCH_FAILED",
  );
});

test("메타데이터와 자막을 YouTube 구조화 입력으로 조합한다", async () => {
  let metadataCallCount = 0;
  let transcriptCallCount = 0;
  let geminiCallCount = 0;

  const result = await collectYoutubeContent(
    "https://youtu.be/dQw4w9WgXcQ",
    {
      youtubeApiKey: "youtube-api-key",
      fetchMetadata: async (
        videoId: string,
        apiKey: string,
      ) => {
        metadataCallCount += 1;
        assert.equal(videoId, "dQw4w9WgXcQ");
        assert.equal(apiKey, "youtube-api-key");

        return {
          title: "김치찌개 만들기",
          author: "우리집 요리",
        };
      },
      fetchTranscript: async (videoId: string) => {
        transcriptCallCount += 1;
        assert.equal(videoId, "dQw4w9WgXcQ");

        return "김치 200g\n10분간 끓인다.";
      },
      analyzeWithGemini: async () => {
        geminiCallCount += 1;
        return "호출되면 안 되는 Gemini 결과";
      },
    },
  );

  assert.deepEqual(result, {
    text: "김치 200g\n10분간 끓인다.",
    source: {
      url: "https://youtu.be/dQw4w9WgXcQ",
      title: "김치찌개 만들기",
      author: "우리집 요리",
    },
  });

  assert.equal(metadataCallCount, 1);
  assert.equal(transcriptCallCount, 1);
  assert.equal(geminiCallCount, 0);
});

test("자막 조회 실패 시 Gemini 영상 분석 결과를 사용한다", async () => {
  let transcriptCallCount = 0;
  let geminiCallCount = 0;

  const result = await collectYoutubeContent(
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    {
      youtubeApiKey: "youtube-api-key",
      fetchMetadata: async () => ({
        title: "된장찌개 만들기",
        author: "매일 요리",
      }),
      fetchTranscript: async () => {
        transcriptCallCount += 1;
        throw new Error("TRANSCRIPT_UNAVAILABLE");
      },
      analyzeWithGemini: async (input) => {
        geminiCallCount += 1;

        assert.deepEqual(input, {
          sourceUrl:
            "https://www.youtube.com/shorts/dQw4w9WgXcQ",
          title: "된장찌개 만들기",
          author: "매일 요리",
        });

        return "된장 2큰술\n채소를 넣고 끓인다.";
      },
    },
  );

  assert.equal(
    result.text,
    "된장 2큰술\n채소를 넣고 끓인다.",
  );
  assert.deepEqual(result.source, {
    url:
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    title: "된장찌개 만들기",
    author: "매일 요리",
  });
  assert.equal(transcriptCallCount, 1);
  assert.equal(geminiCallCount, 1);
});

test("자막과 Gemini가 모두 실패하면 URL 수집 실패로 처리한다", async () => {
  let transcriptCallCount = 0;
  let geminiCallCount = 0;

  await assert.rejects(
    collectYoutubeContent(
      "https://youtu.be/dQw4w9WgXcQ",
      {
        youtubeApiKey: "youtube-api-key",
        fetchMetadata: async () => ({
          title: "불고기 만들기",
          author: "한식 채널",
        }),
        fetchTranscript: async () => {
          transcriptCallCount += 1;
          throw new Error("TRANSCRIPT_UNAVAILABLE");
        },
        analyzeWithGemini: async () => {
          geminiCallCount += 1;
          throw new Error("GEMINI_FAILED");
        },
      },
    ),
    (error) =>
      error instanceof YoutubeContentError &&
      error.code === "URL_FETCH_FAILED",
  );

  assert.equal(transcriptCallCount, 1);
  assert.equal(geminiCallCount, 1);
});
