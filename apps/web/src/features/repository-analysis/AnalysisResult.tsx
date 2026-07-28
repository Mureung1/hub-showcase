import type {
  ReflectionAnalysis,
  RepositoryAnalysisEvidence,
  RepositoryAnalysisResult,
  TechnicalChallengeCandidate,
} from "@ptop/contracts";
import { useState } from "react";
import {
  createCustomTechnicalChallengeCandidate,
  getSelectionBlockMessage,
  toggleSelectedChallengeTitles,
} from "./candidateSelection";
import { rankCandidatesByReflection } from "./reflectionCandidateRanking";

type AnalysisResultProps = {
  result: RepositoryAnalysisResult;
  reflectionAnalysis?: ReflectionAnalysis | null;
  initialReflection?: string;
  technicalChallenges?: TechnicalChallengeCandidate[];
  onCustomChallengeAdd?: (candidate: TechnicalChallengeCandidate) => void;
  selectedChallengeTitles?: string[];
  onSelectedChallengeTitlesChange?: (titles: string[]) => void;
  onContinueToReflection?: () => void;
  onStepChange?: (step: 1 | 2) => void;
  onSelectionBlocked?: (message: string) => void;
};

export type AnalysisResultViewModel = {
  repository: RepositoryAnalysisResult["repository"];
  contributors: RepositoryAnalysisResult["contributors"];
  commits: RepositoryAnalysisResult["commits"];
  contributionNotice: string;
  readme: RepositoryAnalysisResult["analysis"]["repositorySnapshot"];
  languages: RepositoryAnalysisResult["analysis"]["techStack"]["languages"];
  packageManager: string | null;
  frameworks: string[];
  dependencies: string[];
  scripts: string[];
  fileCount: number;
  topLevelDirectories: string[];
  entryPoints: string[];
  testPaths: string[];
  ciPaths: string[];
  deploymentPaths: string[];
  treeTruncated: boolean;
  qualitySignals: RepositoryAnalysisResult["analysis"]["qualitySignals"];
  collaborationSummary: RepositoryAnalysisResult["analysis"]["collaborationSummary"];
  technicalChallenges: RepositoryAnalysisResult["analysis"]["technicalChallenges"];
  pullRequestCount: number;
  issueCount: number;
  warnings: string[];
  evidence: RepositoryAnalysisEvidence[];
};

export function getAnalysisResultViewModel(
  result: RepositoryAnalysisResult,
): AnalysisResultViewModel {
  const { analysis } = result;

  return {
    repository: result.repository,
    contributors: result.contributors,
    commits: result.commits.slice(0, 8),
    contributionNotice: result.contributionSummary.notice,
    readme: analysis.repositorySnapshot,
    languages: analysis.techStack.languages,
    packageManager: analysis.techStack.packageManager,
    frameworks: analysis.techStack.frameworks,
    dependencies: analysis.techStack.dependencies,
    scripts: analysis.techStack.scripts,
    fileCount: analysis.projectStructure.fileCount,
    topLevelDirectories: analysis.projectStructure.topLevelDirectories,
    entryPoints: analysis.projectStructure.entryPoints,
    testPaths: analysis.projectStructure.testPaths,
    ciPaths: analysis.projectStructure.ciPaths,
    deploymentPaths: analysis.projectStructure.deploymentPaths,
    treeTruncated: analysis.projectStructure.treeTruncated,
    qualitySignals: analysis.qualitySignals,
    collaborationSummary: analysis.collaborationSummary,
    technicalChallenges: analysis.technicalChallenges,
    pullRequestCount: analysis.collaborationSummary.pullRequestCount,
    issueCount: analysis.collaborationSummary.issueCount,
    warnings: analysis.warnings,
    evidence: analysis.evidence,
  };
}

