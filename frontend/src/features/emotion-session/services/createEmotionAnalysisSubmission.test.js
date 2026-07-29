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
    expect(saveAnalysis).toHaveBeenCalledWith({
      sessionId: "session-id",
      ...analysisInput,
      analysisResult,
      aiResponse: "테스트 응답"
    });
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
      })
    );
  });
});
