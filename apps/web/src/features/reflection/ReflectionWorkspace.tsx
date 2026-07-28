import { useEffect, useState } from "react";
import type {
  PortfolioDraft,
  ReflectionAnalysis,
  RepositoryAnalysisResult,
  TechnicalChallengeEvidenceReference,
} from "@ptop/contracts";
import { saveReflectionDraft, type ReflectionDraft } from "./reflection";
import { loadReflectionDraftFromApi } from "./reflectionApi";
import {
  getPortfolioDraftLoadingSteps,
  normalizeDraftListItems,
} from "./portfolioDraftView";

type ReflectionWorkspaceProps = {
  result: RepositoryAnalysisResult;
  initialDraft: ReflectionDraft;
  reflectionAnalysis?: ReflectionAnalysis | null;
  onSave?: (draft: ReflectionDraft) => Promise<void>;
};

const reflectionQuestion =
  "선택하신 기술적 도전을 해결하기 위해 본인이 어떤 작업을 했나요?";

export function ReflectionWorkspace({
  result,
  initialDraft,
  reflectionAnalysis,
  onSave,
}: ReflectionWorkspaceProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [loadedReflectionAnalysis, setLoadedReflectionAnalysis] =
    useState<ReflectionAnalysis | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const generatedAnalysis = reflectionAnalysis ?? loadedReflectionAnalysis;

  useEffect(() => {
    saveReflectionDraft(result.repository.url, draft);
  }, [draft, result.repository.url]);

  useEffect(() => {
    let cancelled = false;

    void loadReflectionDraftFromApi(result.id)
      .then((saved) => {
        if (cancelled || !saved) return;

        setDraft({
          ...saved.draft,
          postAnalysisReflection: saved.draft.postAnalysisReflection ?? "",
          // 후보 선택은 결과 단계에서 현재 세션에 직접 선택한 값만 사용한다.
          // 서버에 남아 있는 이전 초안의 선택값을 복원하면 선택하지 않은
          // 후보가 2/2로 표시되고 잘못된 후보로 정합성 검사가 실행된다.
          selectedChallengeTitles: initialDraft.selectedChallengeTitles,
        });
        setLoadedReflectionAnalysis(saved.reflectionAnalysis ?? null);
      })
      .catch(() => {
        // The local draft remains usable when the API is temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [initialDraft.selectedChallengeTitles, result.id]);

  const updateAnswer = (value: string) => {
    setSaveStatus("idle");
    setSaveMessage("");
    setDraft((current) => ({ ...current, postAnalysisReflection: value }));
  };

  const saveAnswer = async () => {
    const answer = draft.postAnalysisReflection.trim();
    if (!answer || saveStatus === "saving") return;

    const nextDraft = { ...draft, postAnalysisReflection: answer };
    setSaveStatus("saving");
    setSaveMessage(
      "Repository 근거와 회고를 연결해 포트폴리오 초안을 만드는 중입니다.",
    );

    try {
      if (onSave) {
        await onSave(nextDraft);
      }
      setSaveStatus("saved");
      setSaveMessage(
        "회고가 저장되었습니다. 아래에서 AI가 다듬은 초안을 확인해보세요.",
      );
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error ? error.message : "회고 저장에 실패했습니다.",
      );
    }
  };

  return (
    <section className="grid gap-6" aria-label="회고 확장 작업공간">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">
            From evidence to reflection
          </span>
          <h2 className="mb-0 mt-2 text-2xl tracking-[-0.03em]">
            이유를 한 문장으로 남겨보세요
          </h2>
          <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-ptop-muted">
            분석 중 남긴 첫 회고를 우선 참고하고, 선택한 후보에 대한 나의 판단을
            한 문장으로 보태주세요.
          </p>
        </div>
        <span className="rounded-full bg-ptop-mint-soft px-3 py-1 text-xs font-bold text-ptop-mint-dark">
          이 Repository에 자동 저장
        </span>
      </header>

      <SelectedChallenges titles={draft.selectedChallengeTitles} />

      {draft.memorableProblem.trim() && (
        <div className="grid gap-2 rounded-xl border border-ptop-mint-line bg-ptop-mint-soft p-4 text-sm leading-6 text-ptop-ink">
          <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">
            Analysis-time reflection
          </span>
          <p className="m-0">{draft.memorableProblem}</p>
          <span className="text-xs text-ptop-muted">
            이 내용이 후보 우선순위를 정하는 첫 번째 신호로 사용됩니다.
          </span>
        </div>
      )}

      <article className="grid gap-4 rounded-2xl border border-ptop-line bg-white p-5 shadow-ptop-surface sm:p-7">
        <div className="flex items-center gap-3 border-b border-ptop-line pb-4">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ptop-mint-soft text-lg text-ptop-mint-dark"
            aria-hidden="true"
          >
            ✦
          </span>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-ptop-mint-dark">
              Poppy&apos;s question
            </span>
            <strong className="mt-1 block text-base">
              나의 경험을 들려주세요
            </strong>
          </div>
        </div>

        <div
          className="grid gap-3 rounded-xl border border-ptop-mint-line bg-white p-4"
          aria-live="polite"
        >
          <span className="text-xs font-extrabold text-ptop-mint-dark">
            포피의 질문
          </span>
          <strong className="text-lg leading-[1.6]">
            {reflectionQuestion}
          </strong>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ptop-ink">나의 답변</span>
          <textarea
            className="min-h-32 w-full resize-y rounded-xl border border-ptop-line bg-ptop-paper p-4 text-sm leading-[1.7] outline-none placeholder:text-ptop-muted focus:border-ptop-mint-dark focus:ring-4 focus:ring-ptop-mint/20"
            value={draft.postAnalysisReflection}
            onChange={(event) => updateAnswer(event.target.value)}
            placeholder="예: 팀원마다 다른 방식으로 분석 결과를 확인해 회고와 결과가 쉽게 끊겼고, 결과 저장 흐름을 하나로 정리했습니다."
            rows={4}
          />
          <span className="text-xs leading-5 text-ptop-muted">
            한 문장으로 작성해도 충분합니다. 문제와 내가 한 판단 또는 행동이
            드러나면 Repository 근거와 비교할 수 있어요.
          </span>
        </label>

        <div className="grid gap-2 rounded-xl bg-ptop-soft-paper p-4 text-xs leading-5 text-ptop-muted">
          <strong className="text-ptop-mint-dark">
            포트폴리오 초안이 만들어지는 기준
          </strong>
          <span>
            1. 선택한 후보에 PR, Issue, Discussion, Project, Commit, 파일 등
            연결 가능한 근거가 1건 이상 있어야 합니다.
          </span>
          <span>
            2. 초기 회고 또는 지금 작성한 회고에서 해결하려던 문제와 본인의
            행동·판단이 확인되어야 합니다.
          </span>
          <span>
            3. AI가 두 내용을 matched 또는 partial로 연결할 때만 초안을 만들며,
            mismatched·no_evidence이면 사실을 만들지 않고 확인을 요청합니다.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-ptop-muted" role="status">
            {saveMessage || "작성한 답변은 최종 초안의 근거로 사용됩니다."}
          </p>
          <button
            className="min-h-11 rounded-full bg-[var(--button-primary-bg)] px-5 text-sm font-extrabold text-[var(--button-primary-fg)] transition hover:-translate-y-px hover:bg-[var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={
              !draft.postAnalysisReflection.trim() || saveStatus === "saving"
            }
            onClick={() => void saveAnswer()}
          >
            {saveStatus === "saving"
              ? "초안 만드는 중"
              : "포트폴리오 초안 만들기"}
          </button>
        </div>
      </article>

      {saveStatus === "saving" ? (
        <PortfolioDraftLoading />
      ) : generatedAnalysis?.portfolioDraft ? (
        <PortfolioDraftPreview
          draft={generatedAnalysis.portfolioDraft}
          evidence={generatedAnalysis.matchedChallengeEvidence}
        />
      ) : generatedAnalysis ? (
        <AlignmentNotice analysis={generatedAnalysis} />
      ) : null}
    </section>
  );
}

function PortfolioDraftLoading() {
  return (
    <article
      className="grid gap-5 rounded-2xl border border-ptop-mint-line bg-ptop-soft-paper p-6 shadow-ptop-surface sm:p-8"
      role="status"
      aria-live="polite"
      aria-label="포트폴리오 초안 생성 중"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ptop-mint-dark text-lg text-white motion-safe:animate-pulse"
          aria-hidden="true"
        >
          ✦
        </span>
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-ptop-mint-dark">
            Portfolio draft
          </span>
          <h3 className="m-0 mt-1 text-xl tracking-[-0.03em]">
            포트폴리오 초안을 정리하고 있어요
          </h3>
        </div>
      </div>
      <div className="grid gap-2" aria-label="초안 생성 진행 단계">
        {getPortfolioDraftLoadingSteps().map((step) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-ptop-line bg-white px-4 py-3 text-sm text-ptop-muted"
            key={step}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-ptop-mint motion-safe:animate-pulse"
              aria-hidden="true"
            />
            {step}
          </div>
        ))}
      </div>
      <p className="m-0 text-sm leading-6 text-ptop-muted">
        작성한 회고와 Repository 근거를 확인한 뒤, 사실에 맞는 Background·Problem·Solution 구조로 다듬습니다.
      </p>
    </article>
  );
}

function SelectedChallenges({ titles }: { titles: string[] }) {
  return (
    <div className="grid gap-3 rounded-xl border border-ptop-line bg-white p-4 shadow-ptop-surface">
      <div>
        <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ptop-mint-dark text-xs font-extrabold text-white">
          01
        </span>
        <strong>선택한 기술적 도전</strong>
      </div>
      <div className="flex flex-wrap gap-2">
        {titles.map((title) => (
          <span
            className="rounded-full bg-ptop-mint-soft px-3 py-1.5 text-sm font-bold text-ptop-mint-dark"
            key={title}
          >
            {title}
          </span>
        ))}
      </div>
      <p className="m-0 text-sm leading-[1.6] text-ptop-muted">
        선택한 후보와 나의 한 문장 회고를 근거 중심으로 연결합니다.
      </p>
    </div>
  );
}

function PortfolioDraftPreview({
  draft,
  evidence,
}: {
  draft: PortfolioDraft;
  evidence: TechnicalChallengeEvidenceReference[];
}) {
  const visualReferences = evidence.flatMap((item) =>
    (item.imageUrls ?? []).map((url) => ({
      url,
      sourceTitle: item.title,
      sourceUrl: item.url,
    })),
  );

  return (
    <article className="portfolio-draft-print mx-auto grid max-w-4xl gap-8 border border-ptop-line bg-white p-6 shadow-ptop-surface sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ptop-line pb-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-ptop-mint-dark">
            Portfolio draft
          </span>
          <h3 className="mb-0 mt-2 text-xl tracking-[-0.03em]">
            AI가 다듬은 포트폴리오 초안
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {draft.requiresUserReview && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              사용자 확인 필요
            </span>
          )}
          <button
            className="rounded-full border border-ptop-line bg-white px-4 py-2 text-sm font-bold text-ptop-mint-dark transition hover:-translate-y-px hover:border-ptop-mint-dark"
            type="button"
            onClick={() => window.print()}
          >
            PDF로 저장
          </button>
        </div>
        {draft.requiresUserReview && (
          <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 print:inline-flex">
            사용자 확인 필요
          </span>
        )}
      </header>
      <h4 className="m-0 text-2xl leading-tight tracking-[-0.03em]">
        {draft.title}
      </h4>
      {draft.technicalChallenge && (
        <h5 className="m-0 border-l-4 border-ptop-mint pl-3 text-xl leading-tight">
          {draft.technicalChallenge}
        </h5>
      )}

      <DraftSection label="Background" value={draft.background} />
      <PortfolioVisuals references={visualReferences} />
      <DraftSection label="Problem" value={draft.problem} />
      <DraftSection label="Solution" value={draft.solution} />
      <DraftSection label="My contribution" value={draft.contribution} />
      {draft.keyDecisions && draft.keyDecisions.length > 0 && (
        <DraftListSection label="Key decisions" items={draft.keyDecisions} />
      )}
      {draft.result && <DraftSection label="Result" value={draft.result} />}
      {draft.learnings && draft.learnings.length > 0 && (
        <DraftListSection label="What I learned" items={draft.learnings} />
      )}
      <div className="grid gap-2 border-t border-ptop-line pt-5">
        <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">
          Evidence used
        </span>
        {evidence.length > 0 ? (
          <ul className="m-0 grid list-none gap-2 p-0 text-sm leading-6 text-ptop-muted">
            {evidence.map((item, index) => (
              <li
                className="flex min-w-0 items-start gap-2"
                key={`${item.evidenceType}-${item.referenceId ?? item.filePath ?? index}`}
              >
                <span className="shrink-0 font-bold text-ptop-mint-dark" aria-hidden="true">-</span>
                {item.url ? (
                  <a
                    className="min-w-0 font-semibold text-ptop-mint-dark underline decoration-ptop-mint/40 underline-offset-2 transition hover:decoration-ptop-mint-dark"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.title} ↗
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="m-0 grid list-none gap-1.5 p-0 text-sm leading-6 text-ptop-muted">
            {splitEvidenceSummary(draft.evidenceSummary).map((item, index) => (
              <li className="flex items-start gap-2" key={`${item}-${index}`}>
                <span className="shrink-0 font-bold text-ptop-mint-dark" aria-hidden="true">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {draft.requiresUserReview && (
        <p className="m-0 text-sm leading-6 text-amber-800">
          회고와 Repository 기록의 연결이 충분하지 않을 수 있습니다. 게시 전
          실제 기여와 표현을 확인해주세요.
        </p>
      )}
    </article>
  );
}

type PortfolioVisualReference = {
  url: string;
  sourceTitle: string;
  sourceUrl: string | null;
};

function PortfolioVisuals({ references }: { references: PortfolioVisualReference[] }) {
  const uniqueReferences = [...new Map(references.map((reference) => [reference.url, reference])).values()];

  if (uniqueReferences.length === 0) {
    return (
      <aside className="grid min-h-32 place-items-center gap-2 border border-dashed border-ptop-mint-line bg-ptop-soft-paper p-5 text-center">
        <strong className="text-sm text-ptop-mint-dark">Background 이미지 자리</strong>
        <p className="m-0 max-w-lg text-xs leading-5 text-ptop-muted">
          연결된 PR에 첨부 이미지가 없어 이미지를 추가하지 않았습니다. 프로젝트 배경이나 문제 상황을 보여주는 이미지를 직접 첨부하면 좋습니다.
        </p>
      </aside>
    );
  }

  return (
    <figure className="grid gap-2 border border-ptop-line bg-ptop-soft-paper p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {uniqueReferences.map((reference) => (
          <a
            className="block overflow-hidden border border-ptop-line bg-white transition hover:border-ptop-mint-dark"
            href={reference.sourceUrl ?? reference.url}
            target="_blank"
            rel="noreferrer"
            key={reference.url}
          >
            <img
              className="aspect-video w-full object-contain"
              src={reference.url}
              alt={`${reference.sourceTitle}에 첨부된 프로젝트 자료`}
              loading="lazy"
            />
          </a>
        ))}
      </div>
      <figcaption className="text-xs leading-5 text-ptop-muted">
        선택한 기술적 도전의 PR에 첨부된 자료입니다. 이미지를 클릭하면 원문 PR로 이동합니다.
      </figcaption>
    </figure>
  );
}

function DraftSection({ label, value }: { label: string; value: string }) {
  return (
    <section className="grid gap-2">
      <h5 className="m-0 text-sm font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">{label}</h5>
      <p className="m-0 whitespace-pre-line text-sm leading-7 text-ptop-ink">{value}</p>
    </section>
  );
}

function DraftListSection({ label, items }: { label: string; items: string[] }) {
  const normalizedItems = normalizeDraftListItems(items);

  if (normalizedItems.length === 0) return null;

  return (
    <section className="grid gap-2">
      <h5 className="m-0 text-sm font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">{label}</h5>
      <ul className="m-0 grid list-none gap-2 p-0 text-sm leading-7 text-ptop-ink">
        {normalizedItems.map((item, index) => (
          <li className="flex items-start gap-2" key={`${item}-${index}`}>
            <span className="shrink-0 font-bold text-ptop-mint-dark" aria-hidden="true">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function splitEvidenceSummary(value: string): string[] {
  const items = value
    .split(/\r?\n|\s*[•·]\s*|\s*;\s*/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return items.length > 0 ? items : ["연결된 Repository 근거가 없습니다."];
}

function AlignmentNotice({ analysis }: { analysis: ReflectionAnalysis }) {
  return (
    <div
      className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
      role="status"
    >
      <strong>아직 포트폴리오 초안을 만들지 못했습니다.</strong>
      <p className="m-0">{analysis.message}</p>
      <p className="m-0">
        Repository 근거와 나의 실제 경험이 일치하는지 확인한 뒤 다시
        시도해주세요.
      </p>
    </div>
  );
}
