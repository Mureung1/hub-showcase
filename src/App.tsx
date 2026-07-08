import { useState } from "react";
import ContextInput from "./components/ContextInput";
import DecisionList from "./components/DecisionList";
import KeyTerms from "./components/KeyTerms";
import KnowledgeMap from "./components/KnowledgeMap";
import OnboardingSummary from "./components/OnboardingSummary";
import PerspectiveTable from "./components/PerspectiveTable";
import QuestionList from "./components/QuestionList";
import SummaryPanel from "./components/SummaryPanel";
import { sampleAnalysis, sampleInput } from "./data/sampleAnalysis";
import { analyzeContext } from "./services/analyzeContext";
import type { ContextAnalysisResult } from "./types/context";

type ResultTab = "overview" | "map" | "onboarding";

function App() {
  const [projectTitle, setProjectTitle] = useState("모두의 뇌 MVP");
  const [inputText, setInputText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<ContextAnalysisResult>(sampleAnalysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");

  const handleLoadSample = () => {
    setProjectTitle(sampleAnalysis.projectTitle);
    setInputText(sampleInput);
    setAnalysisResult(sampleAnalysis);
    setActiveTab("overview");
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeContext(projectTitle, inputText);
    setAnalysisResult(result);
    setActiveTab("overview");
    setIsAnalyzing(false);
  };

  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="주요 메뉴">
        <a href="#top" aria-label="모두의 뇌 홈">
          모두의 뇌
        </a>
        <div>
          <a href="#input-title">입력</a>
          <a href="#summary-title">분석</a>
          <a href="#map-title">지식맵</a>
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
          <a className="button ghost" href="#map-title">
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
          onProjectTitleChange={setProjectTitle}
          onInputTextChange={setInputText}
          onLoadSample={handleLoadSample}
          onAnalyze={handleAnalyze}
        />
        <SummaryPanel result={analysisResult} />
      </div>

      <section className="result-workspace" aria-label="분석 결과">
        <div className="result-header">
          <div>
            <p className="section-kicker">Result View</p>
            <h2>분석 결과</h2>
            <span className="demo-badge">더미 데이터 데모</span>
          </div>

          <div className="tab-list" role="tablist" aria-label="결과 보기 방식">
            <button
              className={activeTab === "overview" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              개요
            </button>
            <button
              className={activeTab === "map" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === "map"}
              onClick={() => setActiveTab("map")}
            >
              지식맵
            </button>
            <button
              className={activeTab === "onboarding" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === "onboarding"}
              onClick={() => setActiveTab("onboarding")}
            >
              온보딩 요약
            </button>
          </div>
        </div>

        {activeTab === "overview" ? (
          <div className="results-grid overview-grid" role="tabpanel">
            <PerspectiveTable perspectives={analysisResult.perspectives} />
            <QuestionList questions={analysisResult.unresolvedQuestions} />
            <DecisionList decisions={analysisResult.decisions} />
            <KeyTerms terms={analysisResult.keyTerms} />
          </div>
        ) : null}

        {activeTab === "map" ? (
          <div className="results-grid single-grid" role="tabpanel">
            <KnowledgeMap map={analysisResult.knowledgeMap} />
          </div>
        ) : null}

        {activeTab === "onboarding" ? (
          <div className="results-grid single-grid" role="tabpanel">
            <OnboardingSummary items={analysisResult.onboardingSummary} />
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
