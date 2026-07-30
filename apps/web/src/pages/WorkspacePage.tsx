import type {
  ReflectionAnalysis,
  RepositoryAnalysisResult,
} from "@ptop/contracts";
import { useCallback, useEffect, useState } from "react";
import { AuthModal } from "../features/auth/AuthModal";
import { useAuth } from "../features/auth/useAuth";
import type { ReflectionDraft } from "../features/reflection/reflection";
import { RepositoryTerminal } from "../features/workspace/components/RepositoryTerminal";
import { WorkspaceGame } from "../features/workspace/WorkspaceGame";
import { listPortfolioProjects } from "../features/portfolio-library/portfolioLibraryApi";
import {
  formatWorkspaceRepositoryDate,
  getRepositoryWorkspaceInteractions,
} from "../features/workspace/model/workspaceMap";
import type { SavedPortfolioProject } from "../features/portfolio-library/portfolioLibrary";

type WorkspacePageProps = {
  onBackToLanding: () => void;
  openAnalysisOnEntry: boolean;
  onAnalysisComplete: (
    result: RepositoryAnalysisResult,
    reflectionDraft: ReflectionDraft,
    reflectionAnalysis: ReflectionAnalysis | null,
  ) => void;
  onOpenSavedProject: (project: SavedPortfolioProject) => void;
};

