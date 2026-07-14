import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import logoUrl from "../Logo-cropped.png";
import {
  ANALYSIS_STATUS,
  createMockAnalysisResult,
  getRepositoryUrlError,
  parseGitHubRepositoryUrl,
} from "./repositoryAnalysis.mjs";

const overviewItems = [
  ["대상", "프로젝트 경험을 쌓는 대학생 개발자"],
  ["문제", "프로젝트 종료 후 역할과 핵심 구현 내용을 잊어버림"],
  ["해결", "저장소를 분석해 회고와 포트폴리오 초안 생성"],
  ["형태", "GitHub Repository / 프로젝트 폴더 기반 AI Agent"],
];

const coreFeatures = [
  ["Repository 입력", "GitHub URL 또는 프로젝트 폴더를 입력합니다."],
  ["프로젝트 분석", "README, 폴더 구조, 주요 코드 파일을 확인합니다."],
  ["기술 스택 정리", "프레임워크, 라이브러리, 개발 도구를 추출합니다."],
  ["핵심 기능 요약", "프로젝트 목적과 주요 기능을 짧게 정리합니다."],
  ["회고 초안 생성", "어려웠던 점과 해결 과정을 문장으로 정리합니다."],
  ["역할 정리 템플릿", "내가 한 일, 배운 점, 기여 내용을 구분합니다."],
  ["Markdown 내보내기", "포트폴리오에 바로 옮길 수 있는 문서로 제공합니다."],
];

const futureFeatures = [
  ["커밋 기여도", "수정 파일과 작업 흐름을 기준으로 기여를 분석합니다."],
  ["PR/Issue 분석", "논의, 리뷰, 해결한 문제를 경험 자료로 정리합니다."],
  ["면접 답변 변환", "프로젝트 경험을 자기소개서와 면접 문장으로 바꿉니다."],
  ["어필 포인트 추출", "기술적 고민과 구현 포인트를 자동으로 찾습니다."],
  ["README 개선", "부족한 실행 방법, 기능 설명, 구조 설명을 제안합니다."],
  ["회고 템플릿", "KPT, 4L 등 여러 회고 형식으로 정리합니다."],
  ["프로젝트 시각화", "기간, 커밋 수, 기술 스택 비중을 보여줍니다."],
  ["프로젝트 비교", "여러 프로젝트 중 포트폴리오 우선순위를 추천합니다."],
  ["외부 내보내기", "Notion 또는 GitHub Pages로 결과를 연결합니다."],
];

const resourceLinks = [
  ["기획서", "./docs/plans/plan.md", "문제 정의, 사용자 시나리오, 화면 구조"],
  ["프로토타입", "./prototype/index.html", "Repository 입력 기반 동작 흐름"],
  ["GitHub Wiki", "https://github.com/SubJeeLee/hub/wiki", "제출용 기획 문서"],
];

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function SectionHeading({ label, title }) {
  return (
    <div className="section-heading">
      <span className="section-label">{label}</span>
      <h2>{title}</h2>
    </div>
  );
}

function FeatureList({ items, compact = false }) {
  return (
    <ul className={`feature-list${compact ? " compact" : ""}`}>
      {items.map(([title, description]) => (
        <li key={title}>
          <strong className="feature-title">{title}</strong>
          <span className="feature-desc">{description}</span>
        </li>
      ))}
    </ul>
  );
}

