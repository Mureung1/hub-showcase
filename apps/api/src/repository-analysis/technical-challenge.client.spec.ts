import { ConfigService } from "@nestjs/config";
import { TechnicalChallengeAiRequest } from "./technical-challenge.models";
import {
  HttpTechnicalChallengeAiClient,
  TechnicalChallengeAiResponseError,
  TechnicalChallengeAiUnavailableError,
} from "./technical-challenge.client";

describe("HttpTechnicalChallengeAiClient", () => {
  const originalFetch = global.fetch;
  const request: TechnicalChallengeAiRequest = {
    model: "test-model",
    systemPrompt: "system",
    userPrompt: "user",
    temperature: 0,
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("does not call an external provider when AI settings are missing", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    const client = new HttpTechnicalChallengeAiClient(new ConfigService());

    await expect(client.generate(request)).rejects.toBeInstanceOf(
      TechnicalChallengeAiUnavailableError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns content from an OpenAI-compatible JSON response", async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "{\"candidates\":[]}" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;
    const client = new HttpTechnicalChallengeAiClient(
      new ConfigService({
        AI_API_URL: "https://ai.example.com/v1/chat/completions",
        AI_API_KEY: "secret-key",
        AI_MODEL: "configured-model",
      }),
    );

    await expect(client.generate(request)).resolves.toBe('{"candidates":[]}');
    expect(global.fetch).toHaveBeenCalledWith(
      "https://ai.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-key" }),
        body: expect.stringContaining('"model":"test-model"'),
      }),
    );
  });

  it("converts provider failures without exposing response content", async () => {
    global.fetch = jest.fn(async () =>
      new Response('{"apiKey":"should-not-leak"}', { status: 500 }),
    ) as typeof fetch;
    const client = new HttpTechnicalChallengeAiClient(
      new ConfigService({
        AI_API_URL: "https://ai.example.com/v1/chat/completions",
        AI_API_KEY: "secret-key",
        AI_MODEL: "configured-model",
      }),
    );

    await expect(client.generate(request)).rejects.toEqual(new TechnicalChallengeAiResponseError(500));
  });
});
