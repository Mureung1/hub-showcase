import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import type { RepositoryAnalysisResult } from "@ptop/contracts";
import type { ReflectionDraft } from "../reflection/reflection";
import { saveReflectionDraftToApi } from "../reflection/reflectionApi";
import { useAuth } from "../auth/useAuth";
import {
  ANALYSIS_STATUS,
  getRepositoryUrlError,
  type AnalysisStatus,
} from "./repositoryAnalysis";
import { requestRepositoryAnalysis } from "./repositoryAnalysisApi";
import { getRepositoryTerminalStatus } from "../workspace/components/repositoryTerminalViewModel";
import { AnalysisWorkbench } from "./AnalysisWorkbench";

type RepositoryAnalyzerProps = {
  onAnalysisComplete: (
    result: RepositoryAnalysisResult,
    reflectionDraft: ReflectionDraft,
  ) => void;
  onCancel: () => void;
  onModeChange?: (mode: "start" | "workbench") => void;
};

const terminalInputClassName =
  "min-h-14 w-full border-2 border-[var(--terminal-border)] bg-[var(--terminal-panel)] px-4 text-base text-[var(--terminal-ink)] outline-none transition placeholder:text-[var(--terminal-subtle)] placeholder:opacity-50 focus:border-[var(--terminal-accent)] focus:ring-4 focus:ring-[var(--terminal-accent)]/15";

const terminalInputStyle = {
  backgroundColor: "var(--terminal-panel)",
  caretColor: "var(--terminal-accent)",
  color: "var(--terminal-ink)",
  WebkitBoxShadow: "0 0 0 1000px var(--terminal-panel) inset",
  WebkitTextFillColor: "var(--terminal-ink)",
};

