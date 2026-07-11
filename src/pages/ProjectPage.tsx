import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import AnalysisComparison from "../components/AnalysisComparison";
import ContextBacklinks from "../components/ContextBacklinks";
import ContextImportPanel, {
  type ContextImportInput as ContextImportPanelInput,
} from "../components/ContextImportPanel";
import DecisionList from "../components/DecisionList";
import EvidenceDrawer from "../components/EvidenceDrawer";
import KeyTerms from "../components/KeyTerms";
import KnowledgeMap from "../components/KnowledgeMap";
import OnboardingSummary from "../components/OnboardingSummary";
import ParticipantAgentPanel from "../components/ParticipantAgentPanel";
import PerspectiveTable from "../components/PerspectiveTable";
import QuestionList from "../components/QuestionList";
import SummaryPanel from "../components/SummaryPanel";
import type { Navigate } from "../hooks/useRoute";
import { PlatformApiError, type PlatformApi } from "../services/platformApi";
import type { EvidenceRef } from "../types/context";
import type {
  AnalysisMode,
  AnalysisRunResource,
  ExternalContextProvider,
  ProjectResource,
  ShareLinkResource,
  SourceKind,
  SourceRecordResource,
  SourceSegmentResource,
} from "../types/platform";

type ProjectTab = "overview" | "records" | "history" | "map" | "onboarding";

type ProjectPageProps = {
  api: PlatformApi;
  token: string;
  projectId: string;
  navigate: Navigate;
};

const sourceKindLabels: Record<SourceKind, string> = {
  meeting: "회의록",
  research: "리서치",
  feedback: "피드백",
  note: "메모",
};

const importProviderLabels: Record<ExternalContextProvider, string> = {
  kakaotalk: "카카오톡",
  teams: "Teams",
  notion: "Notion",
  paste: "붙여넣기",
};

