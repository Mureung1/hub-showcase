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
    <section className="min-h-screen" aria-label="Repository 분석 결과 페이지">
      <button className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-ptop-line bg-white px-4 text-sm font-bold text-ptop-ink transition hover:-translate-y-px hover:border-ptop-mint-dark" type="button" onClick={onBackToWorkspace}>
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
