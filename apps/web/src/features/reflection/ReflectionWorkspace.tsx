import { useEffect, useState } from "react";
import type { RepositoryAnalysisResult, TechnicalChallengeCandidate } from "@ptop/contracts";
import {
  addSelectedChallenge,
  CHALLENGE_FOLLOW_UP_PROMPTS,
  saveReflectionDraft,
  type ReflectionChallengeAnswers,
  type ReflectionDraft,
} from "./reflection";
import { loadReflectionDraftFromApi } from "./reflectionApi";

type ReflectionWorkspaceProps = {
  result: RepositoryAnalysisResult;
  initialDraft: ReflectionDraft;
  onSave?: (draft: ReflectionDraft) => Promise<void>;
};

const mascotUrl = `${import.meta.env.BASE_URL}assets/PtoP_LogoImage.png`;

export function ReflectionWorkspace({ result, initialDraft, onSave }: ReflectionWorkspaceProps) {
  const [draft, setDraft] = useState(initialDraft);
  const challenges = result.analysis.technicalChallenges;
  const customChallengeSelected = draft.selectedChallengeTitles.includes(
    draft.customChallengeTitle,
  );

  useEffect(() => {
    saveReflectionDraft(result.repository.url, draft);
  }, [draft, result.repository.url]);

  useEffect(() => {
    let cancelled = false;

    void loadReflectionDraftFromApi(result.id)
      .then((saved) => {
        if (!cancelled && saved) {
          setDraft(saved.draft);
        }
      })
      .catch(() => {
        // The local draft remains usable when the API is temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [result.id]);

  const toggleChallenge = (title: string) => {
    setDraft((current) => ({
      ...current,
      selectedChallengeTitles: addSelectedChallenge(current, title),
    }));
  };

  const updateChallengeAnswer = (
    title: string,
    key: keyof ReflectionChallengeAnswers,
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      challengeAnswers: {
        ...current.challengeAnswers,
        [title]: {
          context: current.challengeAnswers[title]?.context ?? "",
          decision: current.challengeAnswers[title]?.decision ?? "",
          contribution: current.challengeAnswers[title]?.contribution ?? "",
          [key]: value,
        },
      },
    }));
  };

  const updateCustomTitle = (value: string) => {
    setDraft((current) => ({
      ...current,
      customChallengeTitle: value,
      selectedChallengeTitles: current.selectedChallengeTitles.map((title) =>
        title === current.customChallengeTitle ? value : title,
      ),
    }));
  };

  const addCustomChallenge = () => {
    const title = draft.customChallengeTitle.trim();
    if (!title || customChallengeSelected || draft.selectedChallengeTitles.length >= 2) {
      return;
    }

    setDraft((current) => ({
      ...current,
      customChallengeTitle: title,
      customChallengeNote: current.customChallengeNote.trim(),
      selectedChallengeTitles: addSelectedChallenge(current, title),
    }));
  };

  return (
    <section className="grid gap-6" aria-label="회고 확장 작업공간">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">From evidence to reflection</span>
          <h2 className="mb-0 mt-2 text-2xl tracking-[-0.03em]">분석 결과에 나의 경험을 더해보세요</h2>
        </div>
        <span className="rounded-full bg-ptop-mint-soft px-3 py-1 text-xs font-bold text-ptop-mint-dark">이 Repository에 자동 저장</span>
      </header>

      <div className="grid gap-2 rounded-xl border border-ptop-line bg-ptop-soft-paper p-4">
        <div>
          <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ptop-mint-dark text-xs font-extrabold text-white">01</span>
          <strong>포피와 나눈 프로젝트 메모</strong>
        </div>
        <p className="m-0 text-sm leading-[1.6] text-ptop-muted">{getDraftSummary(draft)}</p>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ptop-mint-dark text-xs font-extrabold text-white">02</span>
            <h3 className="m-0 inline text-lg">회고할 기술적 도전을 선택하세요</h3>
          </div>
          <span className="text-sm font-bold text-ptop-muted">{draft.selectedChallengeTitles.length}/2 선택</span>
        </div>
        <p className="m-0 text-sm leading-[1.6] text-ptop-muted">
          AI의 제안은 후보일 뿐입니다. 실제로 경험한 문제만 선택하고, 부족하면 직접 추가할 수 있습니다.
        </p>

        {challenges.length > 0 ? (
          <div className="grid gap-3">
            {challenges.map((challenge) => (
              <ChallengeOption
                key={challenge.title}
                challenge={challenge}
                selected={draft.selectedChallengeTitles.includes(challenge.title)}
                disabled={
                  draft.selectedChallengeTitles.length >= 2 &&
                  !draft.selectedChallengeTitles.includes(challenge.title)
                }
                onToggle={() => toggleChallenge(challenge.title)}
              />
            ))}
          </div>
        ) : (
          <p className="m-0 rounded-xl border border-dashed border-ptop-line p-4 text-sm leading-[1.6] text-ptop-muted">
            현재 분석 근거에서 기술적 도전 후보를 만들지 못했습니다. 직접 경험한 내용을 추가해보세요.
          </p>
        )}

        <div className="grid gap-3 rounded-xl border border-dashed border-ptop-mint-line bg-ptop-mint-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-extrabold text-ptop-mint-dark">＋</span>
              <strong className="text-sm">내가 생각한 기술적 도전 추가</strong>
            </div>
            <span className="text-xs font-bold text-ptop-muted">선택 입력</span>
          </div>
          <input
            className="min-h-10 rounded-lg border border-ptop-line bg-white px-3 text-sm outline-none focus:border-ptop-mint-dark focus:ring-4 focus:ring-ptop-mint/20"
            value={draft.customChallengeTitle}
            onChange={(event) => updateCustomTitle(event.target.value)}
            placeholder="예: 여러 상태를 하나의 흐름으로 정리하기"
          />
          <textarea
            className="resize-y rounded-lg border border-ptop-line bg-white p-3 text-sm outline-none focus:border-ptop-mint-dark focus:ring-4 focus:ring-ptop-mint/20"
            value={draft.customChallengeNote}
            onChange={(event) =>
              setDraft((current) => ({ ...current, customChallengeNote: event.target.value }))
            }
            placeholder="어떤 상황에서 어려웠는지 한 줄만 적어도 괜찮아요"
            rows={2}
          />
          <button
            className="min-h-10 w-fit rounded-full border border-ptop-line bg-white px-4 text-sm font-bold text-ptop-mint-dark transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={
              !draft.customChallengeTitle.trim() ||
              customChallengeSelected ||
              draft.selectedChallengeTitles.length >= 2
            }
            onClick={addCustomChallenge}
          >
            {customChallengeSelected ? "추가된 도전" : "이 도전 선택하기"}
          </button>
        </div>
      </div>

      {draft.selectedChallengeTitles.length > 0 && (
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ptop-mint-dark text-xs font-extrabold text-white">03</span>
              <h3 className="m-0 inline text-lg">선택한 도전에 맥락을 더해주세요</h3>
            </div>
          </div>
          <p className="m-0 text-sm leading-[1.6] text-ptop-muted">
            포피가 한 번에 하나씩 확인합니다. 모두 답하지 않아도 결과를 확인할 수 있습니다.
          </p>
          {draft.selectedChallengeTitles.map((title) => (
            <ChallengeFollowUp
              key={title}
              title={title}
              answers={draft.challengeAnswers[title]}
              customNote={title === draft.customChallengeTitle ? draft.customChallengeNote : ""}
              onChange={(key, value) => updateChallengeAnswer(title, key, value)}
              onSave={onSave ? () => onSave(draft) : undefined}
            />
          ))}
        </div>
      )}

      <ReflectionOutputPreview draft={draft} />
    </section>
  );
}