function ProjectPage({ api, token, projectId, navigate }: ProjectPageProps) {
  const [project, setProject] = useState<ProjectResource | null>(null);
  const [sources, setSources] = useState<SourceRecordResource[]>([]);
  const [runs, setRuns] = useState<AnalysisRunResource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [openaiEnabled, setOpenaiEnabled] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceRef[] | null>(null);
  const [evidenceSegments, setEvidenceSegments] = useState<SourceSegmentResource[]>([]);
  const [evidenceSegmentsLoading, setEvidenceSegmentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analysisAbort = useRef<AbortController | null>(null);
  const evidenceLoadVersion = useRef(0);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProject, nextSources, nextRuns, capabilities] = await Promise.all([
        api.getProject(token, projectId),
        api.listSources(token, projectId),
        api.listAnalysisRuns(token, projectId),
        api.getCapabilities(token).catch(() => ({ openaiEnabled: false })),
      ]);
      const orderedRuns = orderRuns(nextRuns);
      setProject(nextProject);
      setSources(nextSources);
      setRuns(orderedRuns);
      setOpenaiEnabled(capabilities.openaiEnabled);
      setSelectedSourceIds((current) =>
        current.size > 0
          ? new Set([...current].filter((id) => nextSources.some((item) => item.id === id && !item.archivedAt)))
          : new Set(nextSources.filter((item) => !item.archivedAt).map((item) => item.id)),
      );
      setSelectedRunId((current) =>
        current && orderedRuns.some((run) => run.id === current)
          ? current
          : orderedRuns.find((run) => run.status === "succeeded")?.id ?? orderedRuns[0]?.id ?? null,
      );
    } catch (loadError) {
      setError(messageFrom(loadError));
    } finally {
      setLoading(false);
    }
  }, [api, projectId, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => {
      window.clearTimeout(timer);
      // The latest in-flight controller must be read at unmount time.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      analysisAbort.current?.abort();
    };
  }, [loadWorkspace]);

  const successfulRuns = useMemo(
    () => runs.filter((run) => run.status === "succeeded" && run.result),
    [runs],
  );
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? successfulRuns[0] ?? null;
  const latestSuccessful = successfulRuns[0];
  const previousSuccessful = successfulRuns[1];

  const openEvidence = (nextEvidence: EvidenceRef[]) => {
    const sourceIds = [...new Set(nextEvidence.map((item) => item.sourceRecordId))];
    const version = evidenceLoadVersion.current + 1;
    evidenceLoadVersion.current = version;
    setEvidence(nextEvidence);
    setEvidenceSegments([]);
    setEvidenceSegmentsLoading(sourceIds.length > 0);
    void Promise.all(
      sourceIds.map((sourceId) => api.listSourceSegments(token, sourceId).catch(() => [])),
    ).then((groups) => {
      if (evidenceLoadVersion.current !== version) return;
      setEvidenceSegments(groups.flat());
      setEvidenceSegmentsLoading(false);
    });
  };

  const closeEvidence = () => {
    evidenceLoadVersion.current += 1;
    setEvidence(null);
    setEvidenceSegments([]);
    setEvidenceSegmentsLoading(false);
  };

  if (loading && !project) {
    return <main className="app-page"><div className="loading-card page-loader" role="status">프로젝트를 불러오는 중…</div></main>;
  }
  if (!project) {
    return (
      <main className="app-page">
        <div className="notice error" role="alert">{error ?? "프로젝트를 찾을 수 없습니다."}</div>
        <button className="button secondary" type="button" onClick={() => navigate("/projects")}>프로젝트 목록</button>
      </main>
    );
  }

  const tabs: { id: ProjectTab; label: string }[] = [
    { id: "overview", label: "개요" },
    { id: "records", label: "기록" },
    { id: "history", label: "분석 이력" },
    { id: "map", label: "지식맵" },
    { id: "onboarding", label: "온보딩" },
  ];

  return (
    <main className="app-page project-page">
      <button className="text-button back-button" type="button" onClick={() => navigate("/projects")}>
        ← 프로젝트 목록
      </button>
      <header className="project-heading">
        <div>
          <p className="section-kicker">Project workspace</p>
          <h1>{project.title}</h1>
          <p>{project.description || "이 프로젝트의 설명을 개요 탭에서 추가할 수 있습니다."}</p>
        </div>
        <div className="project-heading-metrics">
          <span><strong>{sources.filter((item) => !item.archivedAt).length}</strong>기록</span>
          <span><strong>{successfulRuns.length}</strong>성공 분석</span>
        </div>
      </header>

      {error && <div className="notice error" role="alert">{error}<button type="button" onClick={() => setError(null)}>닫기</button></div>}

      <div className="project-tabs" role="tablist" aria-label="프로젝트 보기">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="project-tab-panel" role="tabpanel">
        {activeTab === "overview" && (
          <OverviewTab
            api={api}
            token={token}
            project={project}
            sources={sources}
            runs={runs}
            selectedSourceIds={selectedSourceIds}
            openaiEnabled={openaiEnabled}
            onToggleSource={(id) => setSelectedSourceIds(toggleSet(selectedSourceIds, id))}
            onProjectChange={setProject}
            onProjectDeleted={() => navigate("/projects")}
            onRunCreated={(run) => {
              setRuns((current) => orderRuns([run, ...current.filter((item) => item.id !== run.id)]));
              setSelectedRunId(run.id);
              setActiveTab("history");
            }}
            onError={setError}
            analysisAbortRef={analysisAbort}
          />
        )}
        {activeTab === "records" && (
          <RecordsTab
            api={api}
            token={token}
            projectId={projectId}
            sources={sources}
            onSourcesChange={(updateSources, updateSelection) => {
              setSources(updateSources);
              setSelectedSourceIds(updateSelection);
            }}
            onError={setError}
          />
        )}
        {activeTab === "history" && (
          <HistoryTab
            runs={runs}
            selectedRun={selectedRun}
            latest={latestSuccessful}
            previous={previousSuccessful}
            onSelectRun={setSelectedRunId}
            onOpenEvidence={openEvidence}
          />
        )}
        {activeTab === "map" && (
          selectedRun?.result ? (
            <div className="map-workspace">
              <KnowledgeMap map={selectedRun.result.knowledgeMap} />
              <ContextBacklinks
                sources={sources}
                result={selectedRun.result}
                onOpenEvidence={openEvidence}
              />
            </div>
          ) : <EmptyAnalysis />
        )}
        {activeTab === "onboarding" && (
          selectedRun?.result ? (
            <div className="onboarding-grid">
              <OnboardingSummary summary={selectedRun.result.onboardingSummary} />
              <SharePanel api={api} token={token} run={selectedRun} onError={setError} />
            </div>
          ) : <EmptyAnalysis />
        )}
      </section>
      <EvidenceDrawer
        evidence={evidence}
        segments={evidenceSegments}
        segmentsLoading={evidenceSegmentsLoading}
        onClose={closeEvidence}
      />
    </main>
  );
}

