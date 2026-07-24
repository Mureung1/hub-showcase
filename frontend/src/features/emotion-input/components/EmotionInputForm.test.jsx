import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmotionInputForm from "./EmotionInputForm";

const scenarioPreset = {
  value: "normal",
  faceSignal: "neutral",
  voiceSignal: "normal"
};

describe("EmotionInputForm", () => {
  it("submits manual face metadata by default", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(true);
    render(<EmotionInputForm scenarioPreset={scenarioPreset} onAnalyze={onAnalyze} />);

    fireEvent.change(screen.getByLabelText("지금 겪고 있는 상황"), {
      target: { value: "오늘 발표가 걱정돼." }
    });
    fireEvent.click(screen.getByRole("button", { name: "긴장된 표정" }));
    fireEvent.click(screen.getByRole("button", { name: "분석하고 전송" }));

    expect(onAnalyze).toHaveBeenCalledWith({
      situationText: "오늘 발표가 걱정돼.",
      faceSignal: "tense",
      faceSignalSource: "manual",
      faceSignalConfidence: null,
      faceSignalEvidence: [],
      faceSignalHeuristicVersion: null,
      voiceSignal: "normal"
    });
  });

  it("keeps manual fallback available before camera detection stabilizes", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(true);
    render(<EmotionInputForm scenarioPreset={scenarioPreset} onAnalyze={onAnalyze} />);

    fireEvent.click(screen.getByRole("button", { name: "자동 감지" }));
    expect(
      screen.getByText("카메라 영상은 브라우저 안에서만 분석되며 서버나 데이터베이스에 저장되지 않습니다.")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("지금 겪고 있는 상황"), {
      target: { value: "카메라 없이도 계속할래." }
    });
    fireEvent.click(screen.getByRole("button", { name: "분석하고 전송" }));

    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({
        faceSignal: "neutral",
        faceSignalSource: "manual",
        faceSignalConfidence: null
      })
    );
  });
});
