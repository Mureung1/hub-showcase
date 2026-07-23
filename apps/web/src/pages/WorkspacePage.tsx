import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { useCallback, useState } from "react";
import { AuthButton } from "../features/auth/AuthButton";
import { useAuth } from "../features/auth/useAuth";
import type { ReflectionDraft } from "../features/reflection/reflection";
import { RepositoryTerminal } from "../features/workspace/components/RepositoryTerminal";
import { WorkspaceGame } from "../features/workspace/WorkspaceGame";
import "../features/workspace/workspace.css";

type WorkspacePageProps = {
  onBackToLanding: () => void;
  onAnalysisComplete: (
    result: RepositoryAnalysisResult,
    reflectionDraft: ReflectionDraft,
  ) => void;
};

export function WorkspacePage({ onBackToLanding, onAnalysisComplete }: WorkspacePageProps) {
  const { user, isLoading } = useAuth();
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const isDevelopmentPreview =
    import.meta.env.DEV
    && new URLSearchParams(window.location.search).get("preview") === "workspace";
  const openTerminal = useCallback(() => setIsTerminalOpen(true), []);
  const closeTerminal = useCallback(() => setIsTerminalOpen(false), []);

  if (isLoading) {
    return (
      <section className="workspace-auth-gate" role="status">
        <span className="workspace-status-light" aria-hidden="true" />
        작업실을 준비하고 있습니다.
      </section>
    );
  }

  if (!user && !isDevelopmentPreview) {
    return (
      <section
        className="workspace-auth-gate workspace-auth-gate--fullscreen"
        aria-labelledby="workspace-auth-title"
      >
        <span className="workspace-eyebrow">PRIVATE WORKSPACE</span>
        <h1 id="workspace-auth-title">GitHub 로그인 후 작업실에 입장할 수 있어요.</h1>
        <p>분석 기록과 회고를 계정에 안전하게 연결하기 위해 로그인이 필요합니다.</p>
        <AuthButton />
      </section>
    );
  }

  return (
    <section className="workspace-page workspace-page--fullscreen" aria-labelledby="workspace-title">
      <header className="workspace-hud">
        <div className="workspace-hud-brand">
          <span className="workspace-eyebrow">PtoP / PROJECT ROOM</span>
          <h1 id="workspace-title">나의 작업실</h1>
        </div>
        <p className="workspace-hud-guide">방향키 또는 WASD로 이동 · 컴퓨터 앞에서 E</p>
        <div className="workspace-hud-actions">
          <button className="workspace-mobile-action" type="button" onClick={openTerminal}>
            새 Repository 분석
          </button>
          <button className="workspace-exit-action" type="button" onClick={onBackToLanding}>
            랜딩으로 돌아가기
          </button>
        </div>
      </header>

      <WorkspaceGame
        isInputEnabled={!isTerminalOpen}
        onOpenNewAnalysis={openTerminal}
      />

      <aside className="workspace-help workspace-help--overlay" aria-label="작업실 조작법">
        <span><kbd>↑↓←→</kbd> 또는 <kbd>WASD</kbd> 이동</span>
        <span><kbd>E</kbd> 컴퓨터 사용</span>
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