type OverviewTabProps = {
  api: PlatformApi;
  token: string;
  project: ProjectResource;
  sources: SourceRecordResource[];
  runs: AnalysisRunResource[];
  selectedSourceIds: Set<string>;
  openaiEnabled: boolean;
  onToggleSource: (id: string) => void;
  onProjectChange: (project: ProjectResource) => void;
  onProjectDeleted: () => void;
  onRunCreated: (run: AnalysisRunResource) => void;
  onError: (message: string | null) => void;
  analysisAbortRef: React.MutableRefObject<AbortController | null>;
};

function OverviewTab({
  api,
  token,
  project,
  sources,
  runs,
  selectedSourceIds,
  openaiEnabled,
  onToggleSource,
  onProjectChange,
  onProjectDeleted,
  onRunCreated,
  onError,
  analysisAbortRef,
}: OverviewTabProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [mode, setMode] = useState<AnalysisMode>("local");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const analysisAttemptRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      onProjectChange(await api.updateProject(token, project.id, { title: title.trim(), description: description.trim() }));
    } catch (saveError) {
      onError(messageFrom(saveError));
    } finally {
      setSaving(false);
    }
  };

  const runAnalysis = async () => {
    if (selectedSourceIds.size === 0 || analyzing || (mode === "openai" && !consent)) return;
    const controller = new AbortController();
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = controller;
    setAnalyzing(true);
    onError(null);
    const fingerprint = JSON.stringify({
      sourceIds: [...selectedSourceIds].sort(),
      mode,
    });
    if (analysisAttemptRef.current?.fingerprint !== fingerprint) {
      analysisAttemptRef.current = { fingerprint, key: createIdempotencyKey() };
    }
    const idempotencyKey = analysisAttemptRef.current.key;
    try {
      const run = await api.createAnalysisRun(
        token,
        project.id,
        { sourceIds: [...selectedSourceIds], mode },
        idempotencyKey,
        controller.signal,
      );
      analysisAttemptRef.current = null;
      onRunCreated(run);
    } catch (runError) {
      if (!shouldRetainAnalysisKey(runError)) analysisAttemptRef.current = null;
      if (!controller.signal.aborted) onError(messageFrom(runError));
    } finally {
      if (analysisAbortRef.current === controller) analysisAbortRef.current = null;
      setAnalyzing(false);
    }
  };

  const deleteProject = async (permanent: boolean) => {
    if (deleting || (permanent && deleteConfirmation !== "delete")) return;
    setDeleting(true);
    onError(null);
    try {
      await api.deleteProject(token, project.id, permanent);
      onProjectDeleted();
    } catch (deleteError) {
      onError(messageFrom(deleteError));
      setDeleting(false);
    }
  };

  const activeSources = sources.filter((item) => !item.archivedAt);
  return (
    <div className="overview-layout">
      <section className="workspace-card">
        <div className="panel-heading compact"><p className="section-kicker">Project details</p><h2>프로젝트 정보</h2></div>
        <form onSubmit={saveProject}>
          <label className="field"><span>이름</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label className="field"><span>설명</span><textarea className="short-textarea" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} /></label>
          <button className="button secondary" type="submit" disabled={saving || !title.trim()}>{saving ? "저장 중…" : "정보 저장"}</button>
        </form>
        <div className="danger-zone">
          <div><strong>프로젝트 정리</strong><p>보관하면 목록에서 숨겨지고, 영구 삭제하면 기록·분석·공유 링크를 복구할 수 없습니다.</p></div>
          <button className="button secondary" type="button" disabled={deleting} onClick={() => void deleteProject(false)}>프로젝트 보관</button>
          <label className="field compact-field"><span>영구 삭제 확인</span><input aria-label="영구 삭제 확인" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="delete 입력" /></label>
          <button className="button destructive" type="button" disabled={deleting || deleteConfirmation !== "delete"} onClick={() => void deleteProject(true)}>영구 삭제</button>
        </div>
      </section>

      <section className="workspace-card analysis-launcher">
        <div className="panel-heading compact">
          <p className="section-kicker">New analysis</p>
          <h2>선택한 기록 분석</h2>
          <p>실행 결과는 불변 이력으로 저장됩니다. 실패해도 최근 성공 결과는 유지됩니다.</p>
        </div>
        {activeSources.length === 0 ? (
          <p className="empty-card">기록 탭에서 먼저 원문을 저장해 주세요.</p>
        ) : (
          <div className="source-selector">
            {activeSources.map((source) => (
              <label key={source.id} aria-label={`${source.title} 분석에 포함`}>
                <input
                  data-testid={`analysis-source-${source.id}`}
                  type="checkbox"
                  checked={selectedSourceIds.has(source.id)}
                  onChange={() => onToggleSource(source.id)}
                />
                <span><strong>{source.title}</strong><small>{sourceKindLabels[source.kind]} · {source.charCount.toLocaleString("ko-KR")}자</small></span>
              </label>
            ))}
          </div>
        )}
        <fieldset className="mode-selector">
          <legend>분석 방식</legend>
          <label aria-label="로컬 분석 선택"><input data-testid="analysis-mode-local" type="radio" name="mode" checked={mode === "local"} onChange={() => setMode("local")} /><span><strong>로컬 분석</strong><small>외부 모델 전송 없이 안정적으로 시연</small></span></label>
          <label className={!openaiEnabled ? "disabled-option" : undefined} aria-label="OpenAI 분석 선택"><input data-testid="analysis-mode-openai" type="radio" name="mode" checked={mode === "openai"} disabled={!openaiEnabled} onChange={() => setMode("openai")} /><span><strong>OpenAI 분석</strong><small>선택한 기록을 서버에서 외부 모델로 전송</small></span></label>
        </fieldset>
        {!openaiEnabled && (
          <p className="capability-note" role="status">
            OpenAI 분석은 현재 서버에 구성되지 않아 로컬 분석만 사용할 수 있습니다.
          </p>
        )}
        {mode === "openai" && (
          <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>선택한 원문이 분석 목적으로 OpenAI API에 전송되는 것에 동의합니다.</span></label>
        )}
        <button
          data-testid="analysis-submit"
          className="button primary full-button"
          type="button"
          disabled={activeSources.length === 0 || selectedSourceIds.size === 0 || analyzing || (mode === "openai" && !consent)}
          onClick={() => void runAnalysis()}
        >
          {analyzing ? "분석 중…" : "선택한 기록 분석"}
        </button>
        <p className="usage-guide">저장된 분석 {runs.length}건 · 사용자당 동시 1건, 시간당 10건 제한</p>
      </section>
    </div>
  );
}

