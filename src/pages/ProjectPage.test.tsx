import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleAnalysis } from "../data/sampleAnalysis";
import { PlatformApiError, type PlatformApi } from "../services/platformApi";
import type { AnalysisRunResource, ProjectResource, SourceRecordResource } from "../types/platform";
import ProjectPage from "./ProjectPage";

const project: ProjectResource = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "캠퍼스 공모전",
  description: "공개 시연 프로젝트",
  archivedAt: null,
  createdAt: "2026-07-10T00:00:00Z",
  updatedAt: "2026-07-11T00:00:00Z",
};

const source: SourceRecordResource = {
  id: "22222222-2222-4222-8222-222222222222",
  projectId: project.id,
  kind: "meeting",
  title: "첫 기획 회의",
  content: "팀은 직접 입력 방식으로 MVP를 시작하기로 결정했다. ".repeat(4),
  charCount: 124,
  occurredAt: null,
  archivedAt: null,
  createdAt: "2026-07-10T00:00:00Z",
  updatedAt: "2026-07-10T00:00:00Z",
};

const previousRun = run("33333333-3333-4333-8333-333333333333", "2026-07-10T01:00:00Z", sampleAnalysis);
const latestResult = {
  ...sampleAnalysis,
  decisions: [
    { ...sampleAnalysis.decisions[0], reason: "사용성 검증 결과로 변경됨" },
    ...sampleAnalysis.decisions.slice(1),
  ],
};
const latestRun = run("44444444-4444-4444-8444-444444444444", "2026-07-11T01:00:00Z", latestResult);

