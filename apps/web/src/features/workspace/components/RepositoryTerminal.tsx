import type { ReflectionAnalysis, RepositoryAnalysisResult } from "@ptop/contracts";
import { useEffect, useRef, useState } from "react";
import type { ReflectionDraft } from "../../reflection/reflection";
import { RepositoryAnalyzer } from "../../repository-analysis/RepositoryAnalyzer";

type RepositoryTerminalProps = {
  onAnalysisComplete: (
    result: RepositoryAnalysisResult,
    reflectionDraft: ReflectionDraft,
    reflectionAnalysis: ReflectionAnalysis | null,
  ) => void;
  onClose: () => void;
};

export function RepositoryTerminal({
  onAnalysisComplete,
  onClose,
}: RepositoryTerminalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"start" | "workbench">("start");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

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
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#050b12]/80 p-4 backdrop-blur-[2px] sm:p-6"
    >
      <section
        ref={dialogRef}
        className={`relative max-h-[calc(100vh-32px)] w-full overflow-visible rounded-3xl border-4 border-[var(--terminal-border)] bg-[var(--terminal-bg)] text-[var(--terminal-ink)] shadow-[0_24px_80px_rgb(0_0_0/45%)] outline-none transition-[max-width] duration-200 sm:max-h-[calc(100vh-48px)] ${mode === "workbench" ? "max-w-[1064px]" : "max-w-[780px]"}`}
        role="dialog"
        aria-modal="true"
        aria-label="새 Repository 분석"
        aria-describedby="workspace-terminal-description"
        tabIndex={-1}
      >
        <button
          className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-xl border border-[var(--terminal-border)] bg-[var(--terminal-panel)] font-mono text-xl leading-none text-[var(--terminal-muted)] transition hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)] focus-visible:outline-2 focus-visible:outline-[var(--terminal-accent)] focus-visible:outline-offset-2"
          type="button"
          aria-label="Repository 분석 창 닫기"
          title="닫기"
          onClick={onClose}
        >
          ×
        </button>
        <div className="p-1 sm:p-2">
          <div className={`relative overflow-visible rounded-2xl border-2 border-[var(--terminal-border)] p-2 sm:p-3 ${mode === "workbench" ? "min-h-[488px]" : "min-h-[390px]"}`}>
            <div id="workspace-terminal-description" className="relative z-0 min-w-0 overflow-visible">
              <RepositoryAnalyzer
              onAnalysisComplete={onAnalysisComplete}
                onCancel={onClose}
                onModeChange={setMode}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
