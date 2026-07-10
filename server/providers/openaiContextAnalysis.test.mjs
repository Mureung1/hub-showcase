// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { analyzeWithOpenAI } from "./openaiContextAnalysis.mjs";

const input = {
  projectTitle: "공유 맥락 프로젝트",
  rawText: "민지는 입력 흐름을 먼저 검증하자고 말했다. ".repeat(8),
};

const validAnalysis = {
  overview: ["사용자 입력 흐름과 결정 근거를 먼저 검증한다."],
  keyTerms: [{ term: "공유 맥락", meaning: "팀이 함께 이해해야 하는 결정 배경이다." }],
  decisions: [
    {
      decision: "직접 입력 MVP를 먼저 검증한다.",
      reason: "자동 연동보다 핵심 가치 검증이 우선이기 때문이다.",
      status: "confirmed",
    },
  ],
  participants: [
    {
      actor: "민지",
      role: "사용자 흐름 관점",
      focus: "첫 입력 경험",
      concern: "초기 화면이 복잡해질 수 있다.",
      question: "어떤 예시가 입력을 가장 잘 설명하는가?",
    },
  ],
  questions: [
    {
      question: "어떤 예시가 입력을 가장 잘 설명하는가?",
      reason: "첫 입력 경험의 검증 기준이 아직 정해지지 않았다.",
      ownerHint: "사용자 흐름 담당",
    },
  ],
  participantAgents: {
    views: [
      {
        actor: "민지",
        role: "사용자 흐름 관점",
        priority: "첫 입력 경험",
        interpretation: "사용자가 망설이지 않고 기록을 입력하는 것을 우선한다.",
        evidence: ["민지는 입력 흐름을 먼저 검증하자고 말했다."],
        risk: "초기 화면이 복잡해질 수 있다.",
      },
    ],
    agreementPoints: ["직접 입력 MVP를 먼저 검증한다."],
    tensionPoints: ["예시 데이터의 범위는 추가 확인이 필요하다."],
    privacyNote: "입력 기록에 나타난 프로젝트 관점만 표현한다.",
  },
};

describe("OpenAI context analysis provider", () => {
  it("requests a non-stored structured Responses API result", async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: validAnalysis });

    const result = await analyzeWithOpenAI(input, {
      apiKey: "test-key",
      model: "test-model",
      client: { responses: { parse } },
    });

    expect(result.analysis).toEqual(validAnalysis);
    expect(result.provider).toEqual({
      mode: "llm",
      name: "openai:test-model",
      usedExternalModel: true,
    });
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        store: false,
        input: expect.stringContaining(input.rawText),
        text: { format: expect.any(Object) },
      }),
    );
  });

  it("forwards a request cancellation signal to the OpenAI SDK", async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: validAnalysis });
    const controller = new AbortController();

    await analyzeWithOpenAI(input, {
      apiKey: "test-key",
      model: "test-model",
      client: { responses: { parse } },
      signal: controller.signal,
    });

    expect(parse).toHaveBeenCalledWith(expect.any(Object), { signal: controller.signal });
  });

  it("rejects malformed structured output", async () => {
    const client = {
      responses: { parse: vi.fn().mockResolvedValue({ output_parsed: { overview: [] } }) },
    };

    await expect(
      analyzeWithOpenAI(input, { apiKey: "test-key", model: "test-model", client }),
    ).rejects.toMatchObject({ status: 502, code: "PROVIDER_RESPONSE_INVALID" });
  });

  it("accepts empty decision and question arrays instead of forcing unsupported claims", async () => {
    const sparseAnalysis = {
      ...validAnalysis,
      keyTerms: [],
      decisions: [],
      participants: [],
      questions: [],
      participantAgents: {
        ...validAnalysis.participantAgents,
        views: [],
        agreementPoints: [],
        tensionPoints: [],
      },
    };
    const parse = vi.fn().mockResolvedValue({ output_parsed: sparseAnalysis });

    const result = await analyzeWithOpenAI(input, {
      apiKey: "test-key",
      model: "test-model",
      client: { responses: { parse } },
    });

    expect(result.analysis.decisions).toEqual([]);
    expect(result.analysis.participants).toEqual([]);
    expect(result.analysis.questions).toEqual([]);
  });

  it.each([
    [401, "EXTERNAL_PROVIDER_AUTH_ERROR"],
    [403, "EXTERNAL_PROVIDER_AUTH_ERROR"],
    [429, "EXTERNAL_PROVIDER_RATE_LIMITED"],
  ])("maps provider HTTP %i without exposing its body", async (status, code) => {
    const client = { responses: { parse: vi.fn().mockRejectedValue({ status }) } };

    await expect(
      analyzeWithOpenAI(input, { apiKey: "test-key", model: "test-model", client }),
    ).rejects.toMatchObject({ code });
  });

  it("maps provider timeouts to a stable gateway timeout", async () => {
    const timeoutError = Object.assign(new Error("request timed out"), {
      name: "APIConnectionTimeoutError",
    });
    const client = { responses: { parse: vi.fn().mockRejectedValue(timeoutError) } };

    await expect(
      analyzeWithOpenAI(input, { apiKey: "test-key", model: "test-model", client }),
    ).rejects.toMatchObject({ status: 504, code: "EXTERNAL_PROVIDER_TIMEOUT" });
  });
});
