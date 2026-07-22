import { useEffect, useState } from "react";
import type { RepositoryAnalysisResult, TechnicalChallengeCandidate } from "@ptop/contracts";
import {
  addSelectedChallenge,
  CHALLENGE_FOLLOW_UP_PROMPTS,
  saveReflectionDraft,
  type ReflectionChallengeAnswers,
  type ReflectionDraft,
} from "./reflection";

type ReflectionWorkspaceProps = {
  result: RepositoryAnalysisResult;
  initialDraft: ReflectionDraft;
};

export function ReflectionWorkspace({ result, initialDraft }: ReflectionWorkspaceProps) {
  const [draft, setDraft] = useState(initialDraft);
  const challenges = result.analysis.technicalChallenges;

  useEffect(() => {
    saveReflectionDraft(result.repository.url, draft);
  }, [draft, result.repository.url]);

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

  return (
    <section className="reflection-workspace" aria-label="회고 확장 작업공간">
      <header className="reflection-workspace-heading">
        <div>
          <span className="section-label">From evidence to reflection</span>
          <h2>분석 결과에 나의 경험을 더해보세요</h2>
        </div>
        <span className="reflection-save-status">이 Repository에 자동 저장</span>
      </header>

      <div className="reflection-memory-summary">
        <div>
          <span className="reflection-step">01</span>
          <strong>분석 중 작성한 회고</strong>
        </div>
        <p>{getDraftSummary(draft)}</p>
      </div>

      <div className="reflection-challenge-section">
        <div className="reflection-section-heading">
          <div>
            <span className="reflection-step">02</span>
            <h3>회고할 기술적 도전을 선택하세요</h3>
          </div>
          <span>{draft.selectedChallengeTitles.length}/2 선택</span>
        </div>
        <p className="reflection-section-description">
          AI의 제안은 후보일 뿐입니다. 실제로 경험한 문제를 선택하거나, 다음 단계에서 직접 맥락을 보완해 주세요.
        </p>

        {challenges.length > 0 ? (
          <div className="reflection-challenge-list">
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
          <p className="reflection-empty-state">
            현재 분석 근거에서 기술적 도전 후보를 만들지 못했습니다. 아래에 직접 경험을 기록할 수 있도록 준비 중입니다.
          </p>
        )}
      </div>

      {draft.selectedChallengeTitles.length > 0 && (
        <div className="reflection-follow-up-section">
          <div className="reflection-section-heading">
            <div>
              <span className="reflection-step">03</span>
              <h3>선택한 도전에 맥락을 더해주세요</h3>
            </div>
          </div>
          <p className="reflection-section-description">
            이 답변은 Repository 근거와 함께 AI 초안 생성에 사용됩니다.
          </p>
          {draft.selectedChallengeTitles.map((title) => (
            <div className="reflection-follow-up-card" key={title}>
              <strong>{title}</strong>
              {CHALLENGE_FOLLOW_UP_PROMPTS.map((prompt) => (
                <label className="reflection-question" key={prompt.key}>
                  <span>{prompt.label}</span>
                  <textarea
                    value={draft.challengeAnswers[title]?.[prompt.key] ?? ""}
                    onChange={(event) =>
                      updateChallengeAnswer(title, prompt.key, event.target.value)
                    }
                    placeholder="내가 실제로 경험한 내용을 적어주세요"
                    rows={3}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
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
      className="reflection-challenge-option"
      data-selected={selected}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="reflection-option-marker" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      <span className="reflection-option-content">
        <strong>{challenge.title}</strong>
        <span>{challenge.summary}</span>
        <small>
          {challenge.evidence.length}개 근거 · 신뢰도 {getConfidenceLabel(challenge.confidence)}
        </small>
      </span>
    </button>
  );
}

function getDraftSummary(draft: ReflectionDraft): string {
  const completedCount = [
    draft.motivation,
    draft.role,
    draft.memorableProblem,
    draft.attempts,
    draft.improvement,
  ].filter((answer) => answer.trim()).length;

  if (completedCount === 0) {
    return "분석 중 작성한 메모가 아직 없습니다. 분석 결과를 확인한 뒤에도 언제든 작성할 수 있습니다.";
  }

  return `공통 회고 질문 ${completedCount}/5개에 답변했습니다. 작성한 내용은 이 Repository에 임시 저장되어 있습니다.`;
}

function getConfidenceLabel(confidence: TechnicalChallengeCandidate["confidence"]): string {
  return { high: "높음", medium: "보통", low: "낮음" }[confidence];
}
