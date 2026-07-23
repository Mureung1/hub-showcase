import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { AnalysisResult } from "../features/repository-analysis/AnalysisResult";
import { ReflectionWorkspace } from "../features/reflection/ReflectionWorkspace";
import type { ReflectionDraft } from "../features/reflection/reflection";
import { saveReflectionDraftToApi } from "../features/reflection/reflectionApi";

type AnalysisPageProps = {
  result: RepositoryAnalysisResult;
  reflectionDraft: ReflectionDraft;
  onBackToWorkspace: () => void;
};

export function AnalysisPage({ result, reflectionDraft, onBackToWorkspace }: AnalysisPageProps) {
  return (
    <section className="analysis-page-shell" aria-label="Repository 분석 결과 페이지">
      <button className="result-back-button" type="button" onClick={onBackToWorkspace}>
        <span aria-hidden="true">←</span>
        작업실로 돌아가기
      </button>
      <AnalysisResult result={result} />
      <ReflectionWorkspace
        result={result}
        initialDraft={reflectionDraft}
        onSave={(draft) => saveReflectionDraftToApi(result.id, draft).then(() => undefined)}
      />
    </section>
  );
}
