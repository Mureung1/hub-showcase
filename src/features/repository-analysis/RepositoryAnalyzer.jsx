import React, { useState } from "react";
import logoUrl from "../../../Logo-cropped.png";
import { BrandSpinner } from "../../components/BrandSpinner.jsx";
import {
  ANALYSIS_STATUS,
  createMockAnalysisResult,
  getRepositoryUrlError,
  parseGitHubRepositoryUrl,
} from "./repositoryAnalysis.mjs";
import { AnalysisResult } from "./AnalysisResult.jsx";

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function RepositoryAnalyzer() {
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
  );
}
