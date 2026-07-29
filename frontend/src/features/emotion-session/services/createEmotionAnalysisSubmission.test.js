import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMockResponse } from "../../conversation";
import {
  createEmotionAnalysisSubmission
} from "./createEmotionAnalysisSubmission";

vi.mock("../../conversation", () => ({
  generateMockResponse: vi.fn()
}));

describe("createEmotionAnalysisSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the response and saves one normalized local record", async () => {
    const analysisInput = {
      situationText: "테스트 상황",
      faceSignal: "neutral",
      faceSignalSource: "manual",
      faceSignalConfidence: null,
      faceSignalEvidence: [],
      faceSignalHeuristicVersion: null,
      voiceSignal: "normal",
      selectedScenario: "normal"
    };
    const analysisResult = { scores: [] };
    const controller = new AbortController();
    const createdRecord = { id: "saved-record" };
    const recentMessages = [
      { role: "ai", content: "어떤 이야기를 더 나누고 싶어요?" }
    ];
    const saveAnalysis = vi.fn(() => createdRecord);
    generateMockResponse.mockReturnValue("테스트 응답");

    await expect(
      createEmotionAnalysisSubmission({
        sessionId: "session-id",
        analysisInput,
        analysisResult,
        recentMessages,
        signal: controller.signal,
        saveAnalysis
      })
    ).resolves.toEqual({
      aiResponse: "테스트 응답",
      createdRecord
    });

    expect(generateMockResponse).toHaveBeenCalledWith(
      analysisInput.situationText,
      analysisResult,
      { recentMessages }
    );
    expect(saveAnalysis).toHaveBeenCalledWith(
      {
        sessionId: "session-id",
        ...analysisInput,
        analysisResult,
        aiResponse: "테스트 응답"
      },
      { signal: controller.signal }
    );
  });

  it("keeps the camera compatibility signal inside the client", async () => {
    const analysisInput = {
      situationText: "카메라 테스트 상황",
      faceSignal: "tense",
      faceSignalSource: "camera",
      faceSignalConfidence: 0.72,
      faceSignalEvidence: ["browDownLeft"],
      faceSignalHeuristicVersion: "v1",
      voiceSignal: "normal",
      selectedScenario: "normal"
    };
    const saveAnalysis = vi.fn(() => ({ id: "saved-camera-record" }));
    generateMockResponse.mockReturnValue("테스트 응답");

    await createEmotionAnalysisSubmission({
      sessionId: "session-id",
      analysisInput,
      analysisResult: { scores: [] },
      saveAnalysis
    });

    expect(saveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        faceSignal: null,
        faceSignalSource: "camera"
      }),
      { signal: undefined }
    );
  });

  it("uses a generated response before saving a guest record", async () => {
    const analysisInput = {
      situationText: "발표가 걱정돼.",
      faceSignal: "tense",
      faceSignalSource: "manual",
      faceSignalConfidence: null,
      faceSignalEvidence: [],
      faceSignalHeuristicVersion: null,
      voiceSignal: "normal",
      selectedScenario: "tension"
    };
    const generateResponse = vi.fn(async () => "그 걱정이 계속 마음에 남아 있구나.");
    const saveAnalysis = vi.fn(async (record) => record);
    generateMockResponse.mockReturnValue("로컬 대체 응답");

    const result = await createEmotionAnalysisSubmission({
      sessionId: "session-id",
      analysisInput,
      analysisResult: { scores: [] },
      recentMessages: [{ role: "ai", content: "무슨 일이 있었어?" }],
      generateResponse,
      saveAnalysis
    });

    expect(generateResponse).toHaveBeenCalledWith(
      {
        message: "발표가 걱정돼.",
        recentMessages: [{ role: "ai", content: "무슨 일이 있었어?" }],
        analysis: { scores: [] }
      },
      { signal: undefined }
    );
    expect(saveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        aiResponse: "그 걱정이 계속 마음에 남아 있구나."
      }),
      { signal: undefined }
    );
    expect(result.aiResponse).toBe("그 걱정이 계속 마음에 남아 있구나.");
  });

  it("falls back to the local response when generation is unavailable", async () => {
    generateMockResponse.mockReturnValue("무료 한도 초과 시 로컬 응답");
    const saveAnalysis = vi.fn(async (record) => record);

    const result = await createEmotionAnalysisSubmission({
      sessionId: "session-id",
      analysisInput: {
        situationText: "오늘 힘들어.",
        faceSignal: "neutral",
        faceSignalSource: "manual",
        voiceSignal: "normal",
        selectedScenario: "normal"
      },
      analysisResult: { scores: [] },
      generateResponse: vi.fn(async () => {
        throw new Error("quota exceeded");
      }),
      saveAnalysis
    });

    expect(result.aiResponse).toBe("무료 한도 초과 시 로컬 응답");
    expect(saveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        aiResponse: "무료 한도 초과 시 로컬 응답"
      }),
      { signal: undefined }
    );
  });

  it.each(["AI_RATE_LIMITED", "AI_RATE_LIMIT_EXCEEDED"])(
    "says Noa is sleeping when generation stops for %s",
    async (code) => {
      generateMockResponse.mockReturnValue("로컬 대체 응답");
      const saveAnalysis = vi.fn(async (record) => record);

      const result = await createEmotionAnalysisSubmission({
        sessionId: "session-id",
        analysisInput: {
          situationText: "조금 더 이야기하고 싶어.",
          faceSignal: "neutral",
          faceSignalSource: "manual",
          voiceSignal: "normal",
          selectedScenario: "normal"
        },
        analysisResult: { scores: [] },
        generateResponse: vi.fn(async () => {
          const error = new Error("AI limit reached");
          error.code = code;
          throw error;
        }),
        saveAnalysis
      });

      expect(result.aiResponse).toBe("Noa는 자고 있어요.");
      expect(saveAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ aiResponse: "Noa는 자고 있어요." }),
        { signal: undefined }
      );
    }
  );
});
