import { describe, expect, it, vi } from "vitest";
import {
  AiGenerationError,
  createGeminiChatGenerator
} from "./aiChatService.js";

describe("createGeminiChatGenerator", () => {
  it("sends only text history and compact analysis to Gemini", async () => {
    const fetchImpl = vi.fn(async (url, options) => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "천천히 같이 살펴보자." }] } }]
      })
    }));
    const generate = createGeminiChatGenerator({
      apiKey: "test-key",
      fetchImpl
    });

    await expect(
      generate({
        message: "오늘 마음이 복잡해.",
        recentMessages: [{ role: "ai", content: "어떤 일이 있었어?" }],
        analysis: {
          scores: [{ label: "긴장", value: 60, privateField: "제외" }],
          possibleStates: [{ label: "걱정", reason: "표정 신호" }],
          rawCameraData: [1, 2, 3]
        }
      })
    ).resolves.toEqual({
      response: "천천히 같이 살펴보자.",
      source: "gemini"
    });

    const [url, options] = fetchImpl.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toContain("gemini-2.5-flash-lite:generateContent");
    expect(options.headers["x-goog-api-key"]).toBe("test-key");
    expect(options.body).not.toContain("rawCameraData");
    expect(options.body).not.toContain("privateField");
    expect(body.contents).toHaveLength(2);
  });

  it("does not call Gemini for an urgent safety phrase", async () => {
    const fetchImpl = vi.fn();
    const generate = createGeminiChatGenerator({
      apiKey: "test-key",
      fetchImpl
    });

    const result = await generate({ message: "죽고 싶어" });

    expect(result.source).toBe("safety");
    expect(result.response).toContain("혼자 있지 말고");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when no server-side API key exists", async () => {
    const generate = createGeminiChatGenerator({ apiKey: "" });

    await expect(generate({ message: "안녕" })).rejects.toMatchObject({
      code: "AI_NOT_CONFIGURED",
      status: 503
    });
  });

  it("maps provider quota exhaustion without retrying", async () => {
    const generate = createGeminiChatGenerator({
      apiKey: "test-key",
      fetchImpl: vi.fn(async () => ({ ok: false, status: 429 }))
    });

    await expect(generate({ message: "안녕" })).rejects.toBeInstanceOf(
      AiGenerationError
    );
    await expect(generate({ message: "안녕" })).rejects.toMatchObject({
      code: "AI_RATE_LIMITED",
      status: 429
    });
  });
});