export function AnalysisResult({
  result,
  reflectionAnalysis,
  initialReflection,
  technicalChallenges,
  onCustomChallengeAdd,
  selectedChallengeTitles,
  onSelectedChallengeTitlesChange,
  onContinueToReflection,
  onStepChange,
  onSelectionBlocked,
}: AnalysisResultProps) {
  const viewModel = getAnalysisResultViewModel(result);
  const candidates = rankCandidatesByReflection(
    technicalChallenges ?? viewModel.technicalChallenges,
    initialReflection ?? "",
  );
  const [localSelectedTitles, setLocalSelectedTitles] = useState<string[]>([]);
  const selectedTitles = selectedChallengeTitles ?? localSelectedTitles;
  const handleSelectedTitlesChange = (titles: string[]) => {
    setLocalSelectedTitles(titles);
    onSelectedChallengeTitlesChange?.(titles);
  };

  return (
    <section className="grid gap-8 rounded-[1.75rem] bg-[#f3f5f4] p-4 text-[#17211e] sm:p-6 lg:p-8" aria-label="Repository 분석 결과">
      <ReportHeader repository={viewModel.repository} />
      <ReportSteps activeStep={1} onStepChange={onStepChange} />

      {candidates.length > 0 ? (
        <CandidateReport
          candidates={candidates}
          reflectionAnalysis={reflectionAnalysis}
          repositoryUrl={viewModel.repository.url}
          selectedChallengeTitles={selectedTitles}
          onSelectedChallengeTitlesChange={handleSelectedTitlesChange}
          onContinueToReflection={onContinueToReflection}
          onSelectionBlocked={onSelectionBlocked}
          repositoryEvidence={viewModel.evidence}
          onCustomChallengeAdd={onCustomChallengeAdd}
        />
      ) : (
        <EmptyCandidateState warnings={viewModel.warnings} />
      )}

      {viewModel.warnings.length > 0 && <Warnings warnings={viewModel.warnings} />}
    </section>
  );
}

function ReportHeader({ repository }: { repository: RepositoryAnalysisResult["repository"] }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-5">
      <div className="grid gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#008d59]">PtoP / Project report</span>
        <h2 className="m-0 text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
          {repository.owner}/{repository.name}
        </h2>
        <p className="m-0 max-w-2xl text-sm leading-6 text-[#66736e]">
          포트폴리오에 쓸 이야기를 실제 Repository 근거와 함께 골라보세요.
        </p>
      </div>
      <a
        className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#43514b] transition hover:-translate-y-0.5 hover:border-[#00915a] hover:text-[#00834f]"
        href={repository.url}
        target="_blank"
        rel="noreferrer"
      >
        GitHub에서 보기 ↗
      </a>
    </header>
  );
}

export function ReportSteps({
  activeStep,
  onStepChange,
}: {
  activeStep: 1 | 2;
  onStepChange?: (step: 1 | 2) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-label="분석 결과 단계">
      <button
        className={`rounded-xl px-4 py-3 text-left text-sm font-bold transition ${activeStep === 1 ? "bg-[#17211e] text-white" : "border border-black/10 bg-white text-[#65726d] hover:border-[#00915a]"}`}
        type="button"
        onClick={() => onStepChange?.(1)}
      >
        <span className="mr-2 text-[#65f29d]">01</span> 후보 고르기
      </button>
      <button
        className={`rounded-xl px-4 py-3 text-left text-sm font-bold transition ${activeStep === 2 ? "bg-[#17211e] text-white" : "border border-black/10 bg-white text-[#65726d] hover:border-[#00915a]"}`}
        type="button"
        onClick={() => onStepChange?.(2)}
      >
        <span className="mr-2 text-[#00915a]">02</span> 이유 쓰고 회고 완성하기
      </button>
    </div>
  );
}

