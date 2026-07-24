import { describe, expect, it } from "vitest";
import {
  RequestValidationError,
  validateCreateEmotionAnalysis
} from "./emotionAnalysisValidation";
import {
  createCameraAnalysisPayload,
  createManualAnalysisPayload
} from "../../../test/fixtures/emotionAnalysisFixtures";

describe("validateCreateEmotionAnalysis face metadata", () => {
  it("keeps old requests compatible as manual input", () => {
    const record = validateCreateEmotionAnalysis(
      createManualAnalysisPayload()
    );

    expect(record).toMatchObject({
      face_signal_source: "manual",
      face_signal_confidence: null,
      face_signal_evidence: [],
      face_signal_heuristic_version: null
    });
  });

  it("accepts only the limited stabilized camera summary", () => {
    const record = validateCreateEmotionAnalysis(
      createCameraAnalysisPayload({
      faceSignalConfidence: 0.72,
      faceSignalEvidence: ["browDownLeft", "eyeSquintLeft"]
      })
    );

    expect(record).toMatchObject({
      face_signal: null,
      face_signal_source: "camera",
      face_signal_confidence: 0.72,
      face_signal_evidence: ["browDownLeft", "eyeSquintLeft"],
      face_signal_heuristic_version: "v1"
    });
  });

  it("discards a legacy camera face signal from older clients", () => {
    const record = validateCreateEmotionAnalysis(
      createCameraAnalysisPayload({ faceSignal: "tense" })
    );

    expect(record.face_signal).toBeNull();
  });

  it("requires a face signal for manual input", () => {
    expect(() =>
      validateCreateEmotionAnalysis(
        createManualAnalysisPayload({ faceSignal: null })
      )
    ).toThrow(RequestValidationError);
  });

  it("rejects arbitrary or excessive camera evidence", () => {
    expect(() =>
      validateCreateEmotionAnalysis(
        createCameraAnalysisPayload({
        faceSignalConfidence: 0.72,
        faceSignalEvidence: ["fullLandmarks", "rawFrame", "deviceId", "extra"]
        })
      )
    ).toThrow(RequestValidationError);
  });

  it("rejects camera metadata attached to manual input", () => {
    expect(() =>
      validateCreateEmotionAnalysis(
        createManualAnalysisPayload({
        faceSignalConfidence: 0.72
        })
      )
    ).toThrow(RequestValidationError);
  });

  it("rejects oversized AI responses", () => {
    expect(() =>
      validateCreateEmotionAnalysis(
        createManualAnalysisPayload({
        aiResponse: "a".repeat(2001)
        })
      )
    ).toThrow(RequestValidationError);
  });

  it("rejects oversized analysis result JSON", () => {
    expect(() =>
      validateCreateEmotionAnalysis(
        createManualAnalysisPayload({
        analysisResult: { evidence: ["a".repeat(25_000)] }
        })
      )
    ).toThrow(RequestValidationError);
  });
});