function RecordsTab({ api, token, projectId, sources, onSourcesChange, onError }: {
  api: PlatformApi;
  token: string;
  projectId: string;
  sources: SourceRecordResource[];
  onSourcesChange: (
    update: (sources: SourceRecordResource[]) => SourceRecordResource[],
    updateSelection: (selected: Set<string>) => Set<string>,
  ) => void;
  onError: (message: string | null) => void;
}) {
  const [kind, setKind] = useState<SourceKind>("meeting");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const createSource = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    onError(null);
    try {
      const created = await api.createSource(token, projectId, { kind, title: title.trim(), content: content.trim() });
      onSourcesChange(
        (current) => [created, ...current],
        (selected) => new Set(selected).add(created.id),
      );
      setTitle("");
      setContent("");
    } catch (saveError) {
      onError(messageFrom(saveError));
    } finally {
      setSaving(false);
    }
  };

  const archive = async (source: SourceRecordResource) => {
    onError(null);
    try {
      await api.deleteSource(token, source.id);
      onSourcesChange(
        (current) => current.map((item) =>
          item.id === source.id
            ? { ...item, archivedAt: new Date().toISOString() }
            : item,
        ),
        (selected) => {
          const next = new Set(selected);
          next.delete(source.id);
          return next;
        },
      );
    } catch (deleteError) {
      onError(messageFrom(deleteError));
    }
  };

  const importContext = async (input: ContextImportPanelInput) => {
    const imported = await api.importContext(token, projectId, input);
    onSourcesChange(
      (current) => [
        imported.source,
        ...current.filter((item) => item.id !== imported.source.id),
      ],
      (selected) => new Set(selected).add(imported.source.id),
    );
  };

  return (
    <div className="records-workspace">
      <ContextImportPanel onImport={importContext} />
      <div className="records-layout">
        <section className="workspace-card sticky-card">
        <div className="panel-heading compact"><p className="section-kicker">New source</p><h2>원문 기록 추가</h2><p>민감정보를 제거한 뒤 필요한 맥락만 저장해 주세요.</p></div>
        <form onSubmit={createSource}>
          <label className="field"><span>기록 유형</span><select data-testid="source-create-kind" value={kind} onChange={(event) => setKind(event.target.value as SourceKind)}>{Object.entries(sourceKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>제목</span><input data-testid="source-create-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="예: 7월 11일 기획 회의" required /></label>
          <label className="field"><span>원문</span><textarea data-testid="source-create-content" value={content} maxLength={100_000} onChange={(event) => setContent(event.target.value)} placeholder="회의록, 조사 메모 또는 피드백을 붙여넣으세요" required /></label>
          <div className="counter">{content.length.toLocaleString("ko-KR")} / 100,000자</div>
          <button data-testid="source-create-submit" className="button primary full-button" type="submit" disabled={saving || !title.trim() || !content.trim()}>{saving ? "저장 중…" : "기록 저장"}</button>
        </form>
        </section>
        <section className="source-list-panel">
        <div className="section-row"><div><p className="section-kicker">Source library</p><h2>저장된 기록</h2></div><span>{sources.filter((item) => !item.archivedAt).length}개</span></div>
        {sources.filter((item) => !item.archivedAt).length === 0 ? <p className="empty-card">아직 저장된 원문이 없습니다.</p> : (
          <div className="source-card-list">
            {sources.filter((item) => !item.archivedAt).map((source) => (
              <article key={source.id} className="source-card">
                <header>
                  <div className="source-card-tags">
                    <span className={`source-kind ${source.kind}`}>{sourceKindLabels[source.kind]}</span>
                    {source.import && (
                      <span className="source-import-badge">
                        {importProviderLabels[source.import.provider] ?? "외부 기록"}
                      </span>
                    )}
                  </div>
                  <time>{formatDateTime(source.occurredAt ?? source.createdAt)}</time>
                </header>
                <h3>{source.title}</h3>
                {source.import && (
                  <div className="source-import-meta">
                    <span>맥락 {source.import.segmentCount.toLocaleString("ko-KR")}개</span>
                    {source.import.participants.length > 0 && (
                      <span>참여자 {source.import.participants.slice(0, 4).join(" · ")}</span>
                    )}
                  </div>
                )}
                <p>{source.content}</p>
                <footer><span>{source.charCount.toLocaleString("ko-KR")}자</span><button className="text-button danger" type="button" onClick={() => void archive(source)}>보관</button></footer>
              </article>
            ))}
          </div>
        )}
        </section>
      </div>
    </div>
  );
}

function HistoryTab({ runs, selectedRun, latest, previous, onSelectRun, onOpenEvidence }: {
  runs: AnalysisRunResource[];
  selectedRun: AnalysisRunResource | null;
  latest?: AnalysisRunResource;
  previous?: AnalysisRunResource;
  onSelectRun: (id: string) => void;
  onOpenEvidence: (evidence: EvidenceRef[]) => void;
}) {
  if (runs.length === 0) return <EmptyAnalysis />;
  return (
    <div className="history-layout">
      <aside className="run-list" aria-label="분석 실행 이력">
        <div className="section-row"><div><p className="section-kicker">Run history</p><h2>분석 이력</h2></div><span>{runs.length}건</span></div>
        {runs.map((run) => (
          <button key={run.id} className={selectedRun?.id === run.id ? "active" : ""} type="button" onClick={() => onSelectRun(run.id)}>
            <span className={`run-status ${run.status}`}>{statusLabel(run.status)}</span>
            <strong>{formatDateTime(run.createdAt)}</strong>
            <small>{run.provider.mode === "openai" ? run.provider.model ?? "OpenAI" : "로컬 분석"} · 기록 {run.sourceIds.length}개</small>
          </button>
        ))}
      </aside>
      <div className="run-detail">
        <AnalysisComparison previous={previous?.result} latest={latest?.result} />
        {selectedRun?.status === "failed" ? <div className="notice error">{selectedRun.error?.message ?? "분석 실행이 실패했습니다."}</div> : selectedRun?.status === "running" ? <div className="loading-card">분석이 진행 중입니다.</div> : selectedRun?.result ? (
          <>
            <SummaryPanel result={selectedRun.result} />
            <div className="results-grid overview-grid">
              <PerspectiveTable participants={selectedRun.result.participants} onOpenEvidence={onOpenEvidence} />
              <ParticipantAgentPanel synthesis={selectedRun.result.participantAgents} />
              <QuestionList questions={selectedRun.result.questions} onOpenEvidence={onOpenEvidence} />
              <DecisionList decisions={selectedRun.result.decisions} onOpenEvidence={onOpenEvidence} />
              <KeyTerms terms={selectedRun.result.keyTerms} />
            </div>
          </>
        ) : <div className="empty-card">이 실행에는 표시할 결과가 없습니다.</div>}
      </div>
    </div>
  );
}

function SharePanel({ api, token, run, onError }: { api: PlatformApi; token: string; run: AnalysisRunResource; onError: (message: string | null) => void }) {
  const [links, setLinks] = useState<ShareLinkResource[]>([]);
  const [days, setDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [freshUrls, setFreshUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    api.listShareLinks(token, run.id).then((items) => { if (active) setLinks(items); }).catch((loadError) => { if (active) onError(messageFrom(loadError)); });
    return () => { active = false; };
  }, [api, onError, run.id, token]);

  const create = async () => {
    setCreating(true);
    onError(null);
    try {
      const link = await api.createShareLink(token, run.id, days);
      setLinks((current) => [link, ...current]);
      if (link.token) setFreshUrls((current) => ({ ...current, [link.id]: `${window.location.origin}/share#token=${encodeURIComponent(link.token ?? "")}` }));
    } catch (createError) {
      onError(messageFrom(createError));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (linkId: string) => {
    try {
      await api.revokeShareLink(token, linkId);
      setLinks((current) => current.map((link) => link.id === linkId ? { ...link, revokedAt: new Date().toISOString() } : link));
    } catch (revokeError) {
      onError(messageFrom(revokeError));
    }
  };

  return (
    <section className="share-panel workspace-card" aria-labelledby="share-title">
      <div className="panel-heading compact"><p className="section-kicker">Read-only share</p><h2 id="share-title">온보딩 링크 공유</h2><p>원문 전체와 계정 정보는 공개되지 않습니다. 토큰은 생성 직후 한 번만 확인할 수 있습니다.</p></div>
      <div className="share-create-row">
        <label><span>만료</span><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={1}>1일</option><option value={7}>7일</option><option value={14}>14일</option><option value={30}>30일</option></select></label>
        <button data-testid="share-create" className="button primary" type="button" disabled={creating} onClick={() => void create()}>{creating ? "만드는 중…" : "읽기 전용 링크 만들기"}</button>
      </div>
      {links.length === 0 ? <p className="empty-card">이 분석에 생성된 공유 링크가 없습니다.</p> : (
        <ul className="share-link-list">
          {links.map((link) => {
            const url = freshUrls[link.id];
            const revoked = Boolean(link.revokedAt);
            return <li key={link.id} className={revoked ? "revoked" : ""}><div><strong>{revoked ? "폐기됨" : `${formatDateTime(link.expiresAt)} 만료`}</strong>{url ? <input aria-label="새 공유 링크" readOnly value={url} onFocus={(event) => event.currentTarget.select()} /> : <small>보안을 위해 기존 토큰은 다시 표시되지 않습니다.</small>}</div>{!revoked && <button data-testid={`share-revoke-${link.id}`} className="text-button danger" type="button" onClick={() => void revoke(link.id)}>링크 폐기</button>}</li>;
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyAnalysis() {
  return <div className="empty-card large-empty"><strong>아직 성공한 분석이 없습니다.</strong><p>개요 탭에서 기록을 선택하고 새 분석을 실행해 주세요.</p></div>;
}

function toggleSet(current: Set<string>, value: string) {
  const next = new Set(current);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

function orderRuns(runs: AnalysisRunResource[]) {
  return [...runs].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function statusLabel(status: AnalysisRunResource["status"]) {
  return { running: "진행 중", succeeded: "성공", failed: "실패", cancelled: "취소" }[status];
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function createIdempotencyKey() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shouldRetainAnalysisKey(error: unknown) {
  return !(error instanceof PlatformApiError) || error.status === 0;
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

export default ProjectPage;