function ChallengeOption({
  challenge,
  selected,
  disabled,
  onToggle,
}: {
  challenge: TechnicalChallengeCandidate;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${selected ? "border-ptop-mint-dark bg-ptop-mint-soft" : "border-ptop-line bg-white hover:border-ptop-mint-dark"} disabled:cursor-not-allowed disabled:opacity-50`}
      data-selected={selected}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ptop-line bg-white text-sm font-extrabold text-ptop-mint-dark" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      <span className="grid min-w-0 gap-1">
        <strong className="text-sm">{challenge.title}</strong>
        <span className="text-sm leading-[1.5] text-ptop-muted">{challenge.summary}</span>
        <small className="text-xs text-ptop-muted">
          {challenge.evidence.length}개 근거 · 신뢰도 {getConfidenceLabel(challenge.confidence)}
        </small>
      </span>
    </button>
  );
}

function ChallengeFollowUp({
  title,
  answers,
  customNote,
  onChange,
  onSave,
}: {
  title: string;
  answers: ReflectionChallengeAnswers | undefined;
  customNote: string;
  onChange: (key: keyof ReflectionChallengeAnswers, value: string) => void;
  onSave?: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const prompt = CHALLENGE_FOLLOW_UP_PROMPTS[step] ?? CHALLENGE_FOLLOW_UP_PROMPTS[0];
  const isLastStep = step === CHALLENGE_FOLLOW_UP_PROMPTS.length - 1;

  const saveAnswers = async () => {
    if (!onSave) {
      setSaveStatus("saved");
      setSaveMessage("임시 저장되었습니다.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("서버에 저장하는 중입니다.");

    try {
      await onSave();
      setSaveStatus("saved");
      setSaveMessage("기술적 도전 답변이 서버에 저장되었습니다.");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "답변 저장에 실패했습니다.");
    }
  };

  const handleChange = (key: keyof ReflectionChallengeAnswers, value: string) => {
    setSaveStatus("idle");
    setSaveMessage("");
    onChange(key, value);
  };

  return (
    <div className="grid gap-4 rounded-xl border border-ptop-line bg-white p-4 shadow-ptop-surface">
      <div className="flex items-center gap-3">
        <img className="h-9 w-9 rounded-full bg-ptop-mint-soft object-contain" src={mascotUrl} alt="" />
        <strong className="text-sm">{title}</strong>
      </div>
      {customNote && step === 0 && <p className="m-0 rounded-lg bg-ptop-soft-paper p-3 text-sm text-ptop-muted">내가 남긴 메모: {customNote}</p>}
      <div className="grid gap-1 rounded-xl bg-ptop-mint-soft p-4" aria-live="polite">
        <span className="text-xs font-extrabold text-ptop-mint-dark">포피의 확인 질문</span>
        <strong className="leading-[1.5]">{prompt.label}</strong>
      </div>
      <label className="grid gap-2">
        <span className="absolute h-px w-px overflow-hidden whitespace-nowrap">기술적 도전 회고 답변</span>
        <textarea
          className="min-h-24 w-full resize-y rounded-xl border border-ptop-line bg-ptop-paper p-3 text-sm leading-[1.6] outline-none placeholder:text-ptop-muted focus:border-ptop-mint-dark focus:ring-4 focus:ring-ptop-mint/20"
          value={answers?.[prompt.key] ?? ""}
          onChange={(event) => handleChange(prompt.key, event.target.value)}
          placeholder="한 문장으로 답해도 괜찮아요"
          rows={3}
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="min-h-10 rounded-full border border-ptop-line bg-white px-4 text-sm font-bold text-ptop-muted transition hover:border-ptop-mint-dark disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          이전
        </button>
        <button
          className="min-h-10 rounded-full bg-[var(--button-primary-bg)] px-5 text-sm font-extrabold text-[var(--button-primary-fg)] transition hover:-translate-y-px hover:bg-[var(--button-primary-hover)] disabled:cursor-wait disabled:opacity-60"
          type="button"
          disabled={isLastStep && saveStatus === "saving"}
          onClick={() => {
            if (!isLastStep) {
              setStep((current) => current + 1);
              return;
            }

            void saveAnswers();
          }}
        >
          {isLastStep ? (saveStatus === "saving" ? "저장 중" : "답변 저장") : "다음 질문"}
        </button>
      </div>
      {saveMessage && (
        <p className={`m-0 text-sm ${saveStatus === "error" ? "text-red-700" : "text-ptop-muted"}`} role="status">
          {saveMessage}
        </p>
      )}
    </div>
  );
}

function ReflectionOutputPreview({ draft }: { draft: ReflectionDraft }) {
  const answers = [
    ["시작 이유", draft.motivation],
    ["내 역할", draft.role],
    ["기억나는 문제", draft.memorableProblem],
  ].filter(([, value]) => value.trim());

  return (
    <div className="grid gap-4 rounded-xl border border-ptop-line bg-ptop-soft-paper p-5">
      <div className="flex items-center gap-3">
        <div>
          <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ptop-mint-dark text-xs font-extrabold text-white">04</span>
          <h3 className="m-0 inline text-lg">결과에 반영될 내 경험</h3>
        </div>
      </div>
      {answers.length > 0 || draft.selectedChallengeTitles.length > 0 ? (
        <>
          <dl className="grid gap-3">
            {answers.map(([label, value]) => (
              <div className="grid gap-1 rounded-lg bg-white p-3" key={label}>
                <dt className="text-xs font-bold text-ptop-muted">{label}</dt>
                <dd className="m-0 text-sm leading-[1.6]">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 text-sm leading-[1.6] text-ptop-muted">
            선택한 기술적 도전과 이 메모는 Repository 근거와 함께 최종 포트폴리오 초안에 반영됩니다.
          </p>
        </>
      ) : (
        <p className="m-0 text-sm leading-[1.6] text-ptop-muted">아직 작성한 내용이 없습니다. 필요한 만큼만 포피의 질문에 답해보세요.</p>
      )}
    </div>
  );
}

function getDraftSummary(draft: ReflectionDraft): string {
  const completedCount = [draft.motivation, draft.role, draft.memorableProblem].filter(
    (answer) => answer.trim(),
  ).length;

  if (completedCount === 0) {
    return "작성한 메모는 자동 저장됩니다. 질문을 건너뛰고 결과를 확인해도 괜찮아요.";
  }

  return `공통 회고 질문 ${completedCount}/3개에 답변했습니다. 작성한 내용은 이 Repository에 임시 저장되어 있습니다.`;
}

function getConfidenceLabel(confidence: TechnicalChallengeCandidate["confidence"]): string {
  return { high: "높음", medium: "보통", low: "낮음" }[confidence];
}
