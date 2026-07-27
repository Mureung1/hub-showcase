import { useEffect, useState } from "react";
import {
  loadReflectionDraft,
  REFLECTION_PROMPTS,
  saveReflectionDraft,
  type ReflectionDraft,
} from "./reflection";

type ReflectionDraftEditorProps = {
  repositoryUrl: string;
  isAnalysisComplete?: boolean;
  onChange: (draft: ReflectionDraft) => void;
  onSave?: (draft: ReflectionDraft) => Promise<void>;
};

type CommonReflectionKey =
  | "motivation"
  | "role"
  | "memorableProblem";

const mascotUrl = `${import.meta.env.BASE_URL}assets/PtoP_LogoImage.png`;

export function ReflectionDraftEditor({
  repositoryUrl,
  isAnalysisComplete = false,
  onChange,
  onSave,
}: ReflectionDraftEditorProps) {
  const [draft, setDraft] = useState<ReflectionDraft>(() => loadReflectionDraft(repositoryUrl));
  const [step, setStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const restoredDraft = loadReflectionDraft(repositoryUrl);
    setDraft(restoredDraft);
    setStep(0);
    onChange(restoredDraft);
  }, [onChange, repositoryUrl]);

  useEffect(() => {
    if (!repositoryUrl.trim()) {
      return;
    }

    saveReflectionDraft(repositoryUrl, draft);
    onChange(draft);
  }, [draft, onChange, repositoryUrl]);

  const prompt = REFLECTION_PROMPTS[step] ?? REFLECTION_PROMPTS[0];
  const isLastStep = step === REFLECTION_PROMPTS.length - 1;
  const currentValue = draft[prompt.key];

  const updateAnswer = (value: string) => {
    setSaveStatus("idle");
    setSaveMessage("");
    setDraft((current) => ({ ...current, [prompt.key]: value }));
  };

  const moveNext = () => {
    if (!isLastStep) {
      setStep((current) => current + 1);
    }
  };

  const skipQuestion = () => {
    if (!isLastStep) {
      setStep((current) => current + 1);
    }
  };

  const saveDraft = async () => {
    if (!onSave) {
      setSaveStatus("saved");
      setSaveMessage(
        isAnalysisComplete ? "임시 저장되었습니다." : "분석 완료 후 서버에 저장됩니다.",
      );
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("서버에 저장하는 중입니다.");

    try {
      await onSave(draft);
      setSaveStatus("saved");
      setSaveMessage("회고 메모가 서버에 저장되었습니다.");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "회고 저장에 실패했습니다.");
    }
  };

  return (
    <section className="grid gap-5 rounded-2xl border border-ptop-line bg-white p-5 shadow-ptop-surface sm:p-7" aria-label="포피와 함께 작성하는 회고">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-ptop-mint-dark">With Popy</span>
          <h3 className="mb-0 mt-2 text-xl tracking-[-0.02em]">
            {isAnalysisComplete
              ? "분석이 끝났어요. 포피와 기억을 조금만 더 정리해볼까요?"
              : "분석하는 동안 포피와 프로젝트를 떠올려보세요"}
          </h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${saveStatus === "error" ? "bg-red-50 text-red-700" : saveStatus === "saved" ? "bg-ptop-mint-soft text-ptop-mint-dark" : "bg-ptop-soft-paper text-ptop-muted"}`} aria-live="polite">
          {saveStatus === "saving" ? "서버 저장 중" : saveStatus === "saved" ? "저장 완료" : "자동 임시 저장"}
        </span>
      </div>

      <p className="m-0 text-sm leading-[1.6] text-ptop-muted">
        긴 회고를 한 번에 작성하지 않아도 괜찮아요. 답하지 않고 넘어가도 결과를 확인할 수 있습니다.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(150px,0.35fr)_minmax(0,1fr)]">
        <aside className="grid content-center justify-items-center gap-2 rounded-xl bg-ptop-soft-paper p-5 text-center" aria-label="포피">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-ptop-mint-soft">
            <img className="h-24 w-24 object-contain" src={mascotUrl} alt="포피" />
          </div>
          <strong className="text-base">포피</strong>
          <span className="text-xs text-ptop-muted">기억 도우미</span>
        </aside>

        <div className="grid gap-4 rounded-xl border border-ptop-line p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-ptop-muted">
            <span>프로젝트 메모</span>
            <span>{step + 1} / {REFLECTION_PROMPTS.length}</span>
          </div>
          <div className="grid gap-1 rounded-xl bg-ptop-mint-soft p-4" aria-live="polite">
            <span className="text-xs font-extrabold text-ptop-mint-dark">포피의 질문</span>
            <strong className="leading-[1.5]">{prompt.label}</strong>
          </div>

          <label className="grid gap-2">
            <span className="absolute h-px w-px overflow-hidden whitespace-nowrap">회고 답변</span>
            <textarea
              className="min-h-28 w-full resize-y rounded-xl border border-ptop-line bg-ptop-paper p-3 text-sm leading-[1.6] text-ptop-ink outline-none transition placeholder:text-ptop-muted focus:border-ptop-mint-dark focus:ring-4 focus:ring-ptop-mint/20"
              value={currentValue}
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder="짧게 적어도 괜찮아요"
              rows={4}
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
            {!isLastStep && (
              <button className="min-h-10 rounded-full border border-ptop-line bg-white px-4 text-sm font-bold text-ptop-muted transition hover:border-ptop-mint-dark" type="button" onClick={skipQuestion}>
                건너뛰기
              </button>
            )}
            <button
              className="min-h-10 rounded-full bg-[var(--button-primary-bg)] px-5 text-sm font-extrabold text-[var(--button-primary-fg)] transition hover:-translate-y-px hover:bg-[var(--button-primary-hover)] disabled:cursor-wait disabled:opacity-60"
              type="button"
              disabled={isLastStep && saveStatus === "saving"}
              onClick={isLastStep ? saveDraft : moveNext}
            >
              {isLastStep ? (saveStatus === "saving" ? "저장 중" : "메모 저장") : "다음 질문"}
            </button>
          </div>
          {saveMessage && (
            <p className={`m-0 text-sm ${saveStatus === "error" ? "text-red-700" : "text-ptop-muted"}`} role="status">
              {saveMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2" aria-label={`회고 질문 ${step + 1}단계`}>
        {REFLECTION_PROMPTS.map((item, index) => (
          <span className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-ptop-mint-dark" : "bg-ptop-line"}`} key={item.key} />
        ))}
      </div>
    </section>
  );
}
