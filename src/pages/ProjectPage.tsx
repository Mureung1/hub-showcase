import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import AnalysisHistory from "../components/AnalysisHistory";
import ContextBacklinks from "../components/ContextBacklinks";
import ContextImportPanel, {
  type ContextImportInput as ContextImportPanelInput,
} from "../components/ContextImportPanel";
import EvidenceDrawer from "../components/EvidenceDrawer";
import KnowledgeMap from "../components/KnowledgeMap";
import OnboardingSummary from "../components/OnboardingSummary";
import type { Navigate } from "../hooks/useRoute";
import { PlatformApiError, type PlatformApi } from "../services/platformApi";
import { trackProductEvent } from "../services/productTelemetry";
import type { EvidenceRef } from "../types/context";
import {
  findPersonalData,
  maskPersonalData,
  summarizePersonalData,
  type PersonalDataKind,
} from "../utils/personalData";
import type {
  AnalysisMode,
  AnalysisRunAnnotationResource,
  AnalysisRunResource,
  AnalysisRunStepEventResource,
  CursorPageMetadata,
  ExternalContextProvider,
  ProjectRetentionDays,
  ProjectResource,
  ShareDisclosureMode,
  ShareLinkResource,
  SourceKind,
  SourceRecordListResource,
  SourceRecordResource,
  SourceSegmentResource,
} from "../types/platform";

type ProjectTab = "overview" | "map" | "onboarding";
type OverviewView = "analysis" | "records" | "history";

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

const completedPage: CursorPageMetadata = {
  limit: 50,
  count: 0,
  hasMore: false,
  nextCursor: null,
};

