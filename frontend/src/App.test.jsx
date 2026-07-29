import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("cobe", () => ({
  default: () => ({
    update: vi.fn(),
    destroy: vi.fn()
  })
}));

const guestAccess = {
  mode: "anonymous",
  guestKey: "",
  issuedKey: "",
  status: "idle",
  error: "",
  createGuest: vi.fn(),
  recoverGuest: vi.fn(),
  useAnonymous: vi.fn()
};

vi.mock("./features/guest-access", async () => {
  const actual = await vi.importActual("./features/guest-access");
  return {
    ...actual,
    useGuestAccess: () => guestAccess
  };
});

vi.mock("./features/emotion-session", () => ({
  useEmotionSession: () => ({
    messages: [{ id: "welcome", role: "ai", content: "안녕" }],
    aiStatus: "waiting",
    selectedScenario: {
      value: "normal",
      faceSignal: "neutral",
      voiceSignal: "normal"
    },
    analysisStatus: "completed",
    emotionResult: {
      scores: [{ key: "neutral", label: "중립", score: 100 }],
      possibleStates: [],
      evidence: []
    },
    faceSignalMetadata: { source: "manual" },
    analysisError: "",
    observation: null,
    isInputDisabled: false,
    handleScenarioChange: vi.fn(),
    handleAnalyze: vi.fn(),
    handleAnalyzeAgain: vi.fn(),
    handleLiveFaceSignalChange: vi.fn()
  })
}));

describe("App view flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guestAccess.mode = "anonymous";
    guestAccess.guestKey = "";
    guestAccess.issuedKey = "";
  });

  it("moves from access to conversation and then to result", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "대화를 시작할까요?" })).toBeInTheDocument();
    expect(screen.queryByLabelText("카메라를 사용하는 대화")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "익명으로 시작" }));

    expect(screen.getByLabelText("카메라를 사용하는 대화")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "감정 신호 참고값" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "처음으로" }));
    expect(screen.getByRole("heading", { name: "대화를 시작할까요?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "익명으로 시작" }));

    fireEvent.click(screen.getByRole("button", { name: "감정 신호 보기" }));

    expect(screen.getByRole("heading", { name: "감정 신호 참고값" })).toBeInTheDocument();
    expect(screen.queryByLabelText("카메라를 사용하는 대화")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "처음으로" }));
    expect(screen.getByRole("heading", { name: "대화를 시작할까요?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "익명으로 시작" }));
    fireEvent.click(screen.getByRole("button", { name: "감정 신호 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "다시 대화하기" }));
    expect(screen.getByLabelText("카메라를 사용하는 대화")).toBeInTheDocument();
  });
});
