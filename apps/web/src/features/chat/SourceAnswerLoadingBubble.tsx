import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import type { SourceAnswer, SourceAnswerStatus } from "./types";
import { providerMeta } from "./mockData";
import "./chat.css";

/** Step 3-2 확정: pending=회색 점, processing=스피너, succeeded=초록 체크, failed=빨간 ✕ */
function StatusIndicator({ status }: { status: SourceAnswerStatus }) {
  switch (status) {
    case "pending":
      return <span className="sa-status-dot" aria-label="대기 중" />;
    case "processing":
      return <Spinner size="sm" />;
    case "succeeded":
      return (
        <span className="sa-status-check" aria-label="성공">
          ✓
        </span>
      );
    case "failed":
      return (
        <span className="sa-status-fail" aria-label="실패">
          ✕
        </span>
      );
  }
}

interface SourceAnswerLoadingBubbleProps {
  sourceAnswers: SourceAnswer[];
}

/**
 * Question 처리 중 로딩 말풍선 (Step 3-1 확정, a안).
 * Claude·ChatGPT·Gemini 3줄이 세로로 각자의 상태를 표시한다.
 * 각 줄 = 모델 식별 색 점 + 이름 + 상태 표시.
 */
export function SourceAnswerLoadingBubble({
  sourceAnswers,
}: SourceAnswerLoadingBubbleProps) {
  return (
    <div className="sa-loading-list">
      {providerMeta.map(({ id, label }) => {
        const answer = sourceAnswers.find((a) => a.provider === id);
        if (!answer) {
          return null;
        }
        return (
          <div className="sa-loading-row" key={id}>
            <span
              className="model-dot"
              style={{ background: `var(--model-${id})` }}
            />
            <Text type="label">{label}</Text>
            <span className="sa-loading-status">
              <StatusIndicator status={answer.status} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
