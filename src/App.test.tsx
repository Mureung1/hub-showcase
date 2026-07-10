import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { sampleAnalysis, sampleInput } from "./data/sampleAnalysis";
import { ContextAnalysisRequestError, analyzeContext } from "./services/analyzeContext";
import type { ContextAnalysisResult } from "./types/context";

vi.mock("./services/analyzeContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/analyzeContext")>();
  return { ...actual, analyzeContext: vi.fn() };
});

const analyzeContextMock = vi.mocked(analyzeContext);

beforeEach(() => {
  analyzeContextMock.mockReset();
});

describe("App", () => {
  it("starts empty and labels data as sample only after an explicit load", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("분석 대기")).toBeInTheDocument();
    expect(screen.queryByText("예시 데이터 데모")).not.toBeInTheDocument();
    expect(screen.getByLabelText("프로젝트 이름")).toHaveValue("모두의 뇌 MVP");
    expect(screen.getByLabelText("회의록 / 메모 / 피드백")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "예시 불러오기" }));

    expect(screen.getByLabelText("프로젝트 이름")).toHaveValue(sampleAnalysis.projectTitle);
    expect(screen.getByLabelText("회의록 / 메모 / 피드백")).toHaveValue(sampleInput);
    expect(screen.getByText("예시 데이터 데모")).toBeInTheDocument();
  });

  it("prevents duplicate submission while loading and renders the provider on success", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (result: ContextAnalysisResult) => void = () => undefined;
    const pendingAnalysis = new Promise<ContextAnalysisResult>((resolve) => {
      resolveAnalysis = resolve;
    });
    const liveResult: ContextAnalysisResult = {
      ...sampleAnalysis,
      projectTitle: "실시간 분석 결과",
      summary: { ...sampleAnalysis.summary, projectTitle: "실시간 분석 결과" },
      provider: { mode: "mock", name: "local-heuristic", usedExternalModel: false },
    };
    analyzeContextMock.mockReturnValue(pendingAnalysis);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "예시 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));

    expect(screen.getByRole("button", { name: "분석 중" })).toBeDisabled();
    expect(screen.getByText("API 분석 중")).toBeInTheDocument();
    expect(analyzeContextMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAnalysis(liveResult);
      await pendingAnalysis;
    });

    expect(await screen.findByText("local-heuristic 분석 결과")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "실시간 분석 결과" })).toBeInTheDocument();
    expect(screen.getByText("분석 API 응답을 기준으로 결과가 갱신되었습니다.")).toBeInTheDocument();
  });

  it("cancels an in-flight request when the input changes", async () => {
    const user = userEvent.setup();
    let capturedSignal: AbortSignal | undefined;
    analyzeContextMock.mockImplementation((_title, _text, options) => {
      capturedSignal = options?.signal;
      return new Promise<ContextAnalysisResult>(() => undefined);
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "예시 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));
    expect(capturedSignal?.aborted).toBe(false);

    await user.type(screen.getByLabelText("프로젝트 이름"), " 수정");

    expect(capturedSignal?.aborted).toBe(true);
    expect(screen.getByText("분석 대기")).toBeInTheDocument();
  });

  it("announces a structured API failure and never labels it as success", async () => {
    const user = userEvent.setup();
    analyzeContextMock.mockRejectedValue(
      new ContextAnalysisRequestError("회의록을 120자 이상 입력하세요.", 400, "RAW_TEXT_TOO_SHORT"),
    );
    render(<App />);

    await user.click(screen.getByRole("button", { name: "예시 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("회의록을 120자 이상 입력하세요.");
    expect(screen.getByText("분석 오류")).toBeInTheDocument();
    expect(screen.queryByText(/분석 결과$/, { selector: ".demo-badge.success" })).not.toBeInTheDocument();
  });

  it("switches between overview, map, and onboarding result panels", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "예시 불러오기" }));

    const mapTab = screen.getByRole("tab", { name: "지식맵" });
    const onboardingTab = screen.getByRole("tab", { name: "온보딩 요약" });

    await user.click(mapTab);
    expect(mapTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "공유 지식맵" })).toBeInTheDocument();

    await user.click(onboardingTab);
    expect(onboardingTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "새 팀원 온보딩 요약" })).toBeInTheDocument();
  });

  it("supports arrow-key navigation for the result tabs", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "예시 불러오기" }));
    const overviewTab = screen.getByRole("tab", { name: "개요" });
    overviewTab.focus();

    await user.keyboard("{ArrowRight}");
    const mapTab = screen.getByRole("tab", { name: "지식맵" });
    expect(mapTab).toHaveFocus();
    expect(mapTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-map");

    await user.keyboard("{End}");
    const onboardingTab = screen.getByRole("tab", { name: "온보딩 요약" });
    expect(onboardingTab).toHaveFocus();
    expect(onboardingTab).toHaveAttribute("aria-selected", "true");
  });

  it("shows honest empty states when the provider finds no decisions or open questions", async () => {
    const user = userEvent.setup();
    analyzeContextMock.mockResolvedValue({
      ...sampleAnalysis,
      keyTerms: [],
      participants: [],
      decisions: [],
      questions: [],
      participantAgents: {
        ...sampleAnalysis.participantAgents,
        views: [],
        agreementPoints: [],
        tensionPoints: [],
      },
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "예시 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));

    expect(
      await screen.findByText("입력 기록에서 명시적으로 확인된 결정사항이 없습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("입력 기록에서 명시적으로 확인된 미결 질문이 없습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("입력 기록에서 참여자별 발언 주체를 구분할 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("입력 기록에서 구분할 수 있는 참여자 관점이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("입력 기록에서 별도로 정의할 핵심 용어가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("명확하게 확인된 공통 합의가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("명확하게 확인된 관점 충돌이 없습니다.")).toBeInTheDocument();
  });
});
