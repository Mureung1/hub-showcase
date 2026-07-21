import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { BrandSpinner } from "../../components/BrandSpinner";
import {
  ANALYSIS_STATUS,
  getRepositoryUrlError,
  type AnalysisStatus,
} from "./repositoryAnalysis";
import { requestRepositoryAnalysis } from "./repositoryAnalysisApi";

type RepositoryAnalyzerProps = {
  onAnalysisComplete: (result: RepositoryAnalysisResult) => void;
};

export function RepositoryAnalyzer({ onAnalysisComplete }: RepositoryAnalyzerProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(ANALYSIS_STATUS.idle);
  const [analysisError, setAnalysisError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = getRepositoryUrlError(repoUrl);
    if (error) {
      setAnalysisStatus(ANALYSIS_STATUS.error);
      setAnalysisError(error);
      return;
    }

    setAnalysisStatus(ANALYSIS_STATUS.loading);
    setAnalysisError("");

    try {
      const result = await requestRepositoryAnalysis({ repositoryUrl: repoUrl.trim() });
      setAnalysisStatus(ANALYSIS_STATUS.success);
      onAnalysisComplete(result);
    } catch (requestError) {
      setAnalysisError(
        requestError instanceof Error
          ? requestError.message
          : "Repository 분석 요청에 실패했습니다.",
      );
      setAnalysisStatus(ANALYSIS_STATUS.error);
    }
  };

  const handleRepoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(event.target.value);
    setAnalysisStatus(ANALYSIS_STATUS.idle);
    setAnalysisError("");
  };

  return (
    <section className="intro analyzer-intro" aria-label="PtoP Repository 분석 시작">
      <div className="intro-inner">
        <p className="section-label">Start with a repository</p>
        <h2 className="analyzer-title">프로젝트 경험을 다시 꺼내볼 준비가 되었나요?</h2>
        <p className="analyzer-description">GitHub Repository 주소를 입력하면 프로젝트의 흐름과 작업 단서를 정리합니다.</p>

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

      </div>
    </section>
  );
}
