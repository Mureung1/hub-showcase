import type {
  ReflectionAnalysis,
  RepositoryAnalysisResult,
  TechnicalChallengeCandidate,
} from "@ptop/contracts";
import { useEffect, useRef, useState } from "react";
import { AnalysisResult, ReportSteps } from "../features/repository-analysis/AnalysisResult";
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
  // 후보 선택은 이 결과 화면에서 직접 시작한다. 분석 중 초안이나 이전
  // Repository별 저장값을 초기 선택으로 사용하지 않는다.
  const [selectedChallengeTitles, setSelectedChallengeTitles] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [selectionToast, setSelectionToast] = useState("");
  const reflectionSectionRef = useRef<HTMLElement | null>(null);
  const previousStepRef = useRef<1 | 2>(activeStep);
  const activeStepRef = useRef<1 | 2>(activeStep);
  const allowBrowserBackRef = useRef(false);
  const [analysisCandidates, setAnalysisCandidates] = useState<TechnicalChallengeCandidate[]>(
    mergeTechnicalChallenges(
      result.analysis.technicalChallenges,
      reflectionAnalysis?.suggestedChallenges ?? [],
    ),
  );
  const [customChallenge, setCustomChallenge] = useState({ title: "", note: "" });

  const continueToReflection = () => {
    if (selectedChallengeTitles.length === 0) {
      setSelectionToast("기술적 도전 후보를 하나 이상 선택해야 다음 단계로 이동할 수 있어요.");
      return;
    }

    setSelectionToast("");
    setActiveStep(2);
  };

  const handleStepChange = (step: 1 | 2) => {
    if (step === 2 && selectedChallengeTitles.length === 0) {
      setSelectionToast("기술적 도전 후보를 하나 이상 선택해야 회고를 작성할 수 있어요.");
      return;
    }

    setSelectionToast("");
    setActiveStep(step);
  };

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    const currentState = window.history.state;
    if (!currentState?.ptopAnalysisGuard) {
      window.history.pushState(
        { ...(currentState ?? {}), ptopAnalysisGuard: true },
        "",
        window.location.href,
      );
    }

    const handleBrowserBack = () => {
      if (allowBrowserBackRef.current) {
        allowBrowserBackRef.current = false;
        onBackToWorkspace();
        return;
      }

      window.history.pushState(
        { ...(window.history.state ?? {}), ptopAnalysisGuard: true },
        "",
        window.location.href,
      );

      if (activeStepRef.current === 2) {
        setActiveStep(1);
        setSelectionToast("");
        return;
      }

      setSelectionToast("분석 결과를 나가려면 ‘작업실로 돌아가기’를 눌러주세요.");
    };

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, [onBackToWorkspace]);

  const leaveAnalysis = () => {
    allowBrowserBackRef.current = true;
    window.history.back();
    window.setTimeout(() => {
      if (!allowBrowserBackRef.current) return;

      allowBrowserBackRef.current = false;
      onBackToWorkspace();
    }, 0);
  };

  useEffect(() => {
    if (previousStepRef.current === activeStep) {
      return;
    }

    previousStepRef.current = activeStep;
    requestAnimationFrame(() => {
      reflectionSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [activeStep]);

  const reflectionDraftWithSelection: ReflectionDraft = {
    ...reflectionDraft,
    customChallengeTitle: customChallenge.title,
    customChallengeNote: customChallenge.note,
    selectedChallengeTitles,
  };

  return (
    <section className="min-h-screen" aria-label="Repository 분석 결과 페이지">
      <button className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-ptop-line bg-white px-4 text-sm font-bold text-ptop-ink transition hover:-translate-y-px hover:border-ptop-mint-dark" type="button" onClick={leaveAnalysis}>
        <span aria-hidden="true">←</span>
        작업실로 돌아가기
      </button>
      {activeStep === 1 ? (
          <AnalysisResult
            result={result}
            initialReflection={reflectionDraft.memorableProblem}
            technicalChallenges={analysisCandidates}
            onCustomChallengeAdd={(candidate) => {
              setAnalysisCandidates((current) => [...current, candidate]);
              setCustomChallenge({
                title: candidate.title,
                note: candidate.problem ?? "",
              });
              setSelectionToast("기술적 도전을 추가했습니다. 후보를 선택하면 Repository 근거와 다시 분석합니다.");
            }}
          reflectionAnalysis={currentReflectionAnalysis}
          selectedChallengeTitles={selectedChallengeTitles}
          onSelectedChallengeTitlesChange={setSelectedChallengeTitles}
          onContinueToReflection={continueToReflection}
          onStepChange={handleStepChange}
          onSelectionBlocked={setSelectionToast}
        />
      ) : (
        <section ref={reflectionSectionRef} className="scroll-mt-24 grid gap-6 rounded-[1.75rem] bg-[#f3f5f4] p-4 text-[#17211e] sm:p-6 lg:p-8" aria-label="회고 작성 단계">
          <ReportSteps activeStep={activeStep} onStepChange={handleStepChange} />
          <ReflectionWorkspace
            result={result}
            initialDraft={reflectionDraftWithSelection}
            reflectionAnalysis={currentReflectionAnalysis}
            onSave={(draft) =>
              saveReflectionDraftToApi(result.id, draft, undefined, undefined, analysisCandidates).then((response) => {
                setCurrentReflectionAnalysis(response.reflectionAnalysis ?? null);
                setAnalysisCandidates((current) =>
                  mergeTechnicalChallenges(
                    current,
                    response.reflectionAnalysis?.suggestedChallenges ?? [],
                  ),
                );
              })
            }
          />
        </section>
      )}
      {selectionToast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#9bcdb1] bg-[#17211e] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_32px_rgba(23,33,30,0.22)]"
          role="status"
          aria-live="polite"
        >
          <span className="mr-2 text-[#65f29d]" aria-hidden="true">!</span>
          {selectionToast}
        </div>
      )}
    </section>
  );
}

function mergeTechnicalChallenges(
  current: TechnicalChallengeCandidate[],
  additions: TechnicalChallengeCandidate[],
): TechnicalChallengeCandidate[] {
  const titles = new Set(current.map((candidate) => candidate.title.trim().toLowerCase()));
  return [
    ...current,
    ...additions.filter((candidate) => {
      const key = candidate.title.trim().toLowerCase();
      if (!key || titles.has(key)) return false;
      titles.add(key);
      return true;
    }),
  ];
}
