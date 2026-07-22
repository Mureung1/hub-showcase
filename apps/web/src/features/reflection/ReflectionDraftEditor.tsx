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
    <section className="reflection-draft-editor" aria-label="포피와 함께 작성하는 회고">
      <div className="reflection-draft-heading">
        <div>
          <span className="section-label">With Popy</span>
          <h3>
            {isAnalysisComplete
              ? "분석이 끝났어요. 포피와 기억을 조금만 더 정리해볼까요?"
              : "분석하는 동안 포피와 프로젝트를 떠올려보세요"}
          </h3>
        </div>
        <span className={`reflection-save-status is-${saveStatus}`} aria-live="polite">
          {saveStatus === "saving" ? "서버 저장 중" : saveStatus === "saved" ? "저장 완료" : "자동 임시 저장"}
        </span>
      </div>

      <p className="reflection-draft-description">
        긴 회고를 한 번에 작성하지 않아도 괜찮아요. 답하지 않고 넘어가도 결과를 확인할 수 있습니다.
      </p>

      <div className="reflection-conversation">
        <aside className="reflection-mascot-panel" aria-label="포피">
          <div className="reflection-mascot-image">
            <img src={mascotUrl} alt="포피" />
          </div>
          <strong>포피</strong>
          <span>기억 도우미</span>
        </aside>

        <div className="reflection-chat-panel">
          <div className="reflection-chat-meta">
            <span>프로젝트 메모</span>
            <span>{step + 1} / {REFLECTION_PROMPTS.length}</span>
          </div>
          <div className="reflection-chat-bubble" aria-live="polite">
            <span>포피의 질문</span>
            <strong>{prompt.label}</strong>
          </div>

          <label className="reflection-question">
            <span className="sr-only">회고 답변</span>
            <textarea
              value={currentValue}
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder="짧게 적어도 괜찮아요"
              rows={4}
            />
          </label>

          <div className="reflection-chat-actions">
            <button
              className="reflection-secondary-button"
              type="button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              이전
            </button>
            {!isLastStep && (
              <button className="reflection-secondary-button" type="button" onClick={skipQuestion}>
                건너뛰기
              </button>
            )}
            <button
              className="reflection-next-button"
              type="button"
              disabled={isLastStep && saveStatus === "saving"}
              onClick={isLastStep ? saveDraft : moveNext}
            >
              {isLastStep ? (saveStatus === "saving" ? "저장 중" : "메모 저장") : "다음 질문"}
            </button>
          </div>
          {saveMessage && (
            <p className={`reflection-save-message is-${saveStatus}`} role="status">
              {saveMessage}
            </p>
          )}
        </div>
      </div>

      <div className="reflection-progress" aria-label={`회고 질문 ${step + 1}단계`}>
        {REFLECTION_PROMPTS.map((item, index) => (
          <span className={index <= step ? "is-active" : ""} key={item.key} />
        ))}
      </div>
    </section>
  );
}
