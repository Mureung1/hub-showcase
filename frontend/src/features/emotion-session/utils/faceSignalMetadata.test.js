import { describe, expect, it } from "vitest";
import {
  createManualFaceSignalMetadata,
  normalizeFaceSignalMetadata,
  toFaceSignalPayload
} from "./faceSignalMetadata";

describe("faceSignalMetadata", () => {
  it("creates independent manual metadata values", () => {
    const first = createManualFaceSignalMetadata();
    const second = createManualFaceSignalMetadata();

    expect(first).toEqual({
      source: "manual",
      confidence: null,
      evidence: [],
      heuristicVersion: null
    });
    expect(first.evidence).not.toBe(second.evidence);
  });

  it("normalizes an API record and applies safe defaults", () => {
    expect(
      normalizeFaceSignalMetadata({
        faceSignalSource: "camera",
        faceSignalConfidence: 0.72,
        faceSignalEvidence: ["browDownLeft"],
        faceSignalHeuristicVersion: "v1"
      })
    ).toEqual({
      source: "camera",
      confidence: 0.72,
      evidence: ["browDownLeft"],
      heuristicVersion: "v1"
    });

    expect(normalizeFaceSignalMetadata({})).toEqual(
      createManualFaceSignalMetadata()
    );
  });

  it("maps metadata to API payload fields", () => {
    expect(
      toFaceSignalPayload({
        source: "camera",
        confidence: 0.6,
        evidence: ["eyeSquintLeft"],
        heuristicVersion: "v1"
      })
    ).toEqual({
      faceSignalSource: "camera",
      faceSignalConfidence: 0.6,
      faceSignalEvidence: ["eyeSquintLeft"],
      faceSignalHeuristicVersion: "v1"
    });
  });
});