export function RepositoryAnalyzer({
  onAnalysisComplete,
  onCancel,
  onModeChange,
}: RepositoryAnalyzerProps) {
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState("");
  const [githubLogin, setGithubLogin] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(
    ANALYSIS_STATUS.idle,
  );
  const [analysisError, setAnalysisError] = useState("");
  const [reflectionDraft, setReflectionDraft] =
    useState<ReflectionDraft | null>(null);
  const [pendingAnalysisResult, setPendingAnalysisResult] =
    useState<RepositoryAnalysisResult | null>(null);
  const authGithubLogin =
    user?.user_metadata?.user_name ??
    user?.user_metadata?.preferred_username ??
    "";
  const terminalStatus = getRepositoryTerminalStatus(
    analysisStatus,
    pendingAnalysisResult !== null,
  );

  useEffect(() => {
    if (!githubLogin && authGithubLogin) {
      setGithubLogin(authGithubLogin);
    }
  }, [authGithubLogin, githubLogin]);

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
    setPendingAnalysisResult(null);

    try {
      const result = await requestRepositoryAnalysis({
        repositoryUrl: repoUrl.trim(),
        githubLogin: githubLogin.trim() || undefined,
      });
      setAnalysisStatus(ANALYSIS_STATUS.success);
      setPendingAnalysisResult(result);
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
    setPendingAnalysisResult(null);
    setReflectionDraft(null);
  };

  const statusToneClassName =
    terminalStatus.tone === "error"
      ? "border-[#a84c5a] bg-[#2d1822] text-[#ffd9df]"
      : terminalStatus.tone === "success"
        ? "border-[#3d8c67] bg-[#102a20] text-[#d6ffe5]"
        : "border-[var(--terminal-border)] bg-[var(--terminal-panel)] text-[#c7d2df]";

  const isIdle = analysisStatus === ANALYSIS_STATUS.idle;
  const isWorkbenchOpen =
    analysisStatus === ANALYSIS_STATUS.loading ||
    (analysisStatus === ANALYSIS_STATUS.success &&
      pendingAnalysisResult !== null);

  useEffect(() => {
    onModeChange?.(isWorkbenchOpen ? "workbench" : "start");
  }, [isWorkbenchOpen, onModeChange]);

  return (
    <section className="grid gap-6" aria-label="PtoP Repository 분석 시작">
      {isWorkbenchOpen ? (
        <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
          <AnalysisWorkbench
            repositoryUrl={repoUrl}
            isAnalysisComplete={analysisStatus === ANALYSIS_STATUS.success}
            reflectionDraft={reflectionDraft}
            onReflectionChange={setReflectionDraft}
            onReflectionSave={
              pendingAnalysisResult
                ? (draft) =>
                    saveReflectionDraftToApi(
                      pendingAnalysisResult.id,
                      draft,
                    ).then(() => undefined)
                : undefined
            }
            onViewResults={onAnalysisComplete}
            analysisResult={pendingAnalysisResult}
          />
        </div>
      ) : (
        <div className="relative max-w-[820px] pt-3 sm:pt-5">
          <div
            className="pointer-events-none absolute right-8 -top-16 z-10 h-56 w-80 sm:-right-16 sm:-top-25 sm:h-72 sm:w-96"
            aria-hidden="true"
          >
            <img
              className="h-full w-full object-contain object-center"
              src={`${import.meta.env.BASE_URL}assets/mascot/Poppy_Report_NOBG.png`}
              alt=""
            />
          </div>
          <div className="grid gap-3">
            <h3
              className="m-0 max-w-[620px] text-2xl font-bold leading-[1.35] text-[var(--terminal-ink)] sm:text-3xl"
              id="repository-terminal-question"
            >
              {isIdle ? (
                <>
                  안녕! 새로운{" "}
                  <span className="text-[var(--terminal-accent)]">
                    Repository
                  </span>
                  를 분석해볼까?
                </>
              ) : (
                terminalStatus.label
              )}
            </h3>
            <p
              className="m-0 max-w-2xl text-base leading-7 text-[#c7d2df]"
              aria-live="polite"
            >
              {terminalStatus.description}
            </p>
          </div>

          <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
            <label className="relative grid gap-2 pt-2">
              <span className="absolute -top-2 left-3 bg-[var(--terminal-bg)] px-2 font-mono text-[0.68rem] font-bold tracking-[0.14em] text-[var(--terminal-muted)]">
                GIT REPOSITORY URL
              </span>
              <input
                className={terminalInputClassName}
                id="repo-url"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={repoUrl}
                onChange={handleRepoChange}
                placeholder="https://github.com/username/repo"
                aria-describedby="repo-url-help"
                style={terminalInputStyle}
              />
              <span
                className="text-sm leading-6 text-[var(--terminal-subtle)]"
                id="repo-url-help"
              >
                Repository URL을 입력하면 분석을 시작할 수 있어요.
              </span>
            </label>

            <details className="border-t border-[var(--terminal-border)] pt-4">
              <summary className="cursor-pointer text-sm font-bold text-[var(--terminal-muted)] outline-none marker:text-[var(--terminal-accent)] focus-visible:text-[var(--terminal-accent)]">
                분석 대상 GitHub ID 선택
              </summary>
              <label className="relative mt-5 grid gap-2 pt-2">
                <span className="absolute -top-2 left-3 bg-[var(--terminal-bg)] px-2 font-mono text-[0.68rem] font-bold tracking-[0.14em] text-[var(--terminal-muted)]">
                  YOUR GITHUB ID
                </span>
                <input
                  className={terminalInputClassName}
                  id="github-login"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={githubLogin}
                  onChange={(event) => setGithubLogin(event.target.value)}
                  placeholder="SubJeeLee"
                  aria-describedby="github-login-help"
                  style={terminalInputStyle}
                />
                <span
                  className="text-sm leading-6 text-[var(--terminal-subtle)]"
                  id="github-login-help"
                >
                  입력하면 내 활동을 중심으로 기술적 도전 후보를 찾습니다.
                </span>
              </label>
            </details>

            <div className="flex flex-wrap items-center gap-4">
              <button
                className="min-h-12 border-2 border-[var(--terminal-border)] border-b-4 bg-[var(--terminal-accent)] px-8 font-bold text-[#00210c] transition hover:-translate-y-px hover:bg-[#8affae] focus-visible:outline-2 focus-visible:outline-[var(--terminal-accent)] focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60"
                type="submit"
              >
                분석 시작
              </button>
              <button
                className="min-h-12 border-2 border-[var(--terminal-border)] bg-[#16202e] px-8 font-bold text-[#c7d2df] transition hover:border-[var(--terminal-accent)] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--terminal-accent)] focus-visible:outline-offset-2"
                type="button"
                onClick={onCancel}
              >
                나중에
              </button>
            </div>
          </form>

          {analysisError && (
            <div
              className={`mt-6 grid gap-1 border-2 px-4 py-3 ${statusToneClassName}`}
              role="status"
              aria-live="polite"
            >
              <strong className="text-base">{terminalStatus.label}</strong>
              <span className="text-sm leading-6">{analysisError}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