function Overview() {
  return (
    <section className="overview" aria-label="프로젝트 개요">
      {overviewItems.map(([label, value]) => (
        <div className="overview-item" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function ResourceLinks() {
  return (
    <section className="feature-section resource-section">
      <SectionHeading label="05 Resources" title="기획 문서와 프로토타입" />
      <div className="resource-grid">
        {resourceLinks.map(([title, href, description]) => (
          <a className="resource-card" href={href} key={title}>
            <strong>{title}</strong>
            <span>{description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function BrandSpinner() {
  return (
    <div className="brand-spinner" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function AnalysisResult({ result }) {
  return (
    <section className="analysis-result-page" aria-label="Repository 분석 결과">
      <div className="result-heading">
        <span className="section-label">Analysis Result</span>
        <h2>{result.name}</h2>
        <p>{result.summary}</p>
        <a href={result.url} target="_blank" rel="noreferrer">
          GitHub에서 보기
        </a>
      </div>

      {result.isMock && (
        <p className="mock-note">
          현재 화면은 Nest API 연동 전 상태를 검증하기 위한 mock 결과입니다. 이후 실제 GitHub API 응답으로 교체할
          예정입니다.
        </p>
      )}

      <div className="result-grid">
        <article>
          <h3>프로젝트 참여자</h3>
          <ul className="contributor-preview">
            {result.contributors.map((contributor) => (
              <li key={contributor.login}>
                <strong>{contributor.login}</strong>
                <span>{contributor.count} commits</span>
                <em>{contributor.percent}%</em>
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h3>{result.owner}의 주요 작업</h3>
          {result.ownerMessages.length > 0 ? (
            <ul className="work-preview">
              {result.ownerMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : (
            <p>최근 100개 커밋 안에서 repository owner의 커밋을 찾지 못했습니다.</p>
          )}
        </article>
      </div>
    </section>
  );
}

function ProjectTopic() {
  const [repoUrl, setRepoUrl] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState(ANALYSIS_STATUS.idle);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = getRepositoryUrlError(repoUrl);
    if (error) {
      setAnalysisStatus(ANALYSIS_STATUS.error);
      setAnalysisResult(null);
      setAnalysisError(error);
      return;
    }

    const parsed = parseGitHubRepositoryUrl(repoUrl);
    setAnalysisStatus(ANALYSIS_STATUS.loading);
    setAnalysisResult(null);
    setAnalysisError("");

    await wait(900);
    setAnalysisResult(createMockAnalysisResult(parsed));
    setAnalysisStatus(ANALYSIS_STATUS.success);
  };

  const handleRepoChange = (event) => {
    setRepoUrl(event.target.value);
    setAnalysisStatus(ANALYSIS_STATUS.idle);
    setAnalysisResult(null);
    setAnalysisError("");
  };

  return (
    <main className="page">
      <section className="intro" aria-label="PtoP Repository 분석 시작">
        <div className="intro-inner">
          <p className="section-label">Project to Portfolio</p>
          <h1 className="hero-logo">
            <img src={logoUrl} alt="PtoP Project to Portfolio 로고" />
          </h1>

          <form className="hero-search" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="repo-url">
              GitHub Repository URL
            </label>
            <input
              id="repo-url"
              type="text"
              inputMode="url"
              value={repoUrl}
              onChange={handleRepoChange}
              placeholder="https://github.com/user/repository"
            />
            <button type="submit" disabled={analysisStatus === ANALYSIS_STATUS.loading}>
              {analysisStatus === ANALYSIS_STATUS.loading ? "분석 중" : "분석 시작"}
            </button>
          </form>
          <p className="input-guide">분석하고 싶은 프로젝트의 GitHub Repository 주소를 입력해보세요.</p>

          {analysisStatus === ANALYSIS_STATUS.loading && (
            <div className="analysis-status" role="status" aria-live="polite">
              <BrandSpinner />
              <div>
                <strong>Repository를 분석하고 있어요</strong>
                <span>참여자, 기여도, 최근 커밋 흐름을 확인하는 중입니다.</span>
              </div>
            </div>
          )}

          {analysisStatus === ANALYSIS_STATUS.error && (
            <div className="analysis-status error" role="status" aria-live="polite">
              <BrandSpinner />
              <div>
                <strong>분석할 수 없습니다</strong>
                <span>{analysisError}</span>
              </div>
            </div>
          )}

          {analysisStatus === ANALYSIS_STATUS.success && analysisResult && <AnalysisResult result={analysisResult} />}
        </div>
      </section>

      <Overview />

      <section className="feature-section core-section">
        <SectionHeading label="01 Core Features" title="핵심 기능" />
        <FeatureList items={coreFeatures} />
      </section>

      <section className="content-grid" aria-label="프로젝트 주제 소개">
        <article className="panel">
          <span className="section-label">02 Problem</span>
          <h2>문제 정의</h2>
          <p>
            대학생들은 동아리, 해커톤, 부트캠프, 개인 프로젝트를 통해 많은
            결과물을 만듭니다. 하지만 프로젝트가 끝나고 시간이 지나면 내가 맡은
            역할, 핵심 구현, 기술적 고민, 문제 해결 과정이 흐려집니다. 결국
            포트폴리오나 자기소개서를 작성할 때 다시 기억을 복원해야 하는 부담이
            생깁니다.
          </p>
        </article>

        <article className="panel solution-panel">
          <span className="section-label">03 Solution</span>
          <h2>해결 방안</h2>
          <p>
            사용자가 프로젝트 폴더나 GitHub Repository를 첨부하면 AI Agent가
            README, 코드 구조, 주요 파일을 분석합니다. 이후 프로젝트 목적, 기술
            스택, 핵심 기능, 나의 역할로 정리할 수 있는 내용을 Markdown 형태로
            제공합니다.
          </p>
        </article>
      </section>

      <section className="feature-section future-section">
        <SectionHeading label="04 Next" title="추가 핵심 기능 고려사항" />
        <FeatureList items={futureFeatures} compact />
      </section>

      <ResourceLinks />

      <section className="closing">
        <span className="section-label">06 Summary</span>
        <h2>한 줄 소개</h2>
        <p>
          PtoP(Project to Portfolio)는 GitHub Repository나 프로젝트 폴더를
          분석해 대학생 개발자의 프로젝트 경험을 포트폴리오와 회고 형태로
          정리해주는 AI Agent 서비스.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ProjectTopic />
  </React.StrictMode>,
);
