import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { sampleAnalysis, sampleInput } from "./data/sampleAnalysis";
import type { AuthService, AuthSession } from "./services/auth";
import { ContextAnalysisRequestError, analyzeContext } from "./services/analyzeContext";
import type { PlatformApi } from "./services/platformApi";
import type { ContextAnalysisResult } from "./types/context";

vi.mock("./services/analyzeContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/analyzeContext")>();
  return { ...actual, analyzeContext: vi.fn() };
});

const analyzeContextMock = vi.mocked(analyzeContext);

beforeEach(() => {
  analyzeContextMock.mockReset();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
});

afterEach(() => vi.useRealTimers());

describe("public landing prototype", () => {
  it("starts empty and labels data as sample only after an explicit load", async () => {
    const user = userEvent.setup();
    render(<App auth={anonymousAuth()} />);

    expect(screen.getByText("분석 대기")).toBeInTheDocument();
    expect(screen.queryByText("샘플 데이터")).not.toBeInTheDocument();
    expect(screen.getByLabelText("프로젝트 이름")).toHaveValue("Modu Brain MVP");
    expect(screen.getByLabelText("회의록 / 메모 / 피드백")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));

    expect(screen.getByLabelText("프로젝트 이름")).toHaveValue(sampleAnalysis.projectTitle);
    expect(screen.getByLabelText("회의록 / 메모 / 피드백")).toHaveValue(sampleInput);
    expect(screen.getByText("샘플 데이터")).toBeInTheDocument();
  });

  it("prevents duplicate submission while loading and renders the provider on success", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (result: ContextAnalysisResult) => void = () => undefined;
    const pending = new Promise<ContextAnalysisResult>((resolve) => { resolveAnalysis = resolve; });
    const liveResult: ContextAnalysisResult = {
      ...sampleAnalysis,
      projectTitle: "실시간 분석 결과",
      summary: { ...sampleAnalysis.summary, projectTitle: "실시간 분석 결과" },
      provider: { mode: "mock", name: "local-heuristic", usedExternalModel: false },
    };
    analyzeContextMock.mockReturnValue(pending);
    render(<App auth={anonymousAuth()} />);

    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));

    expect(screen.getByRole("button", { name: "분석 중…" })).toBeDisabled();
    expect(screen.getByText("분석 중")).toBeInTheDocument();
    expect(analyzeContextMock).toHaveBeenCalledTimes(1);

    await act(async () => { resolveAnalysis(liveResult); await pending; });
    expect(await screen.findByText("local-heuristic 분석 결과")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "실시간 분석 결과" })).toBeInTheDocument();
  });

  it("cancels an in-flight request when the input changes", async () => {
    const user = userEvent.setup();
    let signal: AbortSignal | undefined;
    analyzeContextMock.mockImplementation((_title, _text, options) => {
      signal = options?.signal;
      return new Promise<ContextAnalysisResult>(() => undefined);
    });
    render(<App auth={anonymousAuth()} />);

    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));
    expect(signal?.aborted).toBe(false);
    await user.type(screen.getByLabelText("프로젝트 이름"), " 수정");
    expect(signal?.aborted).toBe(true);
    expect(screen.getByText("분석 대기")).toBeInTheDocument();
  });

  it("announces a structured API failure and never labels it as success", async () => {
    const user = userEvent.setup();
    analyzeContextMock.mockRejectedValue(new ContextAnalysisRequestError("회의록을 120자 이상 입력하세요.", 400, "RAW_TEXT_TOO_SHORT"));
    render(<App auth={anonymousAuth()} />);

    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("회의록을 120자 이상 입력하세요.");
    expect(screen.getByText("분석 오류")).toBeInTheDocument();
    expect(screen.queryByText(/분석 결과$/, { selector: ".demo-badge.success" })).not.toBeInTheDocument();
  });

  it("switches result panels and supports keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<App auth={anonymousAuth()} />);
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));

    const overview = screen.getByRole("tab", { name: "개요" });
    overview.focus();
    await user.keyboard("{ArrowRight}");
    const map = screen.getByRole("tab", { name: "지식맵" });
    expect(map).toHaveFocus();
    expect(map).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "공유 지식맵" })).toBeInTheDocument();

    await user.keyboard("{End}");
    const onboarding = screen.getByRole("tab", { name: "온보딩 요약" });
    expect(onboarding).toHaveFocus();
    expect(screen.getByRole("heading", { name: "새 팀원 온보딩 요약" })).toBeInTheDocument();
  });

  it("shows honest empty states when the provider finds no structured items", async () => {
    const user = userEvent.setup();
    analyzeContextMock.mockResolvedValue({
      ...sampleAnalysis,
      keyTerms: [], participants: [], decisions: [], questions: [],
      participantAgents: { ...sampleAnalysis.participantAgents, views: [], agreementPoints: [], tensionPoints: [] },
    });
    render(<App auth={anonymousAuth()} />);
    await user.click(screen.getByRole("button", { name: "샘플 불러오기" }));
    await user.click(screen.getByRole("button", { name: "맥락 분석하기" }));

    expect(await screen.findByText("입력 기록에서 명시적으로 확인된 결정사항이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("입력 기록에서 명시적으로 확인된 미해결 질문이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("입력 기록에서 참여자별 발언 주체를 구분할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("입력 기록에서 별도로 정의할 핵심 용어가 없습니다.")).toBeInTheDocument();
  });
});

describe("application routes", () => {
  it("sends a Supabase magic link from /login", async () => {
    window.history.replaceState(null, "", "/login");
    const user = userEvent.setup();
    const sendMagicLink = vi.fn().mockResolvedValue({ email: "team@example.com" });
    render(<App auth={anonymousAuth({ configured: true, sendMagicLink })} />);

    await user.type(screen.getByTestId("login-email"), "team@example.com");
    await user.click(screen.getByTestId("login-submit"));

    expect(sendMagicLink).toHaveBeenCalledWith("team@example.com", `${window.location.origin}/login`);
    expect(await screen.findByText("로그인 링크를 보냈습니다")).toBeInTheDocument();
  });

  it("loads the authenticated project list through the injected API", async () => {
    window.history.replaceState(null, "", "/projects");
    const session = signedInSession();
    const api = emptyApi();
    vi.mocked(api.listProjects).mockResolvedValue([{ id: "p1", title: "공모전", description: "시연 프로젝트", archivedAt: null, createdAt: "2026-07-10T00:00:00Z", updatedAt: "2026-07-11T00:00:00Z", sourceCount: 3, analysisCount: 1 }]);

    render(<App auth={anonymousAuth({ session })} api={api} />);

    expect(await screen.findByRole("heading", { name: "내 프로젝트" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /공모전/ })).toHaveTextContent("기록 3 · 분석 1");
    expect(api.listProjects).toHaveBeenCalledWith(session.accessToken);
  });

  it("refreshes the session before expiry and clears it with a login notice on failure", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-07-11T00:00:00Z");
    vi.setSystemTime(now);
    const initial = {
      ...signedInSession(),
      expiresAt: now.getTime() + 120_000,
    };
    const refreshed = {
      ...initial,
      accessToken: "refreshed-access-token",
      expiresAt: now.getTime() + 180_000,
    };
    const refreshSession = vi
      .fn<AuthService["refreshSession"]>()
      .mockResolvedValueOnce(refreshed)
      .mockRejectedValueOnce(new Error("refresh expired"));
    const auth = anonymousAuth({ session: initial, refreshSession });

    render(<App auth={auth} />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(refreshSession).toHaveBeenNthCalledWith(1, initial);

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(refreshSession).toHaveBeenNthCalledWith(2, refreshed);
    expect(screen.getByRole("alert")).toHaveTextContent("다시 로그인해 주세요.");
    expect(screen.getByRole("link", { name: "로그인" })).toBeInTheDocument();
  });
});

function anonymousAuth(options: {
  configured?: boolean;
  session?: AuthSession | null;
  sendMagicLink?: AuthService["sendMagicLink"];
  refreshSession?: AuthService["refreshSession"];
} = {}): AuthService {
  return {
    isConfigured: () => options.configured ?? false,
    restoreSession: vi.fn().mockResolvedValue(options.session ?? null),
    refreshSession:
      options.refreshSession ?? vi.fn().mockRejectedValue(new Error("not configured")),
    consumeCallback: vi.fn().mockResolvedValue(null),
    sendMagicLink: options.sendMagicLink ?? vi.fn().mockRejectedValue(new Error("not configured")),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

function signedInSession(): AuthSession {
  return { accessToken: "access-token", refreshToken: "refresh-token", expiresAt: Date.now() + 3_600_000, user: { id: "u1", email: "team@example.com" } };
}

function emptyApi(): PlatformApi {
  return {
    getCapabilities: vi.fn().mockResolvedValue({ openaiEnabled: false }),
    listProjects: vi.fn(), createProject: vi.fn(), getProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(),
    listSources: vi.fn(), createSource: vi.fn(), importContext: vi.fn(), updateSource: vi.fn(), deleteSource: vi.fn(), listSourceSegments: vi.fn(),
    listAnalysisRuns: vi.fn(), createAnalysisRun: vi.fn(), getAnalysisRun: vi.fn(), deleteAnalysisRun: vi.fn(),
    listShareLinks: vi.fn(), createShareLink: vi.fn(), revokeShareLink: vi.fn(), resolveSharedAnalysis: vi.fn(),
  };
}
