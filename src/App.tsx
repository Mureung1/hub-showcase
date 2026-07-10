import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import AnalysisPlaceholder from "./components/AnalysisPlaceholder";
import ContextInput from "./components/ContextInput";
import DecisionList from "./components/DecisionList";
import KeyTerms from "./components/KeyTerms";
import KnowledgeMap from "./components/KnowledgeMap";
import OnboardingSummary from "./components/OnboardingSummary";
import ParticipantAgentPanel from "./components/ParticipantAgentPanel";
import PerspectiveTable from "./components/PerspectiveTable";
import QuestionList from "./components/QuestionList";
import SummaryPanel from "./components/SummaryPanel";
import { sampleAnalysis, sampleInput } from "./data/sampleAnalysis";
import { ContextAnalysisRequestError, analyzeContext } from "./services/analyzeContext";
import type { ContextAnalysisResult } from "./types/context";

type ResultTab = "overview" | "map" | "onboarding";
type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "sample" | "success"; result: ContextAnalysisResult };

function App() {
  const [projectTitle, setProjectTitle] = useState("모두의 뇌 MVP");
  const [inputText, setInputText] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const requestVersion = useRef(0);
  const activeAbortController = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      activeAbortController.current?.abort();
    },
    [],
  );

  const analysisResult =
    analysisState.status === "sample" || analysisState.status === "success"
      ? analysisState.result
      : null;
  const isAnalyzing = analysisState.status === "loading";
  const analysisError = analysisState.status === "error" ? analysisState.message : null;
  const placeholderStatus =
    analysisState.status === "loading" || analysisState.status === "error"
      ? analysisState.status
      : "idle";

  const clearAnalysisForEdit = () => {
    activeAbortController.current?.abort();
    activeAbortController.current = null;
    requestVersion.current += 1;
    setAnalysisState({ status: "idle" });
    setActiveTab("overview");
  };

  const handleProjectTitleChange = (value: string) => {
    setProjectTitle(value);
    clearAnalysisForEdit();
  };

  const handleInputTextChange = (value: string) => {
    setInputText(value);
    clearAnalysisForEdit();
  };

  const handleLoadSample = () => {
    activeAbortController.current?.abort();
    activeAbortController.current = null;
    requestVersion.current += 1;
    setProjectTitle(sampleAnalysis.projectTitle);
    setInputText(sampleInput);
    setAnalysisState({ status: "sample", result: sampleAnalysis });
    setActiveTab("overview");
  };

  const handleAnalyze = async () => {
    activeAbortController.current?.abort();
    const controller = new AbortController();
    activeAbortController.current = controller;
    const currentRequest = requestVersion.current + 1;
    requestVersion.current = currentRequest;
    setAnalysisState({ status: "loading" });
    setActiveTab("overview");

    try {
      const result = await analyzeContext(projectTitle, inputText, { signal: controller.signal });
      if (requestVersion.current !== currentRequest) return;

      setAnalysisState({ status: "success", result });
      setActiveTab("overview");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (requestVersion.current !== currentRequest) return;

      setAnalysisState({ status: "error", message: getAnalysisErrorMessage(error) });
    } finally {
      if (activeAbortController.current === controller) {
        activeAbortController.current = null;
      }
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: ResultTab) => {
    if (!analysisResult) return;

    const tabs: ResultTab[] = ["overview", "map", "onboarding"];
    const currentIndex = tabs.indexOf(currentTab);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab);
    document.getElementById(`tab-${nextTab}`)?.focus();
  };

  const handleMapNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (analysisResult) setActiveTab("map");
    document
      .getElementById("result-workspace")
      ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const badgeLabel =
    analysisState.status === "loading"
      ? "API 분석 중"
      : analysisState.status === "success"
        ? `${analysisState.result.provider.name} 분석 결과`
        : analysisState.status === "error"
          ? "분석 오류"
          : analysisState.status === "sample"
            ? "예시 데이터 데모"
            : "분석 대기";

  const analysisNotice =
    analysisState.status === "success"
      ? "분석 API 응답을 기준으로 결과가 갱신되었습니다."
      : analysisState.status === "sample"
        ? "사용자가 직접 불러온 예시 데이터입니다. 분석 버튼을 누르면 API 결과로 교체됩니다."
        : analysisState.status === "loading"
          ? "입력 기록에서 결정 배경과 참여자 관점을 분석하고 있습니다."
          : "기록을 입력해 분석하거나 예시 데이터를 직접 불러오세요.";

  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="주요 메뉴">
        <a href="#top" aria-label="모두의 뇌 홈">
          모두의 뇌
        </a>
        <div>
          <a href="#input-title">입력</a>
          <a href="#result-workspace">분석</a>
          <a href="#result-workspace" onClick={handleMapNavigation}>
            지식맵
          </a>
        </div>
      </nav>

      <section className="hero" id="top">
        <p className="eyebrow">Shared Context Agent</p>
        <h1 aria-label="팀의 흩어진 맥락을 하나의 뇌로.">
          <span className="title-wide" aria-hidden="true">
            팀의 흩어진 맥락을 하나의 뇌로.
          </span>
          <span className="title-small" aria-hidden="true">
            팀의 흩어진
            <br />
            맥락을 하나의
            <br />
            뇌로.
          </span>
        </h1>
        <p className="hero-copy">
          모두의 뇌는 회의록, 조사 메모, 피드백에 흩어진 결정 배경과 관점 차이를
          연결해 팀 전체가 같은 배경지식 위에서 움직이도록 돕습니다.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#input-title">
            프로토타입 사용
          </a>
          <a className="button ghost" href="#result-workspace" onClick={handleMapNavigation}>
            지식맵 보기
          </a>
        </div>
      </section>

      <section className="workflow" aria-label="모두의 뇌 작동 흐름">
        <div>
          <span>01</span>
          <strong>기록 입력</strong>
          <p>회의록과 메모를 한 곳에 붙여넣습니다.</p>
        </div>
        <div>
          <span>02</span>
          <strong>맥락 분석</strong>
          <p>결정 배경, 관점, 질문을 분리합니다.</p>
        </div>
        <div>
          <span>03</span>
          <strong>공유 지식화</strong>
          <p>새 팀원이 이해할 수 있는 구조로 보여줍니다.</p>
        </div>
      </section>

      <div className="prototype-grid">
        <ContextInput
          projectTitle={projectTitle}
          inputText={inputText}
          isAnalyzing={isAnalyzing}
          analysisError={analysisError}
          analysisNotice={analysisNotice}
          onProjectTitleChange={handleProjectTitleChange}
          onInputTextChange={handleInputTextChange}
          onLoadSample={handleLoadSample}
          onAnalyze={handleAnalyze}
        />
        {analysisResult ? (
          <SummaryPanel result={analysisResult} />
        ) : (
          <AnalysisPlaceholder
            status={placeholderStatus}
            message={analysisError}
            surface="summary"
          />
        )}
      </div>

      <section className="result-workspace" id="result-workspace" aria-labelledby="results-heading">
        <div className="result-header">
          <div>
            <p className="section-kicker">Result View</p>
            <h2 id="results-heading">분석 결과</h2>
            <span className={`demo-badge ${analysisState.status}`}>{badgeLabel}</span>
          </div>

          <div className="tab-list" role="tablist" aria-label="결과 보기 방식">
            <button
              id="tab-overview"
              className={activeTab === "overview" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === "overview"}
              aria-controls="panel-overview"
              tabIndex={activeTab === "overview" ? 0 : -1}
              disabled={!analysisResult}
              onClick={() => setActiveTab("overview")}
              onKeyDown={(event) => handleTabKeyDown(event, "overview")}
            >
              개요
            </button>
            <button
              id="tab-map"
              className={activeTab === "map" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === "map"}
              aria-controls="panel-map"
              tabIndex={activeTab === "map" ? 0 : -1}
              disabled={!analysisResult}
              onClick={() => setActiveTab("map")}
              onKeyDown={(event) => handleTabKeyDown(event, "map")}
            >
              지식맵
            </button>
            <button
              id="tab-onboarding"
              className={activeTab === "onboarding" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === "onboarding"}
              aria-controls="panel-onboarding"
              tabIndex={activeTab === "onboarding" ? 0 : -1}
              disabled={!analysisResult}
              onClick={() => setActiveTab("onboarding")}
              onKeyDown={(event) => handleTabKeyDown(event, "onboarding")}
            >
              온보딩 요약
            </button>
          </div>
        </div>

        {!analysisResult ? (
          <AnalysisPlaceholder
            status={placeholderStatus}
            message={analysisError}
            surface="workspace"
          />
        ) : activeTab === "overview" ? (
          <div
            className="results-grid overview-grid"
            id="panel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
          >
            <PerspectiveTable participants={analysisResult.participants} />
            <ParticipantAgentPanel synthesis={analysisResult.participantAgents} />
            <QuestionList questions={analysisResult.questions} />
            <DecisionList decisions={analysisResult.decisions} />
            <KeyTerms terms={analysisResult.keyTerms} />
          </div>
        ) : activeTab === "map" ? (
          <div
            className="results-grid single-grid"
            id="panel-map"
            role="tabpanel"
            aria-labelledby="tab-map"
          >
            <KnowledgeMap map={analysisResult.knowledgeMap} />
          </div>
        ) : (
          <div
            className="results-grid single-grid"
            id="panel-onboarding"
            role="tabpanel"
            aria-labelledby="tab-onboarding"
          >
            <OnboardingSummary summary={analysisResult.onboardingSummary} />
          </div>
        )}
      </section>
    </main>
  );
}

function getAnalysisErrorMessage(error: unknown) {
  if (error instanceof ContextAnalysisRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 분석 오류가 발생했습니다.";
}

export default App;
