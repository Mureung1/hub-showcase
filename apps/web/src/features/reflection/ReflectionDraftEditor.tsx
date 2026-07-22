import { useEffect, useState } from "react";
import {
  loadReflectionDraft,
  REFLECTION_PROMPTS,
  saveReflectionDraft,
  type ReflectionDraft,
} from "./reflection";

type ReflectionDraftEditorProps = {
  repositoryUrl: string;
  onChange: (draft: ReflectionDraft) => void;
};

type CommonReflectionKey =
  | "motivation"
  | "role"
  | "memorableProblem"
  | "attempts"
  | "improvement";

export function ReflectionDraftEditor({
  repositoryUrl,
  onChange,
}: ReflectionDraftEditorProps) {
  const [draft, setDraft] = useState<ReflectionDraft>(() => loadReflectionDraft(repositoryUrl));

  useEffect(() => {
    const restoredDraft = loadReflectionDraft(repositoryUrl);
    setDraft(restoredDraft);
    onChange(restoredDraft);
  }, [onChange, repositoryUrl]);

  useEffect(() => {
    if (!repositoryUrl.trim()) {
      return;
    }

    saveReflectionDraft(repositoryUrl, draft);
    onChange(draft);
  }, [draft, onChange, repositoryUrl]);

  const updateAnswer = (key: CommonReflectionKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="reflection-draft-editor" aria-label="분석 중 회고 작성">
      <div className="reflection-draft-heading">
        <div>
          <span className="section-label">While we analyze</span>
          <h3>분석하는 동안 프로젝트 기억을 꺼내보세요</h3>
        </div>
        <span className="reflection-save-status">자동 임시 저장</span>
      </div>
      <p className="reflection-draft-description">
        분석 결과가 나오기 전에는 정답을 찾기보다, 떠오르는 경험을 편하게 적어주세요.
      </p>

      <div className="reflection-question-grid">
        {REFLECTION_PROMPTS.map((prompt) => (
          <label className="reflection-question" key={prompt.key}>
            <span>{prompt.label}</span>
            <textarea
              value={draft[prompt.key]}
              onChange={(event) => updateAnswer(prompt.key, event.target.value)}
              placeholder="짧게 적어도 괜찮아요"
              rows={3}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