function CandidateReport({
  candidates,
  reflectionAnalysis,
  repositoryUrl,
  selectedChallengeTitles,
  onSelectedChallengeTitlesChange,
  onContinueToReflection,
  onSelectionBlocked,
  repositoryEvidence,
  onCustomChallengeAdd,
}: {
  candidates: TechnicalChallengeCandidate[];
  reflectionAnalysis?: ReflectionAnalysis | null;
  repositoryUrl: string;
  selectedChallengeTitles: string[];
  onSelectedChallengeTitlesChange: (titles: string[]) => void;
  onContinueToReflection?: () => void;
  onSelectionBlocked?: (message: string) => void;
  repositoryEvidence: RepositoryAnalysisEvidence[];
  onCustomChallengeAdd?: (candidate: TechnicalChallengeCandidate) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeCandidate = candidates[activeIndex] ?? candidates[0];
  const [customTitle, setCustomTitle] = useState("");
  const [customNote, setCustomNote] = useState("");

  if (!activeCandidate) {
    return null;
  }

  const toggleCandidate = (index: number) => {
    const title = candidates[index]?.title;
    if (!title) return;

    const selection = toggleSelectedChallengeTitles(selectedChallengeTitles, title);
    if (selection.blocked) {
      onSelectionBlocked?.(getSelectionBlockMessage(selectedChallengeTitles));
      return;
    }

    onSelectedChallengeTitlesChange(selection.titles);
    setActiveIndex(index);
  };

  const isActiveCandidateSelected = selectedChallengeTitles.includes(activeCandidate.title);
  const matchedReflection = reflectionAnalysis &&
    reflectionAnalysis.matchedChallengeTitle === activeCandidate.title
    ? reflectionAnalysis
    : null;
  const addCustomChallenge = () => {
    const title = customTitle.trim();
    if (!title) {
      onSelectionBlocked?.("추가할 기술적 도전의 이름을 입력해주세요.");
      return;
    }
    if (candidates.some((candidate) => candidate.title === title)) {
      onSelectionBlocked?.("이미 같은 이름의 기술적 도전 후보가 있어요.");
      return;
    }

    onCustomChallengeAdd?.(
      createCustomTechnicalChallengeCandidate(title, customNote, repositoryEvidence),
    );
    setCustomTitle("");
    setCustomNote("");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
      <aside className="grid content-start gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#008d59]">Candidates</span>
            <h3 className="m-0 mt-1 text-lg font-extrabold">기술적 도전 후보</h3>
          </div>
          <span className="text-xs font-bold text-[#66736e]">{selectedChallengeTitles.length}/1 선택</span>
        </div>
        <p className="m-0 text-sm leading-6 text-[#66736e]">실제로 경험한 기술적 도전 후보 하나를 선택하세요. 다른 후보를 누르면 선택이 바뀝니다.</p>
        <div className="grid gap-2">
          {candidates.map((candidate, index) => (
            <button
              className={`grid gap-2 rounded-xl border p-3 text-left transition ${activeIndex === index ? "border-[#00915a] bg-white shadow-[0_8px_24px_rgba(0,145,90,0.1)]" : "border-black/10 bg-white/70 hover:border-[#76cda4]"}`}
              key={candidate.title}
              type="button"
              aria-pressed={selectedChallengeTitles.includes(candidate.title)}
              onClick={() => toggleCandidate(index)}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#e2f7eb] text-sm font-extrabold text-[#008d59]">{String(index + 1).padStart(2, "0")}</span>
                <span className={`mt-1 h-4 w-4 shrink-0 rounded border text-center text-[0.65rem] leading-3.5 ${selectedChallengeTitles.includes(candidate.title) ? "border-[#00915a] bg-[#65f29d] text-[#17211e]" : "border-black/20 bg-white"}`}>{selectedChallengeTitles.includes(candidate.title) ? "✓" : ""}</span>
              </span>
              <strong className="text-sm leading-5">{candidate.title}</strong>
              <span className="text-xs text-[#66736e]">근거 {candidate.evidence.length}건 · 신뢰도 {confidenceLabels[candidate.confidence]}</span>
            </button>
          ))}
        </div>
        <form
          className="grid gap-2 rounded-xl border border-dashed border-[#9bcdb1] bg-[#f1fbf5] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            addCustomChallenge();
          }}
        >
          <strong className="text-sm text-[#007d4d]">원하는 도전이 없나요?</strong>
          <input
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#00915a]"
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder="예: 실시간 상태 동기화"
            aria-label="직접 추가할 기술적 도전"
          />
          <textarea
            className="min-h-20 resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-[#00915a]"
            value={customNote}
            onChange={(event) => setCustomNote(event.target.value)}
            placeholder="어떤 문제였는지 짧게 적어주세요. Repository 근거와 다시 확인합니다."
            aria-label="직접 추가할 기술적 도전 설명"
          />
          <button
            className="rounded-lg border border-[#00915a] bg-white px-3 py-2 text-xs font-extrabold text-[#007d4d] transition hover:bg-[#e2f7eb]"
            type="submit"
          >
            기술적 도전 추가
          </button>
        </form>
      </aside>

      <article className="grid min-w-0 gap-6 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_36px_rgba(23,33,30,0.06)] sm:p-7">
        {!isActiveCandidateSelected ? (
          <CandidateDashboardEmpty
            onSelectionBlocked={onSelectionBlocked}
          />
        ) : (
          <>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
          <div className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#008d59]">Candidate {String(activeIndex + 1).padStart(2, "0")}</span>
            <h3 className="m-0 max-w-3xl text-2xl font-extrabold leading-tight tracking-[-0.04em]">{activeCandidate.title}</h3>
            <p className="m-0 max-w-3xl leading-7 text-[#52605a]">{activeCandidate.summary}</p>
          </div>
          <span className="rounded-full bg-[#e2f7eb] px-3 py-1.5 text-xs font-extrabold text-[#008d59]">신뢰도 {confidenceLabels[activeCandidate.confidence]}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ReportStat label="분석 근거" value={`${activeCandidate.evidence.length}건`} />
          <ReportStat label="후보 상태" value={activeCandidate.requiresUserConfirmation ? "확인 필요" : "분석 완료"} />
          <ReportStat label="회고 연결" value={getReflectionStatus(reflectionAnalysis, activeCandidate.title)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ReportInsight label="기술적 도전" value={activeCandidate.technicalChallenge} />
          <ReportInsight label="포트폴리오에서 의미 있는 이유" value={activeCandidate.whyItMatters} />
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#008d59]">Evidence</span>
              <h4 className="m-0 mt-1 text-lg font-extrabold">이 후보를 뒷받침하는 기록</h4>
            </div>
            <a className="text-sm font-bold text-[#008d59] hover:underline" href={repositoryUrl} target="_blank" rel="noreferrer">전체 Repository ↗</a>
          </div>
          <EvidenceList evidence={activeCandidate.evidence} />
        </div>

        <div className="grid gap-3 rounded-xl border border-[#ccebd9] bg-[#f1fbf5] p-4 text-sm leading-6 text-[#405048]">
          <strong className="text-[#007d4d]">이 결과를 포트폴리오에 쓰기 전 확인해주세요</strong>
          <p className="m-0">AI 후보는 커밋과 파일 등의 근거를 바탕으로 만든 제안입니다. 실제로 본인이 해결한 문제인지 회고에서 확인하면 결과가 더 정확해집니다.</p>
          {activeCandidate.requiresUserConfirmation && <strong>현재 후보는 사용자 확인이 필요합니다.</strong>}
        </div>

        {matchedReflection && <ReflectionConnection reflectionAnalysis={matchedReflection} />}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-5">
          <p className="m-0 text-sm text-[#66736e]">후보를 확인한 뒤 나의 경험을 회고해보세요.</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              className="rounded-full bg-[#17211e] px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#008d59]"
              type="button"
              onClick={() => {
                if (selectedChallengeTitles.length === 0) {
                  onSelectionBlocked?.(getSelectionBlockMessage(selectedChallengeTitles));
                  return;
                }

                onContinueToReflection?.();
              }}
            >
              다음: 나의 경험 적기 →
            </button>
          </div>
        </div>
          </>
        )}
      </article>
    </div>
  );
}

