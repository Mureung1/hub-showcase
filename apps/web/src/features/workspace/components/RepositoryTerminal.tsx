import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { useEffect, useRef } from "react";
import type { ReflectionDraft } from "../../reflection/reflection";
import { RepositoryAnalyzer } from "../../repository-analysis/RepositoryAnalyzer";

type RepositoryTerminalProps = {
  onAnalysisComplete: (
    result: RepositoryAnalysisResult,
    reflectionDraft: ReflectionDraft,
  ) => void;
  onClose: () => void;
};

export function RepositoryTerminal({
  onAnalysisComplete,
  onClose,
}: RepositoryTerminalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="workspace-terminal-backdrop" onMouseDown={onClose}>
      <section
        className="workspace-terminal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-terminal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="workspace-terminal-header">
          <div>
            <span>NEW PROJECT</span>
            <h2 id="workspace-terminal-title">Repository 분석 시작</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Repository 분석 창 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="workspace-terminal-content">
          <RepositoryAnalyzer onAnalysisComplete={onAnalysisComplete} />
        </div>
      </section>
    </div>
  );
}
