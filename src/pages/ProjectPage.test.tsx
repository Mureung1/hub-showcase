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
  retentionDays: 90,
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
    window.history.replaceState(null, "", `/projects/${project.id}`);
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: vi.fn(() => "55555555-5555-4555-8555-555555555555"), configurable: true });
  });

  it("opens a deep-linked project view and keeps tab state in the URL", async () => {
    window.history.replaceState(null, "", `/projects/${project.id}?tab=map`);
    const api = apiMock();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([latestRun]);
    vi.mocked(api.listShareLinks).mockResolvedValue([]);

    const user = userEvent.setup();
    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);

    expect(await screen.findByRole("tab", { name: "지식맵" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "온보딩 요약" }));
    expect(window.location.search).toBe("?tab=onboarding");
    await user.click(screen.getByRole("tab", { name: "개요" }));
    await user.click(screen.getByRole("tab", { name: "분석 이력" }));
    expect(window.location.search).toBe("");
  });

  it("supports the persistent source → analysis → evidence → share workflow", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
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
    const linkedEvidence = latestRun.result!.decisions[0].evidence![0];
    vi.mocked(api.listSourceSegments).mockResolvedValue([
      {
        id: "abababab-abab-4bab-8bab-abababababab",
        sourceRecordId: linkedEvidence.sourceRecordId,
        ordinal: 0,
        speaker: "서준",
        text: linkedEvidence.quote,
        occurredAt: "2026-07-11T00:30:00Z",
        externalId: "message-1",
        sourceUrl: "https://teams.microsoft.com/l/message/message-1",
      },
    ]);
    vi.mocked(api.listShareLinks).mockResolvedValue([]);
    vi.mocked(api.createShareLink).mockResolvedValue({
      id: "77777777-7777-4777-8777-777777777777",
      analysisRunId: latestRun.id,
      token: "share-token-abcdefghijklmnopqrstuvwxyz123456",
      disclosureMode: "summary",
      includeProjectTitle: false,
      expiresAt: "2026-07-18T01:00:00Z",
      revokedAt: null,
      createdAt: "2026-07-11T01:01:00Z",
    });
    vi.mocked(api.revokeShareLink).mockResolvedValue(undefined);

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(within(screen.getByRole("tablist", { name: "프로젝트 보기" })).getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "지금 팀이 먼저 볼 맥락" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: sampleAnalysis.projectTitle })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "분석 실행" }));
    expect(screen.getByTestId("analysis-mode-openai")).toBeDisabled();
    expect(screen.getByText(/로컬 분석만 사용할 수 있습니다/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "기록" }));
    await user.selectOptions(screen.getByTestId("source-create-kind"), "feedback");
    await user.type(screen.getByTestId("source-create-title"), "멘토 피드백");
    await user.type(screen.getByTestId("source-create-content"), feedback.content);
    await user.click(screen.getByTestId("source-create-submit"));
    expect(await screen.findByRole("heading", { name: "멘토 피드백" })).toBeInTheDocument();
    expect(api.createSource).toHaveBeenCalledWith("access", project.id, expect.objectContaining({ kind: "feedback", title: "멘토 피드백" }));

    await user.click(screen.getByRole("tab", { name: "분석 실행" }));
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
    expect(screen.getByRole("heading", { name: "MVP는 사용자가 직접 텍스트를 붙여 넣는 방식으로 시작한다." })).toBeInTheDocument();
    const decisionRegion = screen.getByRole("region", { name: "결정사항" });
    const perspectiveRegion = screen.getByRole("region", { name: "참여자별 관점 차이" });
    expect(
      decisionRegion.compareDocumentPosition(perspectiveRegion) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(within(decisionRegion).getByRole("button", { name: "근거 1개" }));
    expect(screen.getByRole("dialog", { name: "분석 근거" })).toBeInTheDocument();
    expect(screen.getByText(/메신저 자동 연동과 실시간 녹음은 초기 구현 범위를 크게 늘리기 때문에/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "외부 원문 위치 열기" })).toHaveAttribute(
      "href",
      "https://teams.microsoft.com/l/message/message-1",
    );
    await user.click(screen.getByRole("button", { name: "닫기" }));

    await user.click(screen.getByRole("tab", { name: "지식맵" }));
    expect(screen.getByRole("heading", { name: "공유 지식맵" })).toBeInTheDocument();
    await user.click(screen.getByTestId("brain-node-brain-decision-decision-direct-input"));
    const brainInspector = screen.getByRole("complementary", { name: "선택한 생각 상세" });
    expect(within(brainInspector).getByRole("heading", { name: sampleAnalysis.decisions[0].decision })).toBeInTheDocument();
    await user.click(within(brainInspector).getByRole("button", { name: "근거 1개 열기" }));
    expect(screen.getByRole("dialog", { name: "분석 근거" })).toBeInTheDocument();
    expect(api.listSourceSegments).toHaveBeenCalledWith("access", "sample-meeting");
    await user.click(screen.getByRole("button", { name: "닫기" }));

    await user.click(screen.getByRole("tab", { name: "온보딩 요약" }));
    expect(await screen.findByRole("heading", { name: "온보딩 링크 공유" })).toBeInTheDocument();
    await user.click(screen.getByTestId("share-create"));
    expect(api.createShareLink).toHaveBeenCalledWith("access", latestRun.id, {
      disclosureMode: "summary",
      includeProjectTitle: false,
      expiresInDays: 7,
    });
    const shareInput = await screen.findByLabelText("새 공유 링크");
    expect((shareInput as HTMLInputElement).value).toContain("/share#token=");
    await user.click(screen.getByRole("button", { name: "링크 복사" }));
    expect(clipboardWrite).toHaveBeenCalledWith((shareInput as HTMLInputElement).value);
    expect(screen.getByText("공유 링크를 클립보드에 복사했습니다.")).toBeInTheDocument();
    await user.click(screen.getByTestId("share-revoke-77777777-7777-4777-8777-777777777777"));
    expect(screen.getByRole("alertdialog", { name: "이 공유 링크를 폐기할까요?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "폐기 확인" }));
    await waitFor(() => expect(api.revokeShareLink).toHaveBeenCalledWith("access", "77777777-7777-4777-8777-777777777777"));
  });

  it("previews evidence disclosure and requires explicit confirmation before sharing quotes", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const evidence = latestRun.result!.decisions[0].evidence![0];
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([latestRun]);
    vi.mocked(api.listShareLinks).mockResolvedValue([]);
    vi.mocked(api.createShareLink).mockResolvedValue({
      id: "79797979-7979-4797-8797-797979797979",
      analysisRunId: latestRun.id,
      token: "evidence-token-abcdefghijklmnopqrstuvwxyz",
      disclosureMode: "evidence",
      includeProjectTitle: true,
      expiresAt: "2026-07-12T01:00:00Z",
      revokedAt: null,
      createdAt: "2026-07-11T01:01:00Z",
    });

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByRole("tab", { name: "온보딩 요약" }));
    await user.click(screen.getByRole("radio", { name: "근거 포함 공유" }));

    const preview = screen.getByRole("region", { name: "공유된 분석 요약" });
    expect(within(preview).getByText(evidence.sourceTitle)).toBeInTheDocument();
    expect(within(preview).getByText(evidence.quote, { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("공유 링크 만료")).toHaveValue("1");
    expect(screen.getByTestId("share-create")).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "프로젝트 제목도 공개" }));
    expect(within(preview).getByRole("heading", { name: project.title })).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /민감정보 공개 가능성을 확인/ }));
    await user.click(screen.getByTestId("share-create"));

    expect(api.createShareLink).toHaveBeenCalledWith("access", latestRun.id, {
      disclosureMode: "evidence",
      includeProjectTitle: true,
      expiresInDays: 1,
      acknowledgeSensitiveEvidence: true,
    });
  });

  it("shows retention deletion candidates and confirms a shorter policy before saving", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const expiredSource = {
      ...source,
      id: "89898989-8989-4898-8898-898989898989",
      occurredAt: "2025-01-01T00:00:00Z",
      createdAt: "2025-01-01T00:00:00Z",
    };
    const affectedRun = { ...latestRun, sourceIds: [expiredSource.id] };
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([expiredSource]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([affectedRun]);
    vi.mocked(api.updateProject).mockResolvedValue({ ...project, retentionDays: 30 });

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByRole("tab", { name: "분석 실행" }));
    await user.selectOptions(screen.getByLabelText("기본 보관 기간"), "30");

    const confirmation = screen.getByRole("note", { name: "보관 기간 단축 확인" });
    expect(confirmation).toHaveTextContent("원문 1건 · 연관 분석 1건");
    expect(screen.getByRole("button", { name: "정보 저장" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /삭제 예정 범위와 연관 분석/ }));
    await user.click(screen.getByRole("button", { name: "정보 저장" }));

    expect(api.updateProject).toHaveBeenCalledWith("access", project.id, expect.objectContaining({
      retentionDays: 30,
      acknowledgeRetentionReduction: true,
    }));
  });

  it("shows the verified agent trace and persists human review annotations", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([latestRun]);
    vi.mocked(api.listAnalysisRunStepEvents).mockResolvedValue([
      {
        id: "event-1",
        analysisRunId: latestRun.id,
        sequence: 1,
        eventKey: "source_snapshot:succeeded",
        step: "source_snapshot",
        status: "succeeded",
        validationOutcome: null,
        code: "SNAPSHOT_READY",
        durationMs: 4,
        sourceCount: 1,
        inputCharacters: 124,
        outputItemCount: null,
        evidenceReferenceCount: null,
        createdAt: latestRun.createdAt,
      },
      {
        id: "event-2",
        analysisRunId: latestRun.id,
        sequence: 2,
        eventKey: "evidence_validation:succeeded",
        step: "evidence_validation",
        status: "succeeded",
        validationOutcome: "passed",
        code: "EVIDENCE_VERIFIED",
        durationMs: 3,
        sourceCount: null,
        inputCharacters: null,
        outputItemCount: 12,
        evidenceReferenceCount: 7,
        createdAt: latestRun.createdAt,
      },
    ]);
    vi.mocked(api.listAnalysisRunAnnotations).mockResolvedValue([]);
    vi.mocked(api.createAnalysisRunAnnotation).mockResolvedValue({
      id: "annotation-1",
      analysisRunId: latestRun.id,
      annotationType: "correction",
      target: { type: "run" },
      body: "참여자 화자를 다시 확인해야 합니다.",
      createdAt: latestRun.createdAt,
    });

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByRole("tab", { name: "분석 이력" }));

    expect(await screen.findByRole("heading", { name: "분석 실행 영수증" })).toBeInTheDocument();
    expect(await screen.findByText("7개", { selector: ".agent-execution-metrics dd" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("메모"), "참여자 화자를 다시 확인해야 합니다.");
    await user.click(screen.getByRole("button", { name: "검토 이력 저장" }));

    expect(api.createAnalysisRunAnnotation).toHaveBeenCalledWith(
      "access",
      latestRun.id,
      expect.objectContaining({
        annotationType: "correction",
        targetType: "run",
      }),
      "55555555-5555-4555-8555-555555555555",
    );
    expect(await screen.findByText("참여자 화자를 다시 확인해야 합니다.")).toBeInTheDocument();
  }, 15_000);

  it("deletes a selected analysis only after explicit confirmation", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([latestRun, previousRun]);
    vi.mocked(api.deleteAnalysisRun).mockResolvedValue(undefined);

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByRole("tab", { name: "분석 이력" }));

    const runList = screen.getByRole("complementary", { name: "분석 실행 이력" });
    expect(within(runList).getAllByText("성공", { selector: ".run-status" })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "선택한 분석 삭제" }));
    expect(screen.getByRole("alertdialog", { name: "이 분석 이력을 삭제할까요?" })).toBeInTheDocument();
    expect(api.deleteAnalysisRun).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "분석 삭제 확인" }));

    await waitFor(() => expect(api.deleteAnalysisRun).toHaveBeenCalledWith("access", latestRun.id));
    expect(within(runList).getAllByText("성공", { selector: ".run-status" })).toHaveLength(1);
    expect(screen.queryByRole("alertdialog", { name: "이 분석 이력을 삭제할까요?" })).not.toBeInTheDocument();
  });

  it("imports account-free external context and exposes its provenance", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const importedSource: SourceRecordResource = {
      ...source,
      id: "99999999-9999-4999-8999-999999999999",
      title: "Teams 제품 회의",
      content: "서준: 이번 주에 사용자 테스트를 진행합니다.",
      charCount: 27,
      import: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        provider: "teams",
        participants: ["서준", "민지"],
        segmentCount: 2,
        importedAt: "2026-07-11T02:00:00Z",
      },
    };
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(api.importContext).mockResolvedValue({
      source: importedSource,
      importId: importedSource.import!.id,
      provider: "teams",
      participants: importedSource.import!.participants,
      segmentCount: 2,
      duplicate: false,
    });

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByRole("tab", { name: "기록" }));
    const importDisclosure = screen.getByText("외부 회의 맥락 가져오기").closest("details");
    expect(importDisclosure).not.toHaveAttribute("open");
    await user.click(screen.getByText("외부 회의 맥락 가져오기"));
    expect(importDisclosure).toHaveAttribute("open");
    expect(screen.getByText("계정 연결 없음")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Teams JSON/ }));
    await user.type(screen.getByLabelText(/기록 제목/), "Teams 제품 회의");
    await user.click(screen.getByLabelText("가져올 내용 확인"));
    await user.paste('[{"body":{"content":"이번 주에 사용자 테스트를 진행합니다."}}]');
    await user.click(screen.getByRole("button", { name: "파싱하고 가져오기" }));

    expect(api.importContext).toHaveBeenCalledWith("access", project.id, {
      provider: "teams",
      title: "Teams 제품 회의",
      text: '[{"body":{"content":"이번 주에 사용자 테스트를 진행합니다."}}]',
    });
    expect(await screen.findByRole("heading", { name: "Teams 제품 회의" })).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText(/참여자 서준 · 민지/)).toBeInTheDocument();
  });

  it("merges concurrent archive and import results without reviving stale local rows", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const archiveRequest = deferred<void>();
    const importRequest = deferred<Awaited<ReturnType<PlatformApi["importContext"]>>>();
    const importedSource: SourceRecordResource = {
      ...source,
      id: "12121212-1212-4212-8212-121212121212",
      title: "동시 가져오기",
      content: "새 맥락",
      charCount: 4,
      import: {
        id: "13131313-1313-4313-8313-131313131313",
        provider: "paste",
        participants: [],
        segmentCount: 1,
        importedAt: "2026-07-11T02:00:00Z",
      },
    };
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([source]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(api.deleteSource).mockReturnValue(archiveRequest.promise);
    vi.mocked(api.importContext).mockReturnValue(importRequest.promise);

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByRole("tab", { name: "기록" }));
    await user.click(screen.getByRole("button", { name: "보관" }));
    await user.click(screen.getByText("외부 회의 맥락 가져오기"));
    await user.click(screen.getByRole("radio", { name: /바로 붙여넣기/ }));
    await user.type(screen.getByLabelText(/기록 제목/), "동시 가져오기");
    await user.type(screen.getByLabelText("회의 맥락 붙여넣기"), "새 맥락");
    await user.click(screen.getByRole("button", { name: "파싱하고 가져오기" }));

    archiveRequest.resolve();
    await waitFor(() => expect(screen.queryByRole("heading", { name: source.title })).not.toBeInTheDocument());
    importRequest.resolve({
      source: importedSource,
      importId: importedSource.import!.id,
      provider: "paste",
      participants: [],
      segmentCount: 1,
      duplicate: false,
    });
    expect(await screen.findByRole("heading", { name: "동시 가져오기" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "분석 실행" }));
    expect(screen.getAllByTestId(/^analysis-source-/)).toHaveLength(1);
    expect(screen.getByTestId(`analysis-source-${importedSource.id}`)).toBeChecked();
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
    expect(screen.getByRole("heading", { name: "OpenAI 전송 미리보기" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "OpenAI 전송 대상 기록" })).toHaveTextContent(source.title);
    expect(screen.getByTestId("analysis-submit")).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /OpenAI API에 전송/ }));
    await user.click(screen.getByTestId("analysis-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("외부 모델을 사용할 수 없습니다.");
  });

  it("scans selected source details and requires a second confirmation when personal data is detected", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const sensitiveSource = {
      ...source,
      content: "문의 담당자 이메일은 student@example.com이고 전화번호는 010-1234-5678입니다.",
      charCount: 65,
    };
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([sensitiveSource]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(api.getCapabilities).mockResolvedValue({ openaiEnabled: true });
    vi.mocked(api.getSource!).mockResolvedValue(sensitiveSource);
    vi.mocked(api.createAnalysisRun).mockResolvedValue(latestRun);

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByTestId("analysis-mode-openai"));
    await user.click(screen.getByRole("checkbox", { name: /OpenAI API에 전송/ }));
    await user.click(screen.getByTestId("analysis-submit"));

    expect(api.getSource).toHaveBeenCalledWith("access", sensitiveSource.id);
    expect(screen.getByText(/개인정보 형식 2건/)).toBeInTheDocument();
    expect(screen.getAllByText("1건", { selector: ".personal-data-preflight dd" })).toHaveLength(2);
    expect(screen.queryByText("student@example.com")).not.toBeInTheDocument();
    expect(api.createAnalysisRun).not.toHaveBeenCalled();
    expect(screen.getByTestId("analysis-submit")).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /현재 원문 그대로 OpenAI에 전송/ }));
    await user.click(screen.getByTestId("analysis-submit"));
    expect(api.createAnalysisRun).toHaveBeenCalledTimes(1);
  });

  it("masks detected personal data in stored sources before OpenAI analysis", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const sensitiveSource = {
      ...source,
      content: "회신 주소 student@example.com",
      charCount: 28,
    };
    const maskedSource = {
      ...sensitiveSource,
      content: "회신 주소 •••••••@•••••••.•••",
      updatedAt: "2026-07-13T00:00:00Z",
    };
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.listSources).mockResolvedValue([sensitiveSource]);
    vi.mocked(api.listAnalysisRuns).mockResolvedValue([]);
    vi.mocked(api.getCapabilities).mockResolvedValue({ openaiEnabled: true });
    vi.mocked(api.getSource!).mockResolvedValue(sensitiveSource);
    vi.mocked(api.updateSource).mockResolvedValue(maskedSource);
    vi.mocked(api.createAnalysisRun).mockResolvedValue(latestRun);

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await user.click(screen.getByTestId("analysis-mode-openai"));
    await user.click(screen.getByRole("checkbox", { name: /OpenAI API에 전송/ }));
    await user.click(screen.getByTestId("analysis-submit"));
    await user.click(screen.getByRole("button", { name: "탐지 항목 마스킹 후 저장" }));

    expect(api.updateSource).toHaveBeenCalledWith("access", sensitiveSource.id, {
      content: expect.not.stringContaining("student@example.com"),
    });
    expect(await screen.findByText("1개 원문의 탐지 항목을 마스킹해 저장했습니다.")).toBeInTheDocument();
    expect(screen.getByText(/탐지되지 않았습니다/)).toBeInTheDocument();
    await user.click(screen.getByTestId("analysis-submit"));
    expect(api.createAnalysisRun).toHaveBeenCalledTimes(1);
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

  it("loads projected source and run details only when the user needs them", async () => {
    const user = userEvent.setup();
    const api = apiMock();
    const sourceSummary = { ...source };
    const runSummary = { ...latestRun };
    const previousSummary = { ...previousRun };
    Reflect.deleteProperty(sourceSummary, "content");
    Reflect.deleteProperty(runSummary, "result");
    Reflect.deleteProperty(previousSummary, "result");
    api.listSourcesPage = vi.fn().mockResolvedValue({
      items: [sourceSummary],
      page: { limit: 50, count: 1, hasMore: false, nextCursor: null },
    });
    api.listAnalysisRunsPage = vi.fn().mockResolvedValue({
      items: [runSummary, previousSummary],
      page: { limit: 50, count: 2, hasMore: false, nextCursor: null },
    });
    api.getSource = vi.fn().mockResolvedValue(source);
    vi.mocked(api.getProject).mockResolvedValue(project);
    vi.mocked(api.getAnalysisRun).mockImplementation(async (_token, runId) => (
      runId === latestRun.id ? latestRun : previousRun
    ));

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    await screen.findByRole("heading", { name: project.title });
    await waitFor(() => expect(api.getAnalysisRun).toHaveBeenCalledWith("access", latestRun.id));
    expect(api.getSource).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "개요" }));
    await user.click(screen.getByRole("tab", { name: "분석 이력" }));
    await waitFor(() => expect(api.getAnalysisRun).toHaveBeenCalledWith("access", previousRun.id));
    await user.click(screen.getByRole("tab", { name: "기록" }));
    await user.click(screen.getByRole("button", { name: "원문 상세 불러오기" }));
    expect(api.getSource).toHaveBeenCalledWith("access", source.id);
    expect(await screen.findByText(source.content.trim())).toBeInTheDocument();
  });

  it("keeps the project usable when one paginated list fails", async () => {
    const api = apiMock();
    api.listSourcesPage = vi.fn().mockRejectedValue(new Error("기록 저장소 지연"));
    api.listAnalysisRunsPage = vi.fn().mockResolvedValue({
      items: [],
      page: { limit: 50, count: 0, hasMore: false, nextCursor: null },
    });
    vi.mocked(api.getProject).mockResolvedValue(project);

    render(<ProjectPage api={api} token="access" projectId={project.id} navigate={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("기록 목록 일부를 불러오지 못했습니다");
    expect(screen.getByRole("button", { name: "다시 불러오기" })).toBeInTheDocument();
  });
});

function run(id: string, createdAt: string, result: typeof sampleAnalysis): AnalysisRunResource {
  return {
    id,
    projectId: project.id,
    status: "succeeded",
    schemaVersion: "2.0",
    pipelineVersion: "2.0",
    stages: [],
    evidenceCoverage: { eligible: 0, validated: 0 },
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
    listSources: vi.fn(), getSource: vi.fn().mockResolvedValue(source), createSource: vi.fn(), importContext: vi.fn(), updateSource: vi.fn(), deleteSource: vi.fn(), listSourceSegments: vi.fn().mockResolvedValue([]),
    listAnalysisRuns: vi.fn(), createAnalysisRun: vi.fn(), getAnalysisRun: vi.fn(), deleteAnalysisRun: vi.fn(),
    listAnalysisRunStepEvents: vi.fn().mockResolvedValue([]), listAnalysisRunAnnotations: vi.fn().mockResolvedValue([]), createAnalysisRunAnnotation: vi.fn(),
    listShareLinks: vi.fn(), createShareLink: vi.fn(), revokeShareLink: vi.fn(), resolveSharedAnalysis: vi.fn(),
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}
