import type { ReflectionAnalysis, RepositoryAnalysisResult } from "@ptop/contracts";
import { useState } from "react";
import { AnalysisResult } from "../features/repository-analysis/AnalysisResult";
import { ReflectionWorkspace } from "../features/reflection/ReflectionWorkspace";
import type { ReflectionDraft } from "../features/reflection/reflection";
import { saveReflectionDraftToApi } from "../features/reflection/reflectionApi";

type AnalysisPageProps = {
  result: RepositoryAnalysisResult;
  reflectionDraft: ReflectionDraft;
  reflectionAnalysis: ReflectionAnalysis | null;
  onBackToWorkspace: () => void;
};

export function AnalysisPage({ result, reflectionDraft, reflectionAnalysis, onBackToWorkspace }: AnalysisPageProps) {
  const [currentReflectionAnalysis, setCurrentReflectionAnalysis] = useState(reflectionAnalysis);

  return (
    <section className="min-h-screen" aria-label="Repository 분석 결과 페이지">
      <button className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-ptop-line bg-white px-4 text-sm font-bold text-ptop-ink transition hover:-translate-y-px hover:border-ptop-mint-dark" type="button" onClick={onBackToWorkspace}>
        <span aria-hidden="true">←</span>
        작업실로 돌아가기
      </button>
      <AnalysisResult result={result} reflectionAnalysis={currentReflectionAnalysis} />
      <ReflectionWorkspace
        result={result}
        initialDraft={reflectionDraft}
        onSave={(draft) =>
          saveReflectionDraftToApi(result.id, draft, undefined, undefined, result.analysis.technicalChallenges).then((response) => {
            setCurrentReflectionAnalysis(response.reflectionAnalysis ?? null);
          })
        }
      />
    </section>
  );
}
