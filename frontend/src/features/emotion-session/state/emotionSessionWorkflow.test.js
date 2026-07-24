import { describe, expect, it } from "vitest";
import {
  createInitialWorkflowState,
  emotionSessionWorkflowReducer
} from "./emotionSessionWorkflow";

function reduce(actions) {
  return actions.reduce(
    emotionSessionWorkflowReducer,
    createInitialWorkflowState()
  );
}

describe("emotionSessionWorkflowReducer", () => {
  it("moves through analyze, save success, speaking, and waiting", () => {
    expect(
      reduce([
        { type: "ANALYSIS_STARTED" },
        { type: "SAVE_SUCCEEDED" },
        { type: "AI_FINISHED" }
      ])
    ).toEqual({
      analysisStatus: "completed",
      aiStatus: "waiting",
      analysisError: "",
      isSaving: false
    });
  });

  it("moves to a consistent error state when saving fails", () => {
    expect(
      reduce([
        { type: "ANALYSIS_STARTED" },
        { type: "FAILED", error: "저장 실패" }
      ])
    ).toEqual({
      analysisStatus: "error",
      aiStatus: "waiting",
      analysisError: "저장 실패",
      isSaving: false
    });
  });

  it("supports local reanalysis without entering saving state", () => {
    expect(
      reduce([
        { type: "REANALYSIS_STARTED" },
        { type: "ANALYSIS_COMPLETED" }
      ])
    ).toEqual({
      analysisStatus: "completed",
      aiStatus: "waiting",
      analysisError: "",
      isSaving: false
    });
  });

  it("clears a previous error when analysis completes", () => {
    expect(
      reduce([
        { type: "FAILED", error: "이전 오류" },
        { type: "ANALYSIS_COMPLETED" }
      ])
    ).toEqual(createInitialWorkflowState());
  });
});
