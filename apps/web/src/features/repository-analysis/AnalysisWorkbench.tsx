import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { createEmptyReflectionDraft, type ReflectionDraft } from "../reflection/reflection";
import { AnalysisLogPanel } from "./AnalysisLogPanel";
import { AnalysisReflectionPanel } from "./AnalysisReflectionPanel";

type AnalysisWorkbenchProps = {
  repositoryUrl: string;
  isAnalysisComplete: boolean;
  reflectionDraft: ReflectionDraft | null;
  onReflectionChange: (draft: ReflectionDraft) => void;
  onReflectionSave?: (draft: ReflectionDraft) => Promise<void>;
  onViewResults?: (result: RepositoryAnalysisResult, draft: ReflectionDraft) => void;
  analysisResult: RepositoryAnalysisResult | null;
};

export function AnalysisWorkbench({
  repositoryUrl,
  isAnalysisComplete,
  reflectionDraft,
  onReflectionChange,
  onReflectionSave,
  onViewResults,
  analysisResult,
}: AnalysisWorkbenchProps) {
  const handleViewResults = () => {
    if (!analysisResult || !onViewResults) {
      return;
    }

    onViewResults(analysisResult, reflectionDraft ?? createEmptyReflectionDraft());
  };

  return (
    <section className="relative grid min-h-[480px] overflow-visible border-2 border-[var(--terminal-border)] bg-[var(--terminal-panel)] shadow-[0_20px_70px_rgb(0_0_0/35%)] lg:grid-cols-[358px_minmax(0,1fr)]" aria-label="Repository 분석 작업대">
      <div className="pointer-events-none absolute left-8 top-[-1.4rem] z-10 rotate-[-3deg] border border-[var(--terminal-accent)] bg-[var(--terminal-accent)] px-3 py-1 font-mono text-[0.68rem] font-bold tracking-[0.12em] text-[#00210c] shadow-[4px_4px_0_rgb(0_0_0/25%)]">
        {isAnalysisComplete ? "ANALYSIS COMPLETE" : "ANALYSIS IN PROGRESS"}
      </div>
      <AnalysisLogPanel isComplete={isAnalysisComplete} />
      <AnalysisReflectionPanel
        repositoryUrl={repositoryUrl}
        isAnalysisComplete={isAnalysisComplete}
        onChange={onReflectionChange}
        onSave={onReflectionSave}
        onViewResults={isAnalysisComplete ? handleViewResults : undefined}
      />
    </section>
  );
}
