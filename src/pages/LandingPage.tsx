import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import AnalysisPlaceholder from "../components/AnalysisPlaceholder";
import ContextInput from "../components/ContextInput";
import DecisionList from "../components/DecisionList";
import KeyTerms from "../components/KeyTerms";
import KnowledgeMap from "../components/KnowledgeMap";
import OnboardingSummary from "../components/OnboardingSummary";
import ParticipantAgentPanel from "../components/ParticipantAgentPanel";
import PerspectiveTable from "../components/PerspectiveTable";
import QuestionList from "../components/QuestionList";
import SummaryPanel from "../components/SummaryPanel";
import { sampleAnalysis, sampleInput } from "../data/sampleAnalysis";
import type { Navigate } from "../hooks/useRoute";
import { ContextAnalysisRequestError, analyzeContext } from "../services/analyzeContext";
import type { ContextAnalysisResult } from "../types/context";

type ResultTab = "overview" | "map" | "onboarding";
type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "sample" | "success"; result: ContextAnalysisResult };

function LandingPage({ navigate }: { navigate: Navigate }) {
  const [projectTitle, setProjectTitle] = useState("Modu Brain MVP");
  const [inputText, setInputText] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const requestVersion = useRef(0);
  const activeAbortController = useRef<AbortController | null>(null);

  useEffect(() => () => activeAbortController.current?.abort(), []);

  const analysisResult =
    analysisState.status === "sample" || analysisState.status === "success"
      ? analysisState.result
      : null;
  const isAnalyzing = analysisState.status === "loading";
  const error = analysisState.status === "error" ? analysisState.message : null;

  const clearForEdit = () => {
    activeAbortController.current?.abort();
    activeAbortController.current = null;
    requestVersion.current += 1;
    setAnalysisState({ status: "idle" });
    setActiveTab("overview");
  };

  const loadSample = () => {
    clearForEdit();
    setProjectTitle(sampleAnalysis.projectTitle);
    setInputText(sampleInput);
    setAnalysisState({ status: "sample", result: sampleAnalysis });
  };

  const runAnalysis = async () => {
    activeAbortController.current?.abort();
    const controller = new AbortController();
    activeAbortController.current = controller;
    const version = ++requestVersion.current;
    setAnalysisState({ status: "loading" });
    setActiveTab("overview");
    try {
      const result = await analyzeContext(projectTitle, inputText, { signal: controller.signal });
      if (requestVersion.current === version) setAnalysisState({ status: "success", result });
    } catch (requestError) {
      if (controller.signal.aborted || requestVersion.current !== version) return;
      setAnalysisState({ status: "error", message: getErrorMessage(requestError) });
    } finally {
      if (activeAbortController.current === controller) activeAbortController.current = null;
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ResultTab) => {
    if (!analysisResult) return;
    const tabs: ResultTab[] = ["overview", "map", "onboarding"];
    const current = tabs.indexOf(tab);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[next]);
    document.getElementById(`landing-tab-${tabs[next]}`)?.focus();
  };

  const badge =
    analysisState.status === "loading"
      ? "분석 중"
      : analysisState.status === "success"
        ? `${analysisState.result.provider.name} 분석 결과`
        : analysisState.status === "error"
          ? "분석 오류"
          : analysisState.status === "sample"
            ? "샘플 데이터"
            : "분석 대기";

  return (
    <main className="app-shell landing-shell">
      <section className="hero" id="top">
        <p className="eyebrow">Shared Context Agent</p>
        <h1>흩어진 팀의 맥락을 하나의 뇌로.</h1>
        <p className="hero-copy">
          회의록, 조사 메모, 피드백 속 결정 배경과 관점 차이를 연결해 팀 전체가 같은
          맥락에서 움직이도록 돕습니다.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#prototype">샘플 직접 체험</a>
          <button className="button ghost" type="button" onClick={() => navigate("/login")}>
            내 프로젝트 시작
          </button>
        </div>
      </section>

      <section className="workflow" aria-label="Modu Brain 작동 흐름">
        <div><span>01</span><strong>기록 축적</strong><p>회의·리서치·피드백을 프로젝트별로 안전하게 모읍니다.</p></div>
        <div><span>02</span><strong>맥락 분석</strong><p>결정, 관점, 질문을 원문 근거와 함께 구조화합니다.</p></div>
        <div><span>03</span><strong>변화와 공유</strong><p>분석 이력을 비교하고 읽기 전용 링크로 온보딩합니다.</p></div>
      </section>

      <section className="section-intro" id="prototype">
        <p className="section-kicker">Public prototype</p>
        <h2>로그인 없이 결정론적 샘플을 살펴보세요</h2>
        <p>이 화면의 직접 입력 분석은 저장되지 않습니다. 영속 프로젝트와 OpenAI 분석은 로그인 후 사용할 수 있습니다.</p>
      </section>

      <div className="prototype-grid">
        <ContextInput
          projectTitle={projectTitle}
          inputText={inputText}
          isAnalyzing={isAnalyzing}
          analysisError={error}
          analysisNotice={
            analysisState.status === "sample"
              ? "직접 불러온 샘플입니다. 분석 버튼을 누르면 비영속 API 결과로 교체됩니다."
              : analysisState.status === "success"
                ? "비영속 분석 API 응답으로 결과가 갱신되었습니다."
                : "기록을 입력해 분석하거나 샘플을 불러오세요."
          }
          onProjectTitleChange={(value) => { setProjectTitle(value); clearForEdit(); }}
          onInputTextChange={(value) => { setInputText(value); clearForEdit(); }}
          onLoadSample={loadSample}
          onAnalyze={runAnalysis}
        />
        {analysisResult ? <SummaryPanel result={analysisResult} /> : (
          <AnalysisPlaceholder
            status={analysisState.status === "loading" || analysisState.status === "error" ? analysisState.status : "idle"}
            message={error}
            surface="summary"
          />
        )}
      </div>

      <section className="result-workspace" aria-labelledby="landing-results-heading">
        <div className="result-header">
          <div>
            <p className="section-kicker">Result view</p>
            <h2 id="landing-results-heading">분석 결과</h2>
            <span className={`demo-badge ${analysisState.status}`}>{badge}</span>
          </div>
          <div className="tab-list" role="tablist" aria-label="결과 보기 방식">
            {(["overview", "map", "onboarding"] as ResultTab[]).map((tab) => (
              <button
                id={`landing-tab-${tab}`}
                key={tab}
                className={activeTab === tab ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`landing-panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                disabled={!analysisResult}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, tab)}
              >
                {{ overview: "개요", map: "지식맵", onboarding: "온보딩 요약" }[tab]}
              </button>
            ))}
          </div>
        </div>

        {!analysisResult ? (
          <AnalysisPlaceholder
            status={analysisState.status === "loading" || analysisState.status === "error" ? analysisState.status : "idle"}
            message={error}
            surface="workspace"
          />
        ) : activeTab === "overview" ? (
          <div className="results-grid overview-grid" id="landing-panel-overview" role="tabpanel" aria-labelledby="landing-tab-overview">
            <PerspectiveTable participants={analysisResult.participants} />
            <ParticipantAgentPanel synthesis={analysisResult.participantAgents} />
            <QuestionList questions={analysisResult.questions} />
            <DecisionList decisions={analysisResult.decisions} />
            <KeyTerms terms={analysisResult.keyTerms} />
          </div>
        ) : activeTab === "map" ? (
          <div className="results-grid single-grid" id="landing-panel-map" role="tabpanel" aria-labelledby="landing-tab-map">
            <KnowledgeMap map={analysisResult.knowledgeMap} />
          </div>
        ) : (
          <div className="results-grid single-grid" id="landing-panel-onboarding" role="tabpanel" aria-labelledby="landing-tab-onboarding">
            <OnboardingSummary summary={analysisResult.onboardingSummary} />
          </div>
        )}
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ContextAnalysisRequestError || error instanceof Error) return error.message;
  return "알 수 없는 분석 오류가 발생했습니다.";
}

export default LandingPage;
