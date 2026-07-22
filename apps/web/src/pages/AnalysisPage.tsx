import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { AnalysisResult } from "../features/repository-analysis/AnalysisResult";
import { ReflectionWorkspace } from "../features/reflection/ReflectionWorkspace";
import type { ReflectionDraft } from "../features/reflection/reflection";

type AnalysisPageProps = {
  result: RepositoryAnalysisResult;
  reflectionDraft: ReflectionDraft;
  onBackToLanding: () => void;
};

export function AnalysisPage({ result, reflectionDraft, onBackToLanding }: AnalysisPageProps) {
  return (
    <section className="analysis-page-shell" aria-label="Repository 분석 결과 페이지">
      <button className="result-back-button" type="button" onClick={onBackToLanding}>
        <span aria-hidden="true">←</span>
        처음으로 돌아가기
      </button>
      <AnalysisResult result={result} />
      <ReflectionWorkspace result={result} initialDraft={reflectionDraft} />
    </section>
  );
}
