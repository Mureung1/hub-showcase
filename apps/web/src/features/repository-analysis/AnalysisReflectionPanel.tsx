import { useEffect, useRef, useState } from "react";
import {
  loadReflectionDraft,
  saveReflectionDraft,
  type ReflectionDraft,
} from "../reflection/reflection";
import {
  canSendReflection,
  canSubmitReflection,
  type ReflectionSaveStatus,
} from "./analysisReflectionState";

type AnalysisReflectionPanelProps = {
  repositoryUrl: string;
  isAnalysisComplete: boolean;
  onChange: (draft: ReflectionDraft) => void;
  onSave?: (draft: ReflectionDraft) => Promise<void>;
  onViewResults?: () => void;
};

const mascotUrl = `${import.meta.env.BASE_URL}assets/mascot/Poppy_PC_Nobg.png`;
const promptKey = "memorableProblem" as const;
const quickAnswers = ["기술적 한계", "일정 조율", "데이터 무결성", "기능 구현"];

export function AnalysisReflectionPanel({
  repositoryUrl,
  isAnalysisComplete,
  onChange,
  onSave,
  onViewResults,
}: AnalysisReflectionPanelProps) {
  const [draft, setDraft] = useState<ReflectionDraft>(() =>
    loadReflectionDraft(repositoryUrl),
  );
  const [saveStatus, setSaveStatus] = useState<ReflectionSaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const saveLockRef = useRef(false);
  const draftVersionRef = useRef(0);

  useEffect(() => {
    const restoredDraft = loadReflectionDraft(repositoryUrl);
    // 후보는 분석 결과 화면에서 현재 세션에 직접 선택한다. 이전 분석의
    // localStorage 초안을 그대로 복원하면 선택하지 않은 후보가 선택 상태로 보인다.
    const draftForCurrentAnalysis: ReflectionDraft = {
      ...restoredDraft,
      postAnalysisReflection: "",
      selectedChallengeTitles: [],
    };

    setDraft(draftForCurrentAnalysis);
    setSaveStatus("idle");
    setSaveMessage("");
    saveLockRef.current = false;
    draftVersionRef.current = 0;
    onChange(draftForCurrentAnalysis);
  }, [onChange, repositoryUrl]);

  useEffect(() => {
    if (!repositoryUrl.trim()) {
      return;
    }

    saveReflectionDraft(repositoryUrl, draft);
    onChange(draft);
  }, [draft, onChange, repositoryUrl]);

  const updateAnswer = (value: string) => {
    draftVersionRef.current += 1;
    if (saveStatus !== "saving") {
      setSaveStatus("idle");
      setSaveMessage("");
    }
    setDraft((current) => ({ ...current, [promptKey]: value }));
  };

  const saveAnswer = async () => {
    const hasQueuedSave = saveStatus === "queued" && onSave;
    if (
      saveLockRef.current ||
      (!canSubmitReflection(saveStatus) && !hasQueuedSave)
    ) {
      return;
    }

    if (!isAnalysisComplete) {
      setSaveStatus("queued");
      setSaveMessage("분석이 끝나면 회고를 Repository 근거와 함께 분석합니다.");
      return;
    }

    if (!draft[promptKey].trim()) {
      setSaveMessage("회고 내용을 한 줄 이상 작성해 주세요.");
      return;
    }

    if (!onSave) {
      return;
    }

    if (!canSubmitReflection(saveStatus) && !hasQueuedSave) {
      return;
    }

    saveLockRef.current = true;
    const draftToSave = draft;
    const saveVersion = draftVersionRef.current;

    setSaveStatus("saving");
    setSaveMessage("회고를 저장하는 중입니다.");

    try {
      await onSave(draftToSave);
      if (saveVersion === draftVersionRef.current) {
        setSaveStatus("saved");
        setSaveMessage(
          "회고를 저장했습니다. 결과 페이지에서 함께 확인할 수 있어요.",
        );
      } else {
        setSaveStatus("idle");
        setSaveMessage("새로 작성한 회고가 있어 다시 전송해 주세요.");
      }
      saveLockRef.current = false;
    } catch (error) {
      saveLockRef.current = false;
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error ? error.message : "회고 저장에 실패했습니다.",
      );
    }
  };

  useEffect(() => {
    if (saveStatus === "queued" && onSave && isAnalysisComplete) {
      void saveAnswer();
    }
  }, [isAnalysisComplete, onSave, saveStatus]);

  return (
    <section
      className="relative grid min-w-0 content-between gap-7 p-6 lg:min-h-[480px]"
      aria-label="분석 중 회고 작성"
    >
      <div className="grid gap-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 grid h-6 w-6 shrink-0 place-items-center border border-[var(--terminal-accent)] font-mono text-xs text-[var(--terminal-accent)]"
            aria-hidden="true"
          >
            &gt;_
          </span>
          <div className="grid gap-2">
            <div className="flex items-baseline gap-3">
              <h3 className="m-0 text-xl font-bold text-[var(--terminal-accent)]">
                Poppy
              </h3>
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--terminal-muted)]">
                insight assistant
              </span>
            </div>
            <p className="m-0 max-w-[576px] text-base font-semibold leading-[1.7] text-[var(--terminal-ink)] sm:text-lg">
              분석하는 동안 궁금한 게 있어!
              <br />이 프로젝트를 진행하면서 가장 해결하기 어려웠던 문제는
              뭐였어?
            </p>
          </div>
        </div>

        <div className="grid gap-2" role="group" aria-label="회고 빠른 선택지">
          <span className="font-mono text-[0.68rem] font-bold tracking-[0.16em] text-[var(--terminal-muted)]">
            QUICK NOTES
          </span>
          <div className="flex flex-wrap gap-2">
            {quickAnswers.map((answer) => (
              <button
                className="border border-[var(--terminal-border)] bg-[#2b3544] px-3 py-2 text-xs font-bold text-[var(--terminal-ink)] transition hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)] focus-visible:outline-2 focus-visible:outline-[var(--terminal-accent)] focus-visible:outline-offset-2"
                key={answer}
                type="button"
                onClick={() => updateAnswer(answer)}
              >
                {answer}
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-2">
          <span className="font-mono text-[0.68rem] font-bold tracking-[0.16em] text-[var(--terminal-muted)]">
            INSIGHT INPUT
          </span>
          <textarea
            className="min-h-32 w-full max-w-[520px] resize-y border-2 border-[#3d4a3e] bg-[var(--terminal-bg)] p-4 text-sm leading-[1.7] text-[var(--terminal-ink)] outline-none transition placeholder:text-[var(--terminal-subtle)] placeholder:opacity-50 focus:border-[var(--terminal-accent)] focus:ring-4 focus:ring-[var(--terminal-accent)]/10"
            value={draft[promptKey]}
            onChange={(event) => updateAnswer(event.target.value)}
            placeholder="어려웠던 경험을 공유해주세요..."
            aria-describedby="analysis-reflection-help"
          />
          <span
            className="text-xs leading-5 text-[var(--terminal-subtle)]"
            id="analysis-reflection-help"
          >
            짧은 메모도 괜찮아요. 분석 결과를 확인할 때 함께 반영됩니다.
          </span>
        </label>
      </div>

      <div className="relative z-20 flex flex-wrap items-center gap-3">
        <button
          className="min-h-11 border-2 border-[var(--terminal-accent)] bg-[var(--terminal-accent)] px-5 font-mono text-sm font-bold text-[#00210c] transition hover:bg-[#8affae] focus-visible:outline-2 focus-visible:outline-[var(--terminal-accent)] focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60"
          type="button"
          onClick={() => void saveAnswer()}
          disabled={
            !canSendReflection(saveStatus, isAnalysisComplete, draft[promptKey])
          }
        >
          {saveStatus === "saving"
            ? "SAVING..."
            : saveStatus === "queued"
              ? "QUEUED"
              : saveStatus === "saved"
                ? "SENT"
                : "SEND  >"}
        </button>
        {isAnalysisComplete && onViewResults && saveStatus === "saved" && (
          <button
            className="min-h-11 border-2 border-[var(--terminal-border)] bg-[#16202e] px-5 text-sm font-bold text-[var(--terminal-ink)] transition hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)] focus-visible:outline-2 focus-visible:outline-[var(--terminal-accent)] focus-visible:outline-offset-2"
            type="button"
            onClick={onViewResults}
          >
            결과 확인하기
          </button>
        )}
        {saveMessage && (
          <span
            className={`text-xs ${saveStatus === "error" ? "text-[#ffd9df]" : "text-[var(--terminal-muted)]"}`}
            role="status"
          >
            {saveMessage}
          </span>
        )}
      </div>

      <img
        className="pointer-events-none absolute bottom-[3.2rem] right-[-6rem] z-10 hidden h-auto w-[414px] max-w-none object-contain object-center sm:block"
        src={mascotUrl}
        alt=""
        aria-hidden="true"
      />

      <div
        className="flex items-center gap-3 text-xs text-[var(--terminal-muted)]"
        aria-live="polite"
      >
        <span className="h-2 w-2 animate-pulse bg-[var(--terminal-accent)]" />
        <span>
          {isAnalysisComplete ? "ANALYSIS READY" : "ANALYZING REPOSITORY..."}
        </span>
        <span className="ml-auto font-mono">
          {isAnalysisComplete ? "100%" : "PROCESSING"}
        </span>
      </div>
    </section>
  );
}
