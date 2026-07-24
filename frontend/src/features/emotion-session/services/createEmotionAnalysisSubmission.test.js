import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMockResponse } from "../../conversation";
import { createEmotionAnalysis } from "../api/emotionAnalysisApi";
import {
  createEmotionAnalysisSubmission
} from "./createEmotionAnalysisSubmission";

vi.mock("../../conversation", () => ({
  generateMockResponse: vi.fn()
}));

vi.mock("../api/emotionAnalysisApi", () => ({
  createEmotionAnalysis: vi.fn()
}));

describe("createEmotionAnalysisSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the response and sends one normalized API payload", async () => {
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
    generateMockResponse.mockReturnValue("테스트 응답");
    createEmotionAnalysis.mockResolvedValue(createdRecord);

    await expect(
      createEmotionAnalysisSubmission({
        sessionId: "session-id",
        analysisInput,
        analysisResult,
        signal: controller.signal
      })
    ).resolves.toEqual({
      aiResponse: "테스트 응답",
      createdRecord
    });

    expect(createEmotionAnalysis).toHaveBeenCalledWith(
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
    generateMockResponse.mockReturnValue("테스트 응답");
    createEmotionAnalysis.mockResolvedValue({ id: "saved-camera-record" });

    await createEmotionAnalysisSubmission({
      sessionId: "session-id",
      analysisInput,
      analysisResult: { scores: [] }
    });

    expect(createEmotionAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        faceSignal: null,
        faceSignalSource: "camera"
      }),
      { signal: undefined }
    );
  });
});
