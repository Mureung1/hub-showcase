import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../server.js";

const servers = [];

async function startServer(options = {}) {
  const app = createApp({
    authenticateGuest: options.authenticateGuest,
    generateAiResponse: options.generateAiResponse,
    rateLimitOptions: { limit: 1000 }
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}/api/ai-chat/responses`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});

describe("AI chat API", () => {
  it("authenticates the guest before generating a response", async () => {
    const authenticateGuest = vi.fn(async () => ({
      session: { id: crypto.randomUUID() }
    }));
    const generateAiResponse = vi.fn(async () => ({
      response: "자연스러운 테스트 답변",
      source: "gemini"
    }));
    const url = await startServer({ authenticateGuest, generateAiResponse });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Guest-Key": "guest-key"
      },
      body: JSON.stringify({
        message: "오늘 마음이 복잡해.",
        recentMessages: [{ role: "ai", content: "무슨 일이 있었어?" }],
        analysis: { scores: [] }
      })
    });

    expect(response.status).toBe(200);
    expect(authenticateGuest).toHaveBeenCalledOnce();
    expect(generateAiResponse).toHaveBeenCalledWith({
      message: "오늘 마음이 복잡해.",
      recentMessages: [{ role: "ai", content: "무슨 일이 있었어?" }],
      analysis: { scores: [] }
    });
    await expect(response.json()).resolves.toMatchObject({
      data: { response: "자연스러운 테스트 답변", source: "gemini" }
    });
  });

  it("rejects invalid input before calling the provider", async () => {
    const generateAiResponse = vi.fn();
    const url = await startServer({
      authenticateGuest: vi.fn(async () => ({ session: { id: "guest" } })),
      generateAiResponse
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: " " })
    });

    expect(response.status).toBe(400);
    expect(generateAiResponse).not.toHaveBeenCalled();
  });
});

