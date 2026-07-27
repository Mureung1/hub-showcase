import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { useCallback, useState } from "react";
import { AuthModal } from "../features/auth/AuthModal";
import { useAuth } from "../features/auth/useAuth";
import type { ReflectionDraft } from "../features/reflection/reflection";
import { RepositoryTerminal } from "../features/workspace/components/RepositoryTerminal";
import { WorkspaceGame } from "../features/workspace/WorkspaceGame";

type WorkspacePageProps = {
  onBackToLanding: () => void;
  onAnalysisComplete: (
    result: RepositoryAnalysisResult,
    reflectionDraft: ReflectionDraft,
  ) => void;
};

export function WorkspacePage({ onBackToLanding, onAnalysisComplete }: WorkspacePageProps) {
  const { user, isLoading, error, signInWithGitHub } = useAuth();
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const isDevelopmentPreview =
    import.meta.env.DEV
    && new URLSearchParams(window.location.search).get("preview") === "workspace";
  const openTerminal = useCallback(() => setIsTerminalOpen(true), []);
  const closeTerminal = useCallback(() => setIsTerminalOpen(false), []);

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
        onSignIn={() => void signInWithGitHub()}
      />
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden [isolation:isolate]" aria-labelledby="workspace-title">
      <header className="pointer-events-none absolute left-0 top-0 z-[5] flex w-full items-center justify-between gap-5 bg-[linear-gradient(rgb(255_255_255/94%),rgb(255_255_255/74%),transparent)] px-7 py-5 text-ptop-ink max-[720px]:items-start max-[720px]:p-4">
        <div className="pointer-events-auto">
          <span className="text-[0.68rem] font-extrabold tracking-[0.08em] text-ptop-mint-dark">PtoP / PROJECT ROOM</span>
          <h1 className="mt-1 text-[1.08rem] font-extrabold" id="workspace-title">나의 작업실</h1>
        </div>
        <p className="text-[0.82rem] text-ptop-muted max-[720px]:hidden">방향키 또는 WASD로 이동 · 컴퓨터 앞에서 E</p>
        <div className="pointer-events-auto flex items-center gap-2.5 max-[720px]:block">
          <button className="min-h-10 cursor-pointer rounded-md border-0 bg-[var(--button-primary-bg)] px-3.5 text-[0.8rem] font-extrabold text-white hover:-translate-y-px" type="button" onClick={openTerminal}>
            새 Repository 분석
          </button>
          <button className="min-h-10 cursor-pointer rounded-md border border-black/20 bg-white/80 px-3.5 text-[0.8rem] font-extrabold text-ptop-ink hover:-translate-y-px max-[720px]:hidden" type="button" onClick={onBackToLanding}>
            랜딩으로 돌아가기
          </button>
        </div>
      </header>

      <WorkspaceGame
        isInputEnabled={!isTerminalOpen}
        onOpenNewAnalysis={openTerminal}
      />

      <aside className="absolute bottom-[22px] left-7 z-[5] flex items-center gap-6 rounded-md border border-white/80 bg-white/[0.78] px-3 py-[9px] text-[0.8rem] text-ptop-muted shadow-[0_10px_24px_rgb(21_24_23/12%)] max-[720px]:right-4 max-[720px]:bottom-4 max-[720px]:left-4 max-[720px]:justify-center" aria-label="작업실 조작법">
        <span><kbd className="rounded bg-ptop-ink px-1.5 py-0.5 font-mono text-[0.76rem] text-white">↑↓←→</kbd> 또는 <kbd className="rounded bg-ptop-ink px-1.5 py-0.5 font-mono text-[0.76rem] text-white">WASD</kbd> 이동</span>
        <span><kbd className="rounded bg-ptop-ink px-1.5 py-0.5 font-mono text-[0.76rem] text-white">E</kbd> 컴퓨터 사용</span>
      </aside>

      {isTerminalOpen && (
        <RepositoryTerminal
          onClose={closeTerminal}
          onAnalysisComplete={(result, draft) => {
            closeTerminal();
            onAnalysisComplete(result, draft);
          }}
        />
      )}
    </section>
  );
}