export function WorkspacePage({
  onBackToLanding,
  openAnalysisOnEntry,
  onAnalysisComplete,
  onOpenSavedProject,
}: WorkspacePageProps) {
  const { user, isLoading, error, signInWithGitHub } = useAuth();
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedPortfolioProject[]>(
    [],
  );
  const [isPortfolioListOpen, setIsPortfolioListOpen] = useState(false);
  const isDevelopmentPreview =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("preview") === "workspace";
  const openTerminal = useCallback(() => setIsTerminalOpen(true), []);
  const closeTerminal = useCallback(() => setIsTerminalOpen(false), []);

  useEffect(() => {
    if (openAnalysisOnEntry && !isLoading && user) {
      openTerminal();
    }
  }, [isLoading, openAnalysisOnEntry, openTerminal, user]);

  useEffect(() => {
    if (!user) {
      setSavedProjects([]);
      setIsPortfolioListOpen(false);
      return;
    }

    let cancelled = false;
    void listPortfolioProjects(user.id)
      .then((projects) => {
        if (!cancelled) setSavedProjects(projects);
      })
      .catch(() => {
        if (!cancelled) setSavedProjects([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (isLoading || (!user && !isDevelopmentPreview)) {
      return;
    }

    const currentState = window.history.state as {
      ptopWorkspaceEntry?: boolean;
    } | null;
    if (!currentState?.ptopWorkspaceEntry) {
      window.history.pushState(
        { ...(window.history.state ?? {}), ptopWorkspaceEntry: true },
        "",
        window.location.href,
      );
    }

    const handleBrowserBack = () => {
      onBackToLanding();
    };

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, [isDevelopmentPreview, isLoading, onBackToLanding, user]);

  if (isLoading) {
    return null;
  }

  if (!user && !isDevelopmentPreview) {
    return (
      <AuthModal
        isLoading={isLoading}
        error={error}
        description="GitHub 로그인 후에 작업실 입장을 부탁드립니다."
        onClose={onBackToLanding}
        onSignIn={() =>
          void signInWithGitHub({
            redirectView: "workspace",
            openAnalysis: openAnalysisOnEntry,
          })
        }
      />
    );
  }

  return (
    <section
      className="relative h-[100dvh] min-h-[560px] overflow-hidden [isolation:isolate]"
      aria-labelledby="workspace-title"
    >
      <h1 className="sr-only" id="workspace-title">
        나의 작업실
      </h1>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-start justify-between gap-4 p-8 max-[720px]:p-4">
        <div className="pointer-events-auto flex max-w-[460px] flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="min-h-14 cursor-pointer rounded-xl border-0 bg-[var(--button-primary-bg)] px-6 text-lg font-extrabold text-white shadow-[0_8px_18px_rgb(9_74_48/20%)] transition hover:-translate-y-px hover:bg-[#139a64] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              type="button"
              onClick={openTerminal}
            >
              새 Repository 분석
            </button>
            <button
              className="min-h-14 cursor-pointer rounded-xl border border-black/20 bg-white/85 px-6 text-lg font-extrabold text-ptop-ink shadow-[0_8px_18px_rgb(21_24_23/8%)] transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ptop-mint-dark"
              type="button"
              onClick={onBackToLanding}
            >
              랜딩으로 돌아가기
            </button>
          </div>
          <p className="rounded-xl bg-[#15231d]/90 px-4 py-2 text-xs font-semibold text-white shadow-lg max-[720px]:hidden">
            바로 시작하거나, 오른쪽 초록 PC에서{" "}
            <kbd className="ml-1 rounded-md bg-[#67e5a3] px-2 py-1 font-mono text-[#0b2a1c]">
              E
            </kbd>
          </p>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <button
            className={`min-h-11 cursor-pointer rounded-l-2xl border border-r-0 px-4 text-sm font-extrabold shadow-[0_12px_28px_rgb(21_35_28/16%)] backdrop-blur-md transition-all duration-200 ease-out hover:-translate-x-1 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#159b67] ${isPortfolioListOpen ? "border-[#b4efd1] bg-[#e8fbf1] text-[#159b67]" : "border-white/80 bg-white/[0.92] text-[#17231e] hover:bg-white"}`}
            type="button"
            title="내 포트폴리오 기록"
            aria-expanded={isPortfolioListOpen}
            aria-controls="portfolio-history-panel"
            aria-label={
              isPortfolioListOpen
                ? "내 포트폴리오 기록 닫기"
                : "내 포트폴리오 기록 열기"
            }
            onClick={() => setIsPortfolioListOpen((open) => !open)}
          >
            기록 {savedProjects.length}
            <span
              className="ml-2 text-[#159b67] transition-transform duration-200"
              aria-hidden="true"
            >
              {isPortfolioListOpen ? "‹" : "›"}
            </span>
          </button>

          <aside
            className={`w-[320px] rounded-[22px] border border-white/70 bg-white/[0.92] p-4 text-[#17231e] shadow-[0_18px_45px_rgb(21_35_28/18%)] backdrop-blur-md transition-all duration-200 ease-out max-[720px]:w-[min(250px,calc(100vw-32px))] ${isPortfolioListOpen ? "visible translate-x-0 opacity-100" : "invisible pointer-events-none translate-x-4 opacity-0"}`}
            id="portfolio-history-panel"
            aria-label="내 포트폴리오 기록"
            aria-hidden={!isPortfolioListOpen}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <h2 className="text-base font-extrabold">내 포트폴리오 기록</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#87928d]">
                  {savedProjects.length}
                </span>
                <button
                  className="cursor-pointer rounded-lg px-2 py-1 text-xs font-bold text-[#718078] transition hover:bg-[#f3f7f5] hover:text-[#17231e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#159b67]"
                  type="button"
                  aria-label="내 포트폴리오 기록 닫기"
                  onClick={() => setIsPortfolioListOpen(false)}
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="flex max-h-[min(60vh,520px)] flex-col gap-2 overflow-y-auto pr-1">
              {savedProjects.length > 0 ? (
                savedProjects.map((project) => (
                  <button
                    key={project.id}
                    className="flex min-h-[64px] flex-col items-start justify-center rounded-2xl border border-[#dbe3df] bg-white/80 px-4 text-left transition hover:border-[#46d394] hover:bg-[#effcf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#159b67]"
                    type="button"
                    onClick={() => onOpenSavedProject(project)}
                  >
                    <strong className="max-w-full truncate text-sm font-extrabold">
                      {project.repositoryOwner}/{project.repositoryName}
                    </strong>
                    <span className="mt-1 text-xs font-medium text-[#8a9690]">
                      {formatWorkspaceRepositoryDate(project.updatedAt)} ·
                      포트폴리오 보기
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f3f7f5] px-4 py-5 text-center text-xs text-[#7d8a84]">
                  저장된 포트폴리오가 아직 없어요.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <WorkspaceGame
        isInputEnabled={!isTerminalOpen}
        onOpenNewAnalysis={openTerminal}
        repositoryInteractions={getRepositoryWorkspaceInteractions(
          savedProjects,
        )}
        onOpenRepository={(repositoryId) => {
          const project = savedProjects.find(
            (item) => item.id === repositoryId,
          );
          if (project) onOpenSavedProject(project);
        }}
      />

      <aside
        className="absolute bottom-8 left-8 z-[5] flex items-center gap-5 rounded-2xl bg-[#15231d]/95 px-6 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgb(9_24_17/24%)] max-[720px]:right-4 max-[720px]:bottom-4 max-[720px]:left-4 max-[720px]:justify-center max-[520px]:gap-3 max-[520px]:px-4 max-[520px]:text-sm"
        aria-label="작업실 조작법"
      >
        <span>
          <kbd className="rounded-lg bg-white/15 px-3 py-2 font-mono text-sm text-white">
            WASD
          </kbd>{" "}
          이동
        </span>
        <span>
          <kbd className="rounded-lg bg-white/15 px-3 py-2 font-mono text-sm text-white">
            E
          </kbd>{" "}
          컴퓨터 사용하기
        </span>
      </aside>

      {isTerminalOpen && (
        <RepositoryTerminal
          onClose={closeTerminal}
          onAnalysisComplete={(result, draft, reflectionAnalysis) => {
            closeTerminal();
            onAnalysisComplete(result, draft, reflectionAnalysis);
          }}
        />
      )}
    </section>
  );
}