describe("ProjectPage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: vi.fn(() => "55555555-5555-4555-8555-555555555555"), configurable: true });
  });

  it("supports the persistent source → analysis → evidence → share workflow", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([previousRun]);
    const feedback: SourceRecordResource = {
      ...source,
      id: "66666666-6666-4666-8666-666666666666",
      kind: "feedback",
      title: "멘토 피드백",
      content: "근거를 먼저 보여주면 서비스 차이가 분명해진다.",
      charCount: 27,
    };
    vi.mocked(api.createSource).mockResolvedValue(feedback);
    vi.mocked(api.createAnalysisRun).mockResolvedValue(latestRun);
    vi.mocked(api.listShareLinks).mockResolvedValue([]);
    vi.mocked(api.createShareLink).mockResolvedValue({
      id: "77777777-7777-4777-8777-777777777777",
      analysisRunId: latestRun.id,
      token: "share-token-abcdefghijklmnopqrstuvwxyz123456",
      expiresAt: "2026-07-18T01:00:00Z",
      revokedAt: null,
      createdAt: "2026-07-11T01:01:00Z",
    });
    vi.mocked(api.revokeShareLink).mockResolvedValue(undefined);

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByTestId("analysis-mode-openai")).toBeDisabled();
    expect(screen.getByText(/로컬 분석만 사용할 수 있습니다/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "기록" }));
    await user.selectOptions(screen.getByTestId("source-create-kind"), "feedback");
    await user.type(screen.getByTestId("source-create-title"), "멘토 피드백");
    await user.type(screen.getByTestId("source-create-content"), feedback.content);
    await user.click(screen.getByTestId("source-create-submit"));
    expect(await screen.findByRole("heading", { name: "멘토 피드백" })).toBeInTheDocument();
    expect(api.createSource).toHaveBeenCalledWith("access", project.id, expect.objectContaining({ kind: "feedback", title: "멘토 피드백" }));

    await user.click(screen.getByRole("tab", { name: "개요" }));
    await user.click(screen.getByTestId("analysis-submit"));
    expect(await screen.findByRole("heading", { name: "분석 이력" })).toBeInTheDocument();
    expect(api.createAnalysisRun).toHaveBeenCalledWith(
      "access",
      project.id,
      expect.objectContaining({ mode: "local", sourceIds: expect.arrayContaining([source.id, feedback.id]) }),
      "55555555-5555-4555-8555-555555555555",
      expect.any(AbortSignal),
    );
    expect(screen.getByText("변경", { selector: ".change-chip" })).toBeInTheDocument();

    await user.click(within(screen.getByRole("region", { name: "결정사항" })).getByRole("button", { name: "근거 1개" }));
    expect(screen.getByRole("dialog", { name: "분석 근거" })).toBeInTheDocument();
    expect(screen.getByText(/팀은 MVP에서 메신저 자동 연동/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "닫기" }));

    await user.click(screen.getByRole("tab", { name: "지식맵" }));
    expect(screen.getByRole("heading", { name: "공유 지식맵" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "온보딩" }));
    expect(await screen.findByRole("heading", { name: "온보딩 링크 공유" })).toBeInTheDocument();
    await user.click(screen.getByTestId("share-create"));
    const shareInput = await screen.findByLabelText("새 공유 링크");
    expect((shareInput as HTMLInputElement).value).toContain("/share#token=");
    await user.click(screen.getByTestId("share-revoke-77777777-7777-4777-8777-777777777777"));
    await waitFor(() => expect(api.revokeShareLink).toHaveBeenCalledWith("access", "77777777-7777-4777-8777-777777777777"));
  });

  it("shows load errors and preserves the project-not-found boundary", async () => {
    const api = apiMock();
    vi.mocked(api.getProject).mockRejectedValue(new Error("프로젝트를 찾을 수 없습니다."));
    vi.mocked(api.listSources).mockResolvedValue([]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("프로젝트를 찾을 수 없습니다.");
  });

  it("requires explicit consent for OpenAI analysis and displays provider failures", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(api.getCapabilities).mockResolvedValue({ openaiEnabled: true });
    vi.mocked(api.createAnalysisRun).mockRejectedValue(new Error("외부 모델을 사용할 수 없습니다."));
    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });

    await user.click(screen.getByTestId("analysis-mode-openai"));
    expect(screen.getByTestId("analysis-submit")).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /OpenAI API에 전송/ }));
    await user.click(screen.getByTestId("analysis-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("외부 모델을 사용할 수 없습니다.");
  });

  it("reuses the same idempotency key when a network outcome is unknown", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(crypto.randomUUID)
      .mockReturnValueOnce("55555555-5555-4555-8555-555555555555")
      .mockReturnValueOnce("88888888-8888-4888-8888-888888888888");
    vi.mocked(api.createAnalysisRun)
      .mockRejectedValueOnce(
        new PlatformApiError("분석 서버에 연결할 수 없습니다.", 0, "NETWORK_ERROR"),
      )
      .mockResolvedValueOnce(latestRun);
    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });

    await user.click(screen.getByTestId("analysis-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("연결할 수 없습니다");
    await user.click(screen.getByTestId("analysis-submit"));
    await screen.findByRole("heading", { name: "분석 이력" });

    const firstKey = vi.mocked(api.createAnalysisRun).mock.calls[0][3];
    const secondKey = vi.mocked(api.createAnalysisRun).mock.calls[1][3];
    expect(firstKey).toBe("55555555-5555-4555-8555-555555555555");
    expect(secondKey).toBe(firstKey);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("starts a new idempotency attempt after an HTTP error response", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(crypto.randomUUID)
      .mockReturnValueOnce("55555555-5555-4555-8555-555555555555")
      .mockReturnValueOnce("88888888-8888-4888-8888-888888888888");
    vi.mocked(api.createAnalysisRun)
      .mockRejectedValueOnce(
        new PlatformApiError("분석 서버가 일시적으로 응답하지 않습니다.", 503, "UPSTREAM_ERROR"),
      )
      .mockResolvedValueOnce(latestRun);
    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });

    await user.click(screen.getByTestId("analysis-submit"));
    await screen.findByRole("alert");
    await user.click(screen.getByTestId("analysis-submit"));
    await screen.findByRole("heading", { name: "분석 이력" });

    expect(vi.mocked(api.createAnalysisRun).mock.calls.map((call) => call[3])).toEqual([
      "55555555-5555-4555-8555-555555555555",
      "88888888-8888-4888-8888-888888888888",
    ]);
  });

  it("archives by default and gates irreversible deletion behind an exact confirmation", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const navigate = vi.fn();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(api.deleteProject).mockResolvedValue(undefined);
    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={navigate} />);
    await screen.findByRole("heading", { name: project.title });

    expect(screen.getByRole("button", { name: "영구 삭제" })).toBeDisabled();
    await user.type(screen.getByLabelText("영구 삭제 확인"), "delete");
    expect(screen.getByRole("button", { name: "영구 삭제" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "프로젝트 보관" }));
    expect(api.deleteProject).toHaveBeenCalledWith("access", project.id, false);
    expect(navigate).toHaveBeenCalledWith("/projects");
  });
});

function run(id: string, createdAt: string, result: typeof sampleAnalysis): AnalysisRunResource {
  return {
    id,
    projectId: project.id,
    status: "succeeded",
    schemaVersion: "2.0",
    sourceIds: [source.id],
    provider: { mode: "local" },
    result,
    createdAt,
    completedAt: createdAt,
  };
}

function apiMock(): PlatformApi {
  return {
    getCapabilities: vi.fn().mockResolvedValue({ openaiEnabled: false }),
    listProjects: vi.fn(), createProject: vi.fn(), getProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(),
    listSources: vi.fn(), createSource: vi.fn(), updateSource: vi.fn(), deleteSource: vi.fn(),
    listAnalysisRuns: vi.fn(), createAnalysisRun: vi.fn(), getAnalysisRun: vi.fn(), deleteAnalysisRun: vi.fn(),
    listShareLinks: vi.fn(), createShareLink: vi.fn(), revokeShareLink: vi.fn(), resolveSharedAnalysis: vi.fn(),
  };
}
