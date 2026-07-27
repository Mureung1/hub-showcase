import { useEffect, useState } from "react";
import { ANALYSIS_LOG_STEPS, getAnalysisLogMessage } from "./analysisLog";

type AnalysisLogPanelProps = {
  isComplete: boolean;
};

export function AnalysisLogPanel({ isComplete }: AnalysisLogPanelProps) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (isComplete) {
      setVisibleCount(ANALYSIS_LOG_STEPS.length);
      return;
    }

    setVisibleCount(1);
    const timer = window.setInterval(() => {
      setVisibleCount((current) => Math.min(current + 1, ANALYSIS_LOG_STEPS.length));
    }, 460);

    return () => window.clearInterval(timer);
  }, [isComplete]);

  return (
    <section
      className="min-h-[25rem] border-b border-[var(--terminal-border)] bg-[var(--terminal-panel)] lg:min-h-[480px] lg:border-b-0 lg:border-r"
      aria-label="Repository 분석 시스템 로그"
    >
      <header className="flex items-center gap-3 border-b border-[var(--terminal-border)] px-6 pb-4 pt-6 font-mono text-[0.68rem] tracking-[0.12em] text-[var(--terminal-muted)]">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[#f36d6d]" />
          <span className="h-2 w-2 rounded-full bg-[#f6d36b]" />
          <span className="h-2 w-2 rounded-full bg-[var(--terminal-accent)]" />
        </span>
        <span>ANALYSIS_LOG.SH</span>
      </header>
      <div className="max-h-[21rem] overflow-y-auto px-6 py-5 font-mono text-xs leading-[1.65] text-[var(--terminal-accent)] lg:max-h-[25rem]">
        <p className="m-0 text-[var(--terminal-subtle)]">ptop@analysis:~$ run repository_scan</p>
        {ANALYSIS_LOG_STEPS.slice(0, visibleCount).map((step, index) => (
          <p className="m-0" key={step}>
            {getAnalysisLogMessage(step, isComplete || index < visibleCount - 1)}
          </p>
        ))}
        {!isComplete && visibleCount < ANALYSIS_LOG_STEPS.length && (
          <p className="m-0 animate-pulse text-[var(--terminal-muted)]">&gt; _</p>
        )}
        {isComplete && <p className="m-0 pt-2 text-[var(--terminal-ink)]">&gt; ANALYSIS COMPLETE.</p>}
      </div>
    </section>
  );
}