function ProjectPage({ api, token, projectId, navigate }: ProjectPageProps) {
  const [project, setProject] = useState<ProjectResource | null>(null);
  const [sources, setSources] = useState<SourceRecordListResource[]>([]);
  const [runs, setRuns] = useState<AnalysisRunResource[]>([]);
  const [sourcePage, setSourcePage] = useState<CursorPageMetadata>(completedPage);
  const [runPage, setRunPage] = useState<CursorPageMetadata>(completedPage);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [loadingMoreSources, setLoadingMoreSources] = useState(false);
  const [loadingMoreRuns, setLoadingMoreRuns] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>(() => readProjectViewState().tab);
  const [overviewView, setOverviewView] = useState<OverviewView>(() => readProjectViewState().view);
  const explicitOverviewView = useRef(hasExplicitOverviewView());
  const [openaiEnabled, setOpenaiEnabled] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceRef[] | null>(null);
  const [evidenceSegments, setEvidenceSegments] = useState<SourceSegmentResource[]>([]);
  const [evidenceSegmentsLoading, setEvidenceSegmentsLoading] = useState(false);
  const [selectedRunStepEvents, setSelectedRunStepEvents] = useState<AnalysisRunStepEventResource[]>([]);
  const [selectedRunAnnotations, setSelectedRunAnnotations] = useState<AnalysisRunAnnotationResource[]>([]);
  const [runArtifactsLoading, setRunArtifactsLoading] = useState(false);
  const [runArtifactsError, setRunArtifactsError] = useState<string | null>(null);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [runDetailError, setRunDetailError] = useState<string | null>(null);
  const [comparisonDetailLoading, setComparisonDetailLoading] = useState(false);
  const [comparisonDetailError, setComparisonDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analysisAbort = useRef<AbortController | null>(null);
  const evidenceLoadVersion = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncFromUrl = () => {
      const next = readProjectViewState();
      setActiveTab(next.tab);
      setOverviewView(next.view);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (activeTab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", activeTab);
    if (activeTab === "overview" && overviewView !== "history") {
      url.searchParams.set("view", overviewView);
    } else {
      url.searchParams.delete("view");
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [activeTab, overviewView]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSourcesError(null);
    setRunsError(null);
    try {
      const [projectResult, sourcesResult, runsResult, capabilitiesResult] = await Promise.allSettled([
        api.getProject(token, projectId),
        api.listSourcesPage
          ? api.listSourcesPage(token, projectId)
          : api.listSources(token, projectId).then(legacyCursorPage),
        api.listAnalysisRunsPage
          ? api.listAnalysisRunsPage(token, projectId)
          : api.listAnalysisRuns(token, projectId).then(legacyCursorPage),
        api.getCapabilities(token),
      ]);
      if (projectResult.status === "rejected") throw projectResult.reason;
      setProject(projectResult.value);

      if (sourcesResult.status === "fulfilled") {
        const nextSources = sourcesResult.value.items;
        setSources(nextSources);
        setSourcePage(sourcesResult.value.page);
        setSelectedSourceIds((current) =>
          current.size > 0
            ? new Set([...current].filter((id) => nextSources.some((item) => item.id === id && !item.archivedAt)))
            : new Set(nextSources.filter((item) => !item.archivedAt).map((item) => item.id)),
        );
      } else {
        setSourcesError(messageFrom(sourcesResult.reason));
      }

      if (runsResult.status === "fulfilled") {
        const orderedRuns = orderRuns(runsResult.value.items);
        setRuns(orderedRuns);
        setRunPage(runsResult.value.page);
        setSelectedRunId((current) =>
          current && orderedRuns.some((run) => run.id === current)
            ? current
            : orderedRuns.find((run) => run.status === "succeeded")?.id ?? orderedRuns[0]?.id ?? null,
        );
        if (!explicitOverviewView.current && orderedRuns.length === 0) setOverviewView("analysis");
      } else {
        setRunsError(messageFrom(runsResult.reason));
      }
      setOpenaiEnabled(
        capabilitiesResult.status === "fulfilled"
          ? capabilitiesResult.value.openaiEnabled
          : false,
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
    () => runs.filter((run) => run.status === "succeeded"),
    [runs],
  );
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? successfulRuns[0] ?? null;
  const latestSuccessful = successfulRuns[0];
  const selectedSuccessfulIndex = successfulRuns.findIndex((run) => run.id === selectedRun?.id);
  const comparisonLatest = selectedSuccessfulIndex >= 0 ? successfulRuns[selectedSuccessfulIndex] : latestSuccessful;
  const comparisonPrevious = selectedSuccessfulIndex >= 0 ? successfulRuns[selectedSuccessfulIndex + 1] : successfulRuns[1];

  const loadRunDetail = useCallback(async (runId: string) => {
    if (!api.getAnalysisRun) {
      setRunDetailError("이 실행의 상세 결과를 불러오는 API를 사용할 수 없습니다.");
      return;
    }
    setRunDetailLoading(true);
    setRunDetailError(null);
    try {
      const detail = await api.getAnalysisRun(token, runId);
      setRuns((current) => current.map((run) => run.id === detail.id ? detail : run));
    } catch (detailError) {
      setRunDetailError(messageFrom(detailError));
    } finally {
      setRunDetailLoading(false);
    }
  }, [api, token]);

  useEffect(() => {
    if (!selectedRun || selectedRun.status !== "succeeded" || selectedRun.result) return undefined;
    const timer = window.setTimeout(() => void loadRunDetail(selectedRun.id), 0);
    return () => window.clearTimeout(timer);
  }, [loadRunDetail, selectedRun]);

  const loadComparisonDetail = useCallback(async (runId: string) => {
    if (!api.getAnalysisRun) {
      setComparisonDetailError("이전 분석의 상세 결과를 불러오는 API를 사용할 수 없습니다.");
      return;
    }
    setComparisonDetailLoading(true);
    setComparisonDetailError(null);
    try {
      const detail = await api.getAnalysisRun(token, runId);
      setRuns((current) => current.map((run) => run.id === detail.id ? detail : run));
    } catch (detailError) {
      setComparisonDetailError(messageFrom(detailError));
    } finally {
      setComparisonDetailLoading(false);
    }
  }, [api, token]);

  useEffect(() => {
    if (
      activeTab !== "overview" ||
      overviewView !== "history" ||
      !comparisonPrevious ||
      comparisonPrevious.result
    ) {
      return undefined;
    }
    const timer = window.setTimeout(
      () => void loadComparisonDetail(comparisonPrevious.id),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [activeTab, comparisonPrevious, loadComparisonDetail, overviewView]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const runId = selectedRun?.id;
      if (!runId || activeTab !== "overview" || overviewView !== "history") {
        setSelectedRunStepEvents([]);
        setSelectedRunAnnotations([]);
        setRunArtifactsError(null);
        return;
      }
      setRunArtifactsLoading(true);
      setRunArtifactsError(null);
      void Promise.all([
        api.listAnalysisRunStepEvents(token, runId),
        api.listAnalysisRunAnnotations(token, runId),
      ]).then(([events, annotations]) => {
        if (!active) return;
        setSelectedRunStepEvents(events);
        setSelectedRunAnnotations(annotations);
      }).catch((artifactError) => {
        if (!active) return;
        setSelectedRunStepEvents([]);
        setSelectedRunAnnotations([]);
        setRunArtifactsError(messageFrom(artifactError));
      }).finally(() => {
        if (active) setRunArtifactsLoading(false);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeTab, api, overviewView, selectedRun?.id, token]);

  const openEvidence = (nextEvidence: EvidenceRef[]) => {
    const sourceIds = [...new Set(nextEvidence.map((item) => item.sourceRecordId))];
    const version = evidenceLoadVersion.current + 1;
    evidenceLoadVersion.current = version;
    setEvidence(nextEvidence);
    setEvidenceSegments([]);
    setEvidenceSegmentsLoading(sourceIds.length > 0);
    trackProductEvent("evidence_opened", {
      referenceCount: nextEvidence.length,
      sourceCount: sourceIds.length,
    });
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

  const loadMoreSources = async () => {
    if (!api.listSourcesPage || !sourcePage.nextCursor || loadingMoreSources) return;
    setLoadingMoreSources(true);
    setSourcesError(null);
    try {
      const next = await api.listSourcesPage(token, projectId, {
        cursor: sourcePage.nextCursor,
        limit: sourcePage.limit,
      });
      setSources((current) => mergeById(current, next.items));
      setSourcePage(next.page);
    } catch (loadError) {
      setSourcesError(messageFrom(loadError));
    } finally {
      setLoadingMoreSources(false);
    }
  };

  const loadMoreRuns = async () => {
    if (!api.listAnalysisRunsPage || !runPage.nextCursor || loadingMoreRuns) return;
    setLoadingMoreRuns(true);
    setRunsError(null);
    try {
      const next = await api.listAnalysisRunsPage(token, projectId, {
        cursor: runPage.nextCursor,
        limit: runPage.limit,
      });
      setRuns((current) => orderRuns(mergeById(current, next.items)));
      setRunPage(next.page);
    } catch (loadError) {
      setRunsError(messageFrom(loadError));
    } finally {
      setLoadingMoreRuns(false);
    }
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
    { id: "map", label: "지식맵" },
    { id: "onboarding", label: "온보딩 요약" },
  ];
  const overviewViews: { id: OverviewView; label: string }[] = [
    { id: "history", label: "분석 이력" },
    { id: "analysis", label: "분석 실행" },
    { id: "records", label: "기록" },
  ];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ProjectTab) => {
    const current = tabs.findIndex((item) => item.id === tab);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[next].id;
    setActiveTab(nextTab);
    document.getElementById(`project-tab-${nextTab}`)?.focus();
  };

  const handleOverviewKeyDown = (event: KeyboardEvent<HTMLButtonElement>, view: OverviewView) => {
    const current = overviewViews.findIndex((item) => item.id === view);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % overviewViews.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + overviewViews.length) % overviewViews.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = overviewViews.length - 1;
    else return;
    event.preventDefault();
    const nextView = overviewViews[next].id;
    setOverviewView(nextView);
    document.getElementById(`overview-view-${nextView}`)?.focus();
  };

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
      </header>

      {latestSuccessful?.result ? (
        <ProjectContextPulse
          run={latestSuccessful}
          onOpen={() => {
            setSelectedRunId(latestSuccessful.id);
            setActiveTab("overview");
            setOverviewView("history");
          }}
        />
      ) : latestSuccessful && runDetailLoading ? (
        <section className="project-context-empty" aria-label="최근 분석 상세 로딩" aria-live="polite">
          <div><strong>최근 분석의 상세 결과를 불러오는 중입니다.</strong><p>목록은 준비되었으며 결과 본문만 안전하게 나중에 불러옵니다.</p></div>
        </section>
      ) : latestSuccessful && runDetailError ? (
        <section className="project-context-empty" aria-label="최근 분석 상세 오류">
          <div><strong>최근 분석의 상세 결과를 불러오지 못했습니다.</strong><p>{runDetailError}</p></div>
          <button className="button secondary" type="button" onClick={() => void loadRunDetail(latestSuccessful.id)}>다시 시도</button>
        </section>
      ) : (
        <section className="project-context-empty" aria-label="프로젝트 맥락 준비 상태">
          <div><strong>아직 구조화된 프로젝트 맥락이 없습니다.</strong><p>기록을 추가한 뒤 첫 분석을 실행하면 관점 차이와 미결 질문이 여기에 표시됩니다.</p></div>
          <button className="button secondary" type="button" onClick={() => { setActiveTab("overview"); setOverviewView("records"); }}>기록 추가하기</button>
        </section>
      )}

      {error && <div className="notice error" role="alert">{error}<button type="button" onClick={() => setError(null)}>닫기</button></div>}
      {sourcesError && (
        <div className="notice warning" role="alert">
          기록 목록 일부를 불러오지 못했습니다. {sourcesError}
          <button type="button" onClick={() => void loadWorkspace()}>다시 불러오기</button>
        </div>
      )}
      {runsError && (
        <div className="notice warning" role="alert">
          분석 이력 일부를 불러오지 못했습니다. {runsError}
          <button type="button" onClick={() => void loadWorkspace()}>다시 불러오기</button>
        </div>
      )}

      <div className="project-tabs" role="tablist" aria-label="프로젝트 보기">
        {tabs.map((tab) => (
          <button
            id={`project-tab-${tab.id}`}
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`project-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        id={`project-panel-${activeTab}`}
        className="project-tab-panel"
        role="tabpanel"
        aria-labelledby={`project-tab-${activeTab}`}
      >
        {activeTab === "overview" && (
          <div className="overview-workspace">
            <div className="overview-view-tabs" role="tablist" aria-label="개요 작업">
              {overviewViews.map((view) => (
                <button
                  id={`overview-view-${view.id}`}
                  key={view.id}
                  className={overviewView === view.id ? "active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={overviewView === view.id}
                  aria-controls={`overview-panel-${view.id}`}
                  tabIndex={overviewView === view.id ? 0 : -1}
                  onClick={() => setOverviewView(view.id)}
                  onKeyDown={(event) => handleOverviewKeyDown(event, view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div id={`overview-panel-${overviewView}`} role="tabpanel" aria-labelledby={`overview-view-${overviewView}`}>
              {overviewView === "analysis" && (
                <OverviewTab
                  api={api}
                  token={token}
                  project={project}
                  sources={sources}
                  runs={runs}
                  selectedSourceIds={selectedSourceIds}
                  openaiEnabled={openaiEnabled}
                  hasMoreSources={Boolean(sourcePage.nextCursor)}
                  loadingMoreSources={loadingMoreSources}
                  onLoadMoreSources={loadMoreSources}
                  onToggleSource={(id) => setSelectedSourceIds(toggleSet(selectedSourceIds, id))}
                  onSourcesUpdated={(updatedSources) => {
                    const byId = new Map(updatedSources.map((source) => [source.id, source]));
                    setSources((current) => current.map((source) => {
                      const updated = byId.get(source.id);
                      return updated
                        ? { ...source, ...updated, import: updated.import ?? source.import }
                        : source;
                    }));
                  }}
                  onProjectChange={setProject}
                  onProjectDeleted={() => navigate("/projects")}
                  onRunCreated={(run) => {
                    setRuns((current) => orderRuns([run, ...current.filter((item) => item.id !== run.id)]));
                    setSelectedRunId(run.id);
                    setOverviewView("history");
                  }}
                  onError={setError}
                  analysisAbortRef={analysisAbort}
                />
              )}
              {overviewView === "records" && (
                <RecordsTab
                  api={api}
                  token={token}
                  projectId={projectId}
                  sources={sources}
                  hasMore={Boolean(sourcePage.nextCursor)}
                  loadingMore={loadingMoreSources}
                  onLoadMore={loadMoreSources}
                  onSourcesChange={(updateSources, updateSelection) => {
                    setSources(updateSources);
                    setSelectedSourceIds(updateSelection);
                  }}
                  onError={setError}
                />
              )}
              {overviewView === "history" && (
                <AnalysisHistory
                  runs={runs}
                  selectedRun={selectedRun}
                  latest={comparisonLatest}
                  previous={comparisonPrevious}
                  stepEvents={selectedRunStepEvents}
                  annotations={selectedRunAnnotations}
                  artifactsLoading={runArtifactsLoading}
                  artifactsError={runArtifactsError}
                  detailLoading={runDetailLoading}
                  detailError={runDetailError}
                  comparisonLoading={comparisonDetailLoading}
                  comparisonError={comparisonDetailError}
                  hasMore={Boolean(runPage.nextCursor)}
                  loadingMore={loadingMoreRuns}
                  onLoadMore={loadMoreRuns}
                  onRetryDetail={loadRunDetail}
                  onRetryComparison={loadComparisonDetail}
                  onSelectRun={(id) => {
                    setSelectedRunId(id);
                    trackProductEvent("comparison_opened", {
                      hasPrevious: successfulRuns.some((run) => run.id !== id),
                    });
                  }}
                  onStartNewAnalysis={() => setOverviewView("analysis")}
                  onDeleteRun={async (runId) => {
                    setError(null);
                    try {
                      await api.deleteAnalysisRun(token, runId);
                      const remaining = runs.filter((run) => run.id !== runId);
                      setRuns(remaining);
                      setRunPage((current) => ({
                        ...current,
                        count: Math.max(0, current.count - 1),
                      }));
                      setSelectedRunId((current) => current === runId
                        ? remaining.find((run) => run.status === "succeeded")?.id ?? remaining[0]?.id ?? null
                        : current);
                      if (selectedRun?.id === runId) {
                        setSelectedRunStepEvents([]);
                        setSelectedRunAnnotations([]);
                        setRunArtifactsError(null);
                        setRunDetailError(null);
                        setComparisonDetailError(null);
                      }
                    } catch (deleteError) {
                      setError(messageFrom(deleteError));
                      throw deleteError;
                    }
                  }}
                  onOpenEvidence={openEvidence}
                  onCreateAnnotation={async (input, idempotencyKey) => {
                    const created = await api.createAnalysisRunAnnotation(
                      token,
                      selectedRun?.id ?? "",
                      input,
                      idempotencyKey,
                    );
                    setSelectedRunAnnotations((current) => [
                      created,
                      ...current.filter((item) => item.id !== created.id),
                    ]);
                    return created;
                  }}
                />
              )}
            </div>
          </div>
        )}
        {activeTab === "map" && (
          selectedRun?.result ? (
            <div className="map-workspace">
              <KnowledgeMap result={selectedRun.result} onOpenEvidence={openEvidence} />
              <ContextBacklinks
                sources={sources}
                result={selectedRun.result}
                onOpenEvidence={openEvidence}
              />
            </div>
          ) : <RunDetailFallback run={selectedRun} loading={runDetailLoading} error={runDetailError} onRetry={loadRunDetail} />
        )}
        {activeTab === "onboarding" && (
          selectedRun?.result ? (
            <div className="onboarding-grid">
              <OnboardingSummary summary={selectedRun.result.onboardingSummary} />
              <SharePanel api={api} token={token} projectTitle={project.title} run={selectedRun} onError={setError} />
            </div>
          ) : <RunDetailFallback run={selectedRun} loading={runDetailLoading} error={runDetailError} onRetry={loadRunDetail} />
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

function ProjectContextPulse({ run, onOpen }: { run: AnalysisRunResource; onOpen: () => void }) {
  if (!run.result) return null;
  const result = run.result;
  const priorityQuestion = result.questions[0]?.question;
  const lead = priorityQuestion
    ? `먼저 답할 질문: ${priorityQuestion}`
    : result.summary.overview[0] ?? "최근 분석에서 확인된 프로젝트 맥락을 살펴보세요.";

  return (
    <section className="project-context-pulse" aria-labelledby="project-context-title">
      <div className="project-context-copy">
        <p className="section-kicker">Latest context</p>
        <h2 id="project-context-title">지금 팀이 먼저 볼 맥락</h2>
        <p>{lead}</p>
        <time dateTime={run.completedAt ?? run.createdAt}>{formatDateTime(run.completedAt ?? run.createdAt)} 분석</time>
      </div>
      <dl className="project-context-metrics">
        <div><dt>관점</dt><dd>{result.participants.length}</dd></div>
        <div><dt>미결 질문</dt><dd>{result.questions.length}</dd></div>
        <div><dt>결정</dt><dd>{result.decisions.length}</dd></div>
      </dl>
      <button className="button secondary" type="button" onClick={onOpen}>최근 분석 자세히</button>
    </section>
  );
}

type OverviewTabProps = {
  api: PlatformApi;
  token: string;
  project: ProjectResource;
  sources: SourceRecordListResource[];
  runs: AnalysisRunResource[];
  selectedSourceIds: Set<string>;
  openaiEnabled: boolean;
  hasMoreSources: boolean;
  loadingMoreSources: boolean;
  onLoadMoreSources: () => Promise<void>;
  onToggleSource: (id: string) => void;
  onSourcesUpdated: (sources: SourceRecordResource[]) => void;
  onProjectChange: (project: ProjectResource) => void;
  onProjectDeleted: () => void;
  onRunCreated: (run: AnalysisRunResource) => void;
  onError: (message: string | null) => void;
  analysisAbortRef: React.MutableRefObject<AbortController | null>;
};

type PersonalDataScanSummary = {
  fingerprint: string;
  total: number;
  byKind: Record<PersonalDataKind, number>;
  affectedSourceCount: number;
};

type PersonalDataSourceScan = {
  source: SourceRecordResource;
  findings: ReturnType<typeof findPersonalData>;
};

function OverviewTab({
  api,
  token,
  project,
  sources,
  runs,
  selectedSourceIds,
  openaiEnabled,
  hasMoreSources,
  loadingMoreSources,
  onLoadMoreSources,
  onToggleSource,
  onSourcesUpdated,
  onProjectChange,
  onProjectDeleted,
  onRunCreated,
  onError,
  analysisAbortRef,
}: OverviewTabProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [retentionDays, setRetentionDays] = useState<ProjectRetentionDays>(project.retentionDays);
  const [retentionAcknowledged, setRetentionAcknowledged] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>("local");
  const [consent, setConsent] = useState(false);
  const [personalDataScan, setPersonalDataScan] = useState<PersonalDataScanSummary | null>(null);
  const [personalDataAcknowledged, setPersonalDataAcknowledged] = useState(false);
  const [preflightScanning, setPreflightScanning] = useState(false);
  const [maskingPersonalData, setMaskingPersonalData] = useState(false);
  const [maskingStatus, setMaskingStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const analysisAttemptRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const personalDataSourcesRef = useRef<PersonalDataSourceScan[]>([]);

  const activeSources = sources.filter((item) => !item.archivedAt);
  const selectedActiveSources = activeSources.filter((source) => selectedSourceIds.has(source.id));
  const selectedSourcesFingerprint = personalDataFingerprint(selectedActiveSources);
  const currentPersonalDataScan = personalDataScan?.fingerprint === selectedSourcesFingerprint
    ? personalDataScan
    : null;

  const retentionIsShorter = isShorterRetention(project.retentionDays, retentionDays);
  const retentionCandidates = retentionDeletionCandidates(sources, runs, retentionDays);

  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || saving || (retentionIsShorter && !retentionAcknowledged)) return;
    setSaving(true);
    try {
      onProjectChange(await api.updateProject(token, project.id, {
        title: title.trim(),
        description: description.trim(),
        retentionDays,
        ...(retentionIsShorter ? { acknowledgeRetentionReduction: retentionAcknowledged } : {}),
      }));
      setRetentionAcknowledged(false);
    } catch (saveError) {
      onError(messageFrom(saveError));
    } finally {
      setSaving(false);
    }
  };

  const clearPersonalDataPreflight = () => {
    setPersonalDataScan(null);
    setPersonalDataAcknowledged(false);
    setMaskingStatus(null);
    personalDataSourcesRef.current = [];
  };

  const scanSelectedSources = async () => {
    if (!api.getSource) {
      onError("개인정보 사전 점검을 사용할 수 없어 OpenAI 분석을 시작하지 않았습니다.");
      return null;
    }
    setPreflightScanning(true);
    setMaskingStatus(null);
    onError(null);
    try {
      const details = await Promise.all(
        selectedActiveSources.map((source) => api.getSource!(token, source.id)),
      );
      const scanned = details.map((source) => ({
        source,
        findings: findPersonalData(source.content),
      }));
      const findings = scanned.flatMap((item) => item.findings);
      const summary: PersonalDataScanSummary = {
        fingerprint: selectedSourcesFingerprint,
        total: findings.length,
        byKind: summarizePersonalData(findings),
        affectedSourceCount: scanned.filter((item) => item.findings.length > 0).length,
      };
      personalDataSourcesRef.current = scanned;
      setPersonalDataScan(summary);
      setPersonalDataAcknowledged(false);
      return summary;
    } catch (scanError) {
      onError(messageFrom(scanError));
      return null;
    } finally {
      setPreflightScanning(false);
    }
  };

  const saveMaskedSources = async () => {
    const scans = personalDataSourcesRef.current;
    if (!currentPersonalDataScan || currentPersonalDataScan.total === 0 || maskingPersonalData) return;
    setMaskingPersonalData(true);
    setMaskingStatus(null);
    onError(null);
    try {
      const updatedSources = await Promise.all(
        scans
          .filter((item) => item.findings.length > 0)
          .map((item) => api.updateSource(token, item.source.id, {
            content: maskPersonalData(item.source.content, item.findings),
          })),
      );
      const updatedById = new Map(updatedSources.map((source) => [source.id, source]));
      const nextScans = scans.map((item) => {
        const updated = updatedById.get(item.source.id) ?? item.source;
        return { source: updated, findings: findPersonalData(updated.content) };
      });
      const nextFindings = nextScans.flatMap((item) => item.findings);
      const nextSelectedSources = selectedActiveSources.map((source) => updatedById.get(source.id) ?? source);
      personalDataSourcesRef.current = nextScans;
      onSourcesUpdated(updatedSources);
      setPersonalDataScan({
        fingerprint: personalDataFingerprint(nextSelectedSources),
        total: nextFindings.length,
        byKind: summarizePersonalData(nextFindings),
        affectedSourceCount: nextScans.filter((item) => item.findings.length > 0).length,
      });
      setPersonalDataAcknowledged(false);
      setMaskingStatus(`${updatedSources.length.toLocaleString("ko-KR")}개 원문의 탐지 항목을 마스킹해 저장했습니다.`);
    } catch (maskError) {
      onError(messageFrom(maskError));
    } finally {
      setMaskingPersonalData(false);
    }
  };

  const runAnalysis = async () => {
    if (
      selectedSourceIds.size === 0 ||
      analyzing ||
      preflightScanning ||
      maskingPersonalData ||
      (mode === "openai" && !consent)
    ) return;
    if (mode === "openai") {
      const scan = currentPersonalDataScan ?? await scanSelectedSources();
      if (!scan || (scan.total > 0 && !personalDataAcknowledged)) return;
    }
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

  return (
    <div className="overview-layout">
      <section className="workspace-card">
        <div className="panel-heading compact"><p className="section-kicker">Project details</p><h2>프로젝트 정보</h2></div>
        <form onSubmit={saveProject}>
          <label className="field"><span>이름</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label className="field"><span>설명</span><textarea className="short-textarea" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} /></label>
          <fieldset className="retention-settings">
            <legend>원문·분석 보관</legend>
            <label className="field">
              <span>기본 보관 기간</span>
              <select
                aria-label="기본 보관 기간"
                value={retentionDays === null ? "forever" : String(retentionDays)}
                onChange={(event) => {
                  const next = event.target.value === "forever"
                    ? null
                    : Number(event.target.value) as 30 | 90;
                  setRetentionDays(next);
                  setRetentionAcknowledged(false);
                }}
              >
                <option value="30">30일</option>
                <option value="90">90일 (기본)</option>
                <option value="forever">삭제 전까지</option>
              </select>
            </label>
            <p className="retention-note">
              {retentionDays === null
                ? "사용자가 직접 삭제할 때까지 원문과 연결된 분석을 보관합니다."
                : `${retentionDays}일이 지난 원문은 매일 정리되며, 그 원문을 사용한 분석과 공유 링크도 함께 삭제됩니다.`}
            </p>
            {retentionIsShorter && (
              <div className="retention-change-confirm" role="note" aria-label="보관 기간 단축 확인">
                <strong>보관 기간을 줄이면 되돌릴 수 없는 삭제가 예약됩니다.</strong>
                <p>
                  현재 불러온 기록 기준 원문 {retentionCandidates.sources.toLocaleString("ko-KR")}건 · 연관 분석 {retentionCandidates.runs.toLocaleString("ko-KR")}건이 다음 정리 때 삭제 대상입니다.
                  {hasMoreSources ? " 불러오지 않은 이전 기록이 더 있어 실제 수는 늘어날 수 있습니다." : ""}
                </p>
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={retentionAcknowledged}
                    onChange={(event) => setRetentionAcknowledged(event.target.checked)}
                  />
                  <span>삭제 예정 범위와 연관 분석·공유 링크의 함께 삭제됨을 확인했습니다.</span>
                </label>
              </div>
            )}
          </fieldset>
          <button className="button secondary" type="submit" disabled={saving || !title.trim() || (retentionIsShorter && !retentionAcknowledged)}>{saving ? "저장 중…" : "정보 저장"}</button>
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
                  onChange={() => {
                    onToggleSource(source.id);
                    clearPersonalDataPreflight();
                  }}
                />
                <span><strong>{source.title}</strong><small>{sourceKindLabels[source.kind]} · {source.charCount.toLocaleString("ko-KR")}자</small></span>
              </label>
            ))}
            {hasMoreSources && (
              <button
                className="button secondary"
                type="button"
                disabled={loadingMoreSources}
                onClick={() => void onLoadMoreSources()}
              >
                {loadingMoreSources ? "기록 더 불러오는 중…" : "이전 기록 더 불러오기"}
              </button>
            )}
          </div>
        )}
        <fieldset className="mode-selector">
          <legend>분석 방식</legend>
          <label aria-label="로컬 분석 선택"><input data-testid="analysis-mode-local" type="radio" name="mode" checked={mode === "local"} onChange={() => { setMode("local"); setConsent(false); clearPersonalDataPreflight(); }} /><span><strong>로컬 분석</strong><small>외부 모델 전송 없이 안정적으로 시연</small></span></label>
          <label className={!openaiEnabled ? "disabled-option" : undefined} aria-label="OpenAI 분석 선택"><input data-testid="analysis-mode-openai" type="radio" name="mode" checked={mode === "openai"} disabled={!openaiEnabled} onChange={() => { setMode("openai"); setConsent(false); clearPersonalDataPreflight(); }} /><span><strong>OpenAI 분석</strong><small>선택한 기록을 서버에서 외부 모델로 전송</small></span></label>
        </fieldset>
        {!openaiEnabled && (
          <p className="capability-note" role="status">
            OpenAI 분석은 현재 서버에 구성되지 않아 로컬 분석만 사용할 수 있습니다.
          </p>
        )}
        {mode === "openai" && (
          <>
            <OpenAiTransferPreview
              sources={selectedActiveSources}
              scan={currentPersonalDataScan}
              scanning={preflightScanning}
              acknowledged={personalDataAcknowledged}
              masking={maskingPersonalData}
              maskingStatus={maskingStatus}
              onAcknowledgedChange={setPersonalDataAcknowledged}
              onMask={() => void saveMaskedSources()}
            />
            <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>미리 본 선택 원문이 분석 목적으로 OpenAI API에 전송되는 것에 동의합니다.</span></label>
          </>
        )}
        <button
          data-testid="analysis-submit"
          className="button primary full-button"
          type="button"
          disabled={
            activeSources.length === 0 ||
            selectedSourceIds.size === 0 ||
            analyzing ||
            preflightScanning ||
            maskingPersonalData ||
            (mode === "openai" && (!consent || Boolean(currentPersonalDataScan?.total && !personalDataAcknowledged)))
          }
          onClick={() => void runAnalysis()}
        >
          {preflightScanning ? "개인정보 확인 중…" : analyzing ? "분석 중…" : "선택한 기록 분석"}
        </button>
        <p className="usage-guide">저장된 분석 {runs.length}건 · 사용자당 동시 1건, 시간당 10건 제한</p>
      </section>
    </div>
  );
}

const personalDataLabels: Record<PersonalDataKind, string> = {
  email: "이메일",
  phone: "전화번호",
  residentId: "주민등록번호 형식",
  accountNumber: "계좌번호 형식",
};

function OpenAiTransferPreview({
  sources,
  scan,
  scanning,
  acknowledged,
  masking,
  maskingStatus,
  onAcknowledgedChange,
  onMask,
}: {
  sources: SourceRecordListResource[];
  scan: PersonalDataScanSummary | null;
  scanning: boolean;
  acknowledged: boolean;
  masking: boolean;
  maskingStatus: string | null;
  onAcknowledgedChange: (checked: boolean) => void;
  onMask: () => void;
}) {
  const characterCount = sources.reduce((total, source) => total + source.charCount, 0);
  const detectedKinds = scan
    ? (Object.entries(scan.byKind) as [PersonalDataKind, number][]).filter(([, count]) => count > 0)
    : [];

  return (
    <section className="openai-transfer-preview" aria-labelledby="openai-transfer-preview-title">
      <div>
        <p className="section-kicker">Before sending</p>
        <h3 id="openai-transfer-preview-title">OpenAI 전송 미리보기</h3>
        <p>선택한 원문 본문과 구조화 출력 지시만 서버에서 모델 요청에 사용합니다.</p>
      </div>
      <dl>
        <div><dt>선택 원문</dt><dd>{sources.length.toLocaleString("ko-KR")}개</dd></div>
        <div><dt>총 문자</dt><dd>{characterCount.toLocaleString("ko-KR")}자</dd></div>
      </dl>
      {sources.length > 0 ? (
        <ul aria-label="OpenAI 전송 대상 기록">
          {sources.map((source) => (
            <li key={source.id}><strong>{source.title}</strong><span>{sourceKindLabels[source.kind]} · {source.charCount.toLocaleString("ko-KR")}자</span></li>
          ))}
        </ul>
      ) : <p className="form-error">전송할 기록을 한 개 이상 선택해 주세요.</p>}
      <div className={`personal-data-preflight ${scan?.total ? "warning" : scan ? "clear" : "pending"}`}>
        <div>
          <strong>개인정보 사전 점검</strong>
          {scanning ? (
            <p role="status">선택한 원문을 안전하게 확인하는 중입니다.</p>
          ) : scan ? (
            scan.total > 0 ? (
              <p>원문 {scan.affectedSourceCount.toLocaleString("ko-KR")}개에서 탐지 가능한 개인정보 형식 {scan.total.toLocaleString("ko-KR")}건을 찾았습니다.</p>
            ) : (
              <p>이메일·전화번호·주민등록번호·계좌번호 형식이 탐지되지 않았습니다.</p>
            )
          ) : (
            <p>분석 버튼을 누르면 원문을 서버에서 읽어 탐지 종류와 개수만 표시합니다.</p>
          )}
        </div>
        {detectedKinds.length > 0 && (
          <dl aria-label="탐지된 개인정보 종류별 개수">
            {detectedKinds.map(([kind, count]) => (
              <div key={kind}><dt>{personalDataLabels[kind]}</dt><dd>{count.toLocaleString("ko-KR")}건</dd></div>
            ))}
          </dl>
        )}
        {scan && scan.total > 0 && (
          <div className="personal-data-actions">
            <button className="button secondary" type="button" disabled={masking} onClick={onMask}>
              {masking ? "마스킹 저장 중…" : "탐지 항목 마스킹 후 저장"}
            </button>
            <label className="consent-check">
              <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledgedChange(event.target.checked)} />
              <span>탐지 결과를 확인했으며 현재 원문 그대로 OpenAI에 전송합니다.</span>
            </label>
          </div>
        )}
        <p className="personal-data-status" aria-live="polite">{maskingStatus ?? ""}</p>
      </div>
      <small>내부 추론 내용은 결과나 실행 이력에 표시하지 않습니다.</small>
    </section>
  );
}

function RecordsTab({ api, token, projectId, sources, hasMore, loadingMore, onLoadMore, onSourcesChange, onError }: {
  api: PlatformApi;
  token: string;
  projectId: string;
  sources: SourceRecordListResource[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onSourcesChange: (
    update: (sources: SourceRecordListResource[]) => SourceRecordListResource[],
    updateSelection: (selected: Set<string>) => Set<string>,
  ) => void;
  onError: (message: string | null) => void;
}) {
  const [kind, setKind] = useState<SourceKind>("meeting");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceDetails, setSourceDetails] = useState<Record<string, SourceRecordResource>>({});
  const [sourceDetailLoading, setSourceDetailLoading] = useState<string | null>(null);
  const [sourceDetailErrors, setSourceDetailErrors] = useState<Record<string, string>>({});

  const loadSourceDetail = async (source: SourceRecordListResource) => {
    if (isSourceDetail(source)) {
      setSourceDetails((current) => ({ ...current, [source.id]: source }));
      return;
    }
    if (!api.getSource || sourceDetailLoading === source.id) return;
    setSourceDetailLoading(source.id);
    setSourceDetailErrors((current) => ({ ...current, [source.id]: "" }));
    try {
      const detail = await api.getSource(token, source.id);
      setSourceDetails((current) => ({ ...current, [source.id]: detail }));
    } catch (detailError) {
      setSourceDetailErrors((current) => ({
        ...current,
        [source.id]: messageFrom(detailError),
      }));
    } finally {
      setSourceDetailLoading(null);
    }
  };

  const createSource = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    onError(null);
    try {
      const created = await api.createSource(token, projectId, { kind, title: title.trim(), content: content.trim() });
      setSourceDetails((current) => ({ ...current, [created.id]: created }));
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

  const archive = async (source: SourceRecordListResource) => {
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
    setSourceDetails((current) => ({ ...current, [imported.source.id]: imported.source }));
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
      <details className="context-import-disclosure">
        <summary>
          <span><strong>외부 회의 맥락 가져오기</strong><small>카카오톡 · Teams · Notion 내보내기 또는 바로 붙여넣기</small></span>
          <span className="context-import-disclosure-state" aria-hidden="true" />
        </summary>
        <ContextImportPanel onImport={importContext} />
      </details>
      <div className="records-layout">
        <section className="workspace-card sticky-card">
        <div className="panel-heading compact"><p className="section-kicker">New source</p><h2>원문 기록 추가</h2><p>민감정보를 제거한 뒤 필요한 맥락만 저장해 주세요.</p></div>
        <form onSubmit={createSource}>
          <label className="field"><span>기록 유형</span><select data-testid="source-create-kind" value={kind} onChange={(event) => setKind(event.target.value as SourceKind)}>{Object.entries(sourceKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>제목</span><input data-testid="source-create-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="예: 7월 11일 기획 회의" required /></label>
          <label className="field"><span>원문</span><textarea data-testid="source-create-content" value={content} maxLength={100_000} onChange={(event) => setContent(event.target.value)} placeholder="회의록, 조사 메모 또는 피드백을 붙여넣으세요" required /></label>
          <div className="counter">{content.length.toLocaleString("ko-KR")} / 100,000자</div>
          <button data-testid="source-create-submit" className="button secondary full-button" type="submit" disabled={saving || !title.trim() || !content.trim()}>{saving ? "저장 중…" : "기록 저장"}</button>
        </form>
        </section>
        <section className="source-list-panel">
        <div className="section-row"><div><p className="section-kicker">Source library</p><h2>저장된 기록</h2></div><span>{sources.filter((item) => !item.archivedAt).length}개</span></div>
        {sources.filter((item) => !item.archivedAt).length === 0 ? <p className="empty-card">아직 저장된 원문이 없습니다.</p> : (
          <div className="source-card-list">
            {sources.filter((item) => !item.archivedAt).map((source) => {
              const detail = sourceDetails[source.id] ?? (isSourceDetail(source) ? source : null);
              const participants = detail?.import?.participants ?? [];
              return (
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
                    {participants.length > 0 && (
                      <span>참여자 {participants.slice(0, 4).join(" · ")}</span>
                    )}
                  </div>
                )}
                {detail?.content !== undefined ? (
                  <details className="source-content-details">
                    <summary>원문 전체 보기</summary>
                    <div>{detail.content}</div>
                  </details>
                ) : (
                  <div>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={sourceDetailLoading === source.id}
                      onClick={() => void loadSourceDetail(source)}
                    >
                      {sourceDetailLoading === source.id ? "원문 불러오는 중…" : "원문 상세 불러오기"}
                    </button>
                    {sourceDetailErrors[source.id] && (
                      <p className="form-error" role="alert">
                        {sourceDetailErrors[source.id]}
                        <button type="button" onClick={() => void loadSourceDetail(source)}>다시 시도</button>
                      </p>
                    )}
                  </div>
                )}
                <footer><span>{source.charCount.toLocaleString("ko-KR")}자</span><button className="text-button danger" type="button" onClick={() => void archive(source)}>보관</button></footer>
              </article>
            );})}
          </div>
        )}
        {hasMore && (
          <button className="button secondary full-button" type="button" disabled={loadingMore} onClick={() => void onLoadMore()}>
            {loadingMore ? "기록 더 불러오는 중…" : "기록 50개 더 불러오기"}
          </button>
        )}
        </section>
      </div>
    </div>
  );
}

function SharePanel({ api, token, projectTitle, run, onError }: {
  api: PlatformApi;
  token: string;
  projectTitle: string;
  run: AnalysisRunResource;
  onError: (message: string | null) => void;
}) {
  const [links, setLinks] = useState<ShareLinkResource[]>([]);
  const [disclosureMode, setDisclosureMode] = useState<ShareDisclosureMode>("summary");
  const [includeProjectTitle, setIncludeProjectTitle] = useState(false);
  const [days, setDays] = useState(7);
  const [evidenceAcknowledged, setEvidenceAcknowledged] = useState(false);
  const [creating, setCreating] = useState(false);
  const [freshUrls, setFreshUrls] = useState<Record<string, string>>({});
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const confirmRevokeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;
    api.listShareLinks(token, run.id).then((items) => { if (active) setLinks(items); }).catch((loadError) => { if (active) onError(messageFrom(loadError)); });
    return () => { active = false; };
  }, [api, onError, run.id, token]);

  useEffect(() => {
    if (confirmingRevokeId) confirmRevokeButtonRef.current?.focus();
  }, [confirmingRevokeId]);

  const create = async () => {
    if (disclosureMode === "evidence" && !evidenceAcknowledged) return;
    setCreating(true);
    onError(null);
    try {
      const link = await api.createShareLink(token, run.id, {
        disclosureMode,
        includeProjectTitle,
        expiresInDays: days,
        ...(disclosureMode === "evidence" ? { acknowledgeSensitiveEvidence: true } : {}),
      });
      setLinks((current) => [link, ...current]);
      trackProductEvent("share_link_created", { disclosureMode, expiresInDays: days, includeProjectTitle });
      setEvidenceAcknowledged(false);
      if (link.token) setFreshUrls((current) => ({ ...current, [link.id]: `${window.location.origin}/share#token=${encodeURIComponent(link.token ?? "")}` }));
    } catch (createError) {
      onError(messageFrom(createError));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (linkId: string) => {
    setRevokingId(linkId);
    try {
      await api.revokeShareLink(token, linkId);
      setLinks((current) => current.map((link) => link.id === linkId ? { ...link, revokedAt: new Date().toISOString() } : link));
      setConfirmingRevokeId(null);
    } catch (revokeError) {
      onError(messageFrom(revokeError));
    } finally {
      setRevokingId(null);
    }
  };

  const cancelRevoke = (linkId: string) => {
    setConfirmingRevokeId(null);
    window.setTimeout(() => document.getElementById(`share-revoke-${linkId}`)?.focus(), 0);
  };

  const copyLink = async (linkId: string, url: string) => {
    setCopiedLinkId(null);
    setCopyError(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(linkId);
    } catch {
      setCopyError("자동 복사가 지원되지 않습니다. 링크 입력란을 선택해 직접 복사해 주세요.");
    }
  };

  return (
    <section className="share-panel workspace-card" aria-labelledby="share-title">
      <div className="panel-heading compact"><p className="section-kicker">Read-only share</p><h2 id="share-title">온보딩 링크 공유</h2><p>공개 범위를 먼저 고르고 비로그인 화면을 확인하세요. 토큰은 생성 직후 한 번만 표시됩니다.</p></div>
      <fieldset className="share-mode-selector">
        <legend>공개 범위</legend>
        <label aria-label="요약 공유" className={disclosureMode === "summary" ? "selected" : ""}>
          <input
            type="radio"
            name={`share-mode-${run.id}`}
            value="summary"
            checked={disclosureMode === "summary"}
            onChange={() => {
              setDisclosureMode("summary");
              setDays(7);
              setEvidenceAcknowledged(false);
            }}
          />
          <span><strong>요약 공유</strong><small>이름·원문 제목·정확한 인용문 제외 · 기본 7일</small></span>
        </label>
        <label aria-label="근거 포함 공유" className={disclosureMode === "evidence" ? "selected" : ""}>
          <input
            type="radio"
            name={`share-mode-${run.id}`}
            value="evidence"
            checked={disclosureMode === "evidence"}
            onChange={() => {
              setDisclosureMode("evidence");
              setDays(1);
              setEvidenceAcknowledged(false);
            }}
          />
          <span><strong>근거 포함 공유</strong><small>원문 제목·정확한 인용문 포함 가능 · 기본 24시간</small></span>
        </label>
      </fieldset>
      <div className="share-options">
        <label className="field">
          <span>만료</span>
          <select aria-label="공유 링크 만료" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            {disclosureMode === "summary" ? (
              <><option value={1}>1일</option><option value={7}>7일</option><option value={14}>14일</option><option value={30}>30일</option></>
            ) : (
              <><option value={1}>24시간</option><option value={3}>3일</option><option value={7}>7일</option></>
            )}
          </select>
        </label>
        <label className="consent-check share-title-option">
          <input type="checkbox" checked={includeProjectTitle} onChange={(event) => setIncludeProjectTitle(event.target.checked)} />
          <span>프로젝트 제목도 공개</span>
        </label>
      </div>
      <ShareDisclosurePreview
        disclosureMode={disclosureMode}
        includeProjectTitle={includeProjectTitle}
        projectTitle={projectTitle}
        run={run}
      />
      {disclosureMode === "evidence" && (
        <div className="share-evidence-confirm" role="note">
          <strong>정확한 인용문에는 이름이나 민감정보가 남아 있을 수 있습니다.</strong>
          <p>위 미리보기에 표시된 원문 제목과 인용 범위를 확인했습니다. 이 링크는 최근 인증된 세션에서만 만들 수 있습니다.</p>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={evidenceAcknowledged}
              onChange={(event) => setEvidenceAcknowledged(event.target.checked)}
            />
            <span>민감정보 공개 가능성을 확인했고 근거 공유에 동의합니다.</span>
          </label>
        </div>
      )}
      <button
        data-testid="share-create"
        className="button primary full-button"
        type="button"
        disabled={creating || (disclosureMode === "evidence" && !evidenceAcknowledged)}
        onClick={() => void create()}
      >
        {creating ? "만드는 중…" : `${disclosureMode === "summary" ? "요약" : "근거 포함"} 링크 만들기`}
      </button>
      {links.length === 0 ? <p className="empty-card">이 분석에 생성된 공유 링크가 없습니다.</p> : (
        <ul className="share-link-list">
          {links.map((link) => {
            const url = freshUrls[link.id];
            const revoked = Boolean(link.revokedAt);
            const confirming = confirmingRevokeId === link.id;
            return (
              <li key={link.id} className={revoked ? "revoked" : ""}>
                <div>
                  <div className="share-link-heading">
                    <strong>{revoked ? "폐기됨" : `${formatDateTime(link.expiresAt)} 만료`}</strong>
                    <span>{link.disclosureMode === "evidence" ? "근거 포함" : "요약"}</span>
                    {link.includeProjectTitle && <span>제목 공개</span>}
                  </div>
                  {url ? (
                    <div>
                      <input aria-label="새 공유 링크" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
                      <button className="button secondary" type="button" onClick={() => void copyLink(link.id, url)}>링크 복사</button>
                    </div>
                  ) : <small>보안을 위해 기존 토큰은 다시 표시되지 않습니다.</small>}
                </div>
                {!revoked && !confirming && (
                  <button
                    id={`share-revoke-${link.id}`}
                    data-testid={`share-revoke-${link.id}`}
                    className="text-button danger"
                    type="button"
                    aria-expanded="false"
                    aria-controls={`share-revoke-confirm-${link.id}`}
                    onClick={() => setConfirmingRevokeId(link.id)}
                  >
                    링크 폐기
                  </button>
                )}
                {confirming && (
                  <div
                    id={`share-revoke-confirm-${link.id}`}
                    role="alertdialog"
                    aria-labelledby={`share-revoke-title-${link.id}`}
                    aria-describedby={`share-revoke-description-${link.id}`}
                  >
                    <strong id={`share-revoke-title-${link.id}`}>이 공유 링크를 폐기할까요?</strong>
                    <p id={`share-revoke-description-${link.id}`}>즉시 열 수 없게 되며 되돌릴 수 없습니다.</p>
                    <button
                      ref={confirmRevokeButtonRef}
                      className="button destructive"
                      type="button"
                      disabled={revokingId === link.id}
                      onClick={() => void revoke(link.id)}
                    >
                      {revokingId === link.id ? "폐기하는 중…" : "폐기 확인"}
                    </button>
                    <button className="button secondary" type="button" disabled={revokingId === link.id} onClick={() => cancelRevoke(link.id)}>취소</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className={`copy-status ${copiedLinkId ? "copied" : copyError ? "error" : ""}`} aria-live="polite">
        {copiedLinkId ? "공유 링크를 클립보드에 복사했습니다." : copyError ?? ""}
      </p>
    </section>
  );
}

function ShareDisclosurePreview({ disclosureMode, includeProjectTitle, projectTitle, run }: {
  disclosureMode: ShareDisclosureMode;
  includeProjectTitle: boolean;
  projectTitle: string;
  run: AnalysisRunResource;
}) {
  const result = run.result;
  if (!result) return null;
  const participantNames = [
    ...result.participants.map((participant) => participant.actor),
    ...result.participantAgents.views.map((view) => view.actor),
  ].filter((name, index, all) => name.trim().length > 0 && all.indexOf(name) === index);
  const redact = (value: string) => redactParticipantNames(value, participantNames);

  return (
    <section className="share-disclosure-preview" aria-labelledby="share-preview-title">
      <header>
        <div>
          <p className="section-kicker">비로그인 화면 미리보기</p>
          <h3 id="share-preview-title">{includeProjectTitle ? projectTitle : "공유된 분석 요약"}</h3>
          <p>읽기 전용 분석 · {formatDateTime(run.completedAt ?? run.createdAt)}</p>
        </div>
        <span className="read-only-badge">수정 불가</span>
      </header>
      <div className={`share-preview-scope ${disclosureMode}`}>
        {disclosureMode === "evidence"
          ? "근거 포함: 계정 정보와 원문 전체는 숨기고, 확인된 원문 제목과 정확한 인용문을 표시합니다."
          : "요약: 참여자 이름, 원문 제목, 정확한 인용문, 계정 정보와 공급자 정보를 제외합니다."}
      </div>
      <div className="share-preview-content">
        <section>
          <h4>핵심 맥락</h4>
          <ol>{result.summary.overview.slice(0, 3).map((item) => <li key={item}>{redact(item)}</li>)}</ol>
        </section>
        <section>
          <h4>현재 결정</h4>
          {result.decisions.length > 0 ? (
            <ul>{result.decisions.slice(0, 3).map((decision) => (
              <li key={decision.id ?? decision.decision}>
                <strong>{redact(decision.decision)}</strong>
                <p>{redact(decision.reason)}</p>
                {disclosureMode === "evidence" && decision.evidence?.map((evidence) => (
                  <blockquote key={`${evidence.sourceRecordId}-${evidence.quote}`}>
                    <cite>{redact(evidence.sourceTitle)}</cite>
                    <p>“{evidence.quote}”</p>
                  </blockquote>
                ))}
              </li>
            ))}</ul>
          ) : <p>공개할 결정이 없습니다.</p>}
        </section>
        <section>
          <h4>남은 질문</h4>
          {result.questions.length > 0
            ? <ul>{result.questions.slice(0, 3).map((question) => <li key={question.id ?? question.question}>{redact(question.question)}</li>)}</ul>
            : <p>공개할 미결 질문이 없습니다.</p>}
        </section>
      </div>
      <footer>원문 전체 · 사용자 이메일 · 공급자 내부정보는 어떤 모드에서도 공개하지 않습니다.</footer>
    </section>
  );
}

function RunDetailFallback({
  run,
  loading,
  error,
  onRetry,
}: {
  run: AnalysisRunResource | null;
  loading: boolean;
  error: string | null;
  onRetry: (runId: string) => Promise<void>;
}) {
  if (!run) return <EmptyAnalysis />;
  if (loading) {
    return <div className="loading-card" role="status">선택한 분석의 상세 결과를 불러오는 중…</div>;
  }
  if (error) {
    return <div className="notice error" role="alert">{error}<button type="button" onClick={() => void onRetry(run.id)}>다시 시도</button></div>;
  }
  return <div className="empty-card">이 실행에는 표시할 상세 결과가 없습니다.</div>;
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

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

function isSourceDetail(source: SourceRecordListResource): source is SourceRecordResource {
  return "content" in source && typeof source.content === "string";
}

function isShorterRetention(current: ProjectRetentionDays, next: ProjectRetentionDays) {
  if (next === null) return false;
  if (current === null) return true;
  return next < current;
}

function retentionDeletionCandidates(
  sources: SourceRecordListResource[],
  runs: AnalysisRunResource[],
  retentionDays: ProjectRetentionDays,
) {
  if (retentionDays === null) return { sources: 0, runs: 0 };
  const cutoff = Date.now() - retentionDays * 86_400_000;
  const expiredSourceIds = new Set(
    sources
      .filter((source) => {
        const timestamp = Date.parse(source.createdAt);
        return Number.isFinite(timestamp) && timestamp < cutoff;
      })
      .map((source) => source.id),
  );
  return {
    sources: expiredSourceIds.size,
    runs: runs.filter((run) => run.sourceIds.some((sourceId) => expiredSourceIds.has(sourceId))).length,
  };
}

function legacyCursorPage<T>(items: T[]) {
  return {
    items,
    page: { ...completedPage, limit: Math.max(1, items.length), count: items.length },
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function redactParticipantNames(value: string, names: string[]) {
  return [...names]
    .sort((left, right) => right.length - left.length)
    .reduce((redacted, name, index) => (
      name.trim().length < 2 ? redacted : redacted.split(name).join(`참여자 ${index + 1}`)
  ), value);
}

function personalDataFingerprint(sources: SourceRecordListResource[]) {
  return JSON.stringify(
    [...sources]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((source) => [source.id, source.updatedAt, source.charCount]),
  );
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

function readProjectViewState(): { tab: ProjectTab; view: OverviewView } {
  if (typeof window === "undefined") return { tab: "overview", view: "history" };
  const params = new URLSearchParams(window.location.search);
  const tabValue = params.get("tab");
  const viewValue = params.get("view");
  const tab: ProjectTab = tabValue === "map" || tabValue === "onboarding"
    ? tabValue
    : "overview";
  const view: OverviewView = viewValue === "analysis" || viewValue === "records" || viewValue === "history"
    ? viewValue
    : "history";
  return { tab, view };
}

function hasExplicitOverviewView() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("view");
}

export default ProjectPage;
