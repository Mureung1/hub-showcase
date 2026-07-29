import { describe, expect, it, vi } from "vitest";
import { createAiChatApi } from "./aiChatApi";

describe("createAiChatApi", () => {
  it("sends an authenticated, bounded response request", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { response: "같이 천천히 살펴보자.", source: "gemini" }
      })
    }));
    const api = createAiChatApi({
      baseUrl: "https://api.example.com/",
      fetchImpl
    });
    const recentMessages = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 ? "ai" : "user",
      content: `메시지 ${index}`
    }));

    await expect(
      api.generateAiResponse(
        {
          message: "오늘 마음이 복잡해.",
          recentMessages,
          analysis: { scores: [] }
        },
        { guestKey: "guest-secret" }
      )
    ).resolves.toBe("같이 천천히 살펴보자.");

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/ai-chat/responses");
    expect(options.headers["X-Guest-Key"]).toBe("guest-secret");
    expect(JSON.parse(options.body).recentMessages).toHaveLength(6);
  });

  it("does not send a request without a guest key", async () => {
    const fetchImpl = vi.fn();
    const api = createAiChatApi({ fetchImpl });

    await expect(
      api.generateAiResponse({ message: "안녕" })
    ).rejects.toMatchObject({ code: "GUEST_AUTH_REQUIRED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("exposes quota errors so the caller can use its local fallback", async () => {
    const api = createAiChatApi({
      fetchImpl: vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: { code: "AI_RATE_LIMITED", message: "quota exceeded" }
        })
      }))
    });

    await expect(
      api.generateAiResponse(
        { message: "안녕" },
        { guestKey: "guest-secret" }
      )
    ).rejects.toMatchObject({ code: "AI_RATE_LIMITED", status: 429 });
  });
});