function CandidateDashboardEmpty({
  onSelectionBlocked,
}: {
  onSelectionBlocked?: (message: string) => void;
}) {
  return (
    <div className="grid min-h-80 place-items-center gap-3 rounded-xl border border-dashed border-[#b7c6bf] bg-[#fbfcfb] p-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e2f7eb] text-xl font-extrabold text-[#008d59]" aria-hidden="true">
        +
      </span>
      <div className="grid gap-1">
        <strong className="text-lg">후보를 선택해주세요</strong>
        <p className="m-0 max-w-sm text-sm leading-6 text-[#66736e]">
          왼쪽에서 실제로 경험한 기술적 도전을 선택하면 이곳에 근거와 분석 내용을 보여드려요.
        </p>
      </div>
      <button
        className="rounded-full border border-[#17211e] bg-white px-5 py-3 text-sm font-extrabold text-[#17211e] transition hover:border-[#008d59] hover:text-[#008d59]"
        type="button"
        onClick={() => onSelectionBlocked?.(getSelectionBlockMessage([]))}
      >
        후보를 먼저 선택해주세요
      </button>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl bg-[#f3f5f4] px-4 py-3">
      <span className="text-xs font-bold text-[#74807a]">{label}</span>
      <strong className="text-lg font-extrabold">{value}</strong>
    </div>
  );
}

function ReportInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-xl border border-black/10 bg-[#fbfcfb] p-4">
      <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#008d59]">{label}</span>
      <p className="m-0 text-sm leading-6 text-[#52605a]">{value}</p>
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: TechnicalChallengeCandidate["evidence"] }) {
  if (evidence.length === 0) {
    return <p className="m-0 rounded-xl border border-dashed border-black/15 p-4 text-sm text-[#66736e]">연결된 근거가 없습니다.</p>;
  }

  return (
    <ul className="m-0 grid gap-2 p-0">
      {[...evidence].sort(compareEvidencePriority).map((item, index) => (
        <li className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-[#fafbfa] p-3" key={`${item.evidenceType}-${item.referenceId ?? item.filePath ?? "unknown"}-${index}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e2f7eb] text-xs font-extrabold text-[#008d59]">{index + 1}</span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <strong className="truncate text-sm">{item.title}</strong>
            <small className="truncate text-xs text-[#74807a]">{item.filePath ?? evidenceTypeLabels[item.evidenceType]}</small>
          </span>
          {item.url && <a className="shrink-0 text-sm font-bold text-[#008d59] hover:underline" href={item.url} target="_blank" rel="noreferrer">열기 ↗</a>}
        </li>
      ))}
    </ul>
  );
}

function ReflectionConnection({ reflectionAnalysis }: { reflectionAnalysis: ReflectionAnalysis }) {
  return (
    <div className={`grid gap-2 rounded-xl border p-4 text-sm leading-6 ${reflectionTone[reflectionAnalysis.alignment]}`} role="status">
      <strong>{reflectionAlignmentLabels[reflectionAnalysis.alignment]}</strong>
      <p className="m-0">{reflectionAnalysis.message}</p>
      {reflectionAnalysis.portfolioSummary && <p className="m-0 border-t border-current/15 pt-2"><strong>포트폴리오 단서: </strong>{reflectionAnalysis.portfolioSummary}</p>}
    </div>
  );
}

function EmptyCandidateState({ warnings }: { warnings: string[] }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
      <span className="text-3xl" aria-hidden="true">⌁</span>
      <h3 className="m-0 text-xl font-extrabold">기술적 도전 후보를 찾지 못했습니다</h3>
      <p className="m-0 text-sm leading-6 text-[#66736e]">현재 Repository 근거만으로는 후보를 만들기 어렵습니다. 아래 확인 필요 항목을 참고해보세요.</p>
      {warnings.length > 0 && <ul className="m-0 text-left text-sm leading-6 text-[#66736e]"><li>{warnings[0]}</li></ul>}
    </div>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <summary className="cursor-pointer font-extrabold">일부 데이터 확인 필요</summary>
      <ul className="mt-2 grid gap-1 pl-5">
        {warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </details>
  );
}

function getReflectionStatus(reflectionAnalysis: ReflectionAnalysis | null | undefined, title: string) {
  if (!reflectionAnalysis) return "작성 전";
  if (reflectionAnalysis.matchedChallengeTitle === title) return reflectionAlignmentLabels[reflectionAnalysis.alignment];
  return "확인 필요";
}

const confidenceLabels: Record<TechnicalChallengeCandidate["confidence"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const evidenceTypeLabels: Record<RepositoryAnalysisEvidence["evidenceType"], string> = {
  commit: "Commit",
  pull_request: "Pull Request",
  issue: "Issue",
  discussion: "Discussion",
  project: "Project",
  file: "File",
  config: "Config",
  release: "Release",
};

const evidencePriority: Record<RepositoryAnalysisEvidence["evidenceType"], number> = {
  pull_request: 0,
  issue: 1,
  discussion: 2,
  project: 3,
  commit: 4,
  file: 5,
  config: 5,
  release: 5,
};

function compareEvidencePriority(
  left: TechnicalChallengeCandidate["evidence"][number],
  right: TechnicalChallengeCandidate["evidence"][number],
): number {
  return evidencePriority[left.evidenceType] - evidencePriority[right.evidenceType];
}

const reflectionAlignmentLabels: Record<ReflectionAnalysis["alignment"], string> = {
  matched: "회고와 분석 근거가 연결되었습니다",
  partial: "회고와 일부 근거만 연결되었습니다",
  mismatched: "회고와 AI 후보가 일치하지 않습니다",
  no_evidence: "연결할 근거를 찾지 못했습니다",
};

const reflectionTone: Record<ReflectionAnalysis["alignment"], string> = {
  matched: "border-[#a5e6bd] bg-[#f1fbf5] text-[#245c3d]",
  partial: "border-amber-200 bg-amber-50 text-amber-950",
  mismatched: "border-orange-200 bg-orange-50 text-orange-950",
  no_evidence: "border-slate-200 bg-slate-50 text-slate-700",
};
