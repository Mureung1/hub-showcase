import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ChatComposer } from "@astryxdesign/core/Chat";
import { providerMeta } from "./mockData";
import { QUESTION_MAX_LENGTH } from "./useChatWorkspace";
import "./chat.css";

interface QuestionComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** 미완료 Question 처리 중 — 입력창 비활성 + 전송 버튼 "충돌 해결 중" (Step 2-5) */
  isBusy: boolean;
}

/** 컴포저: 모델 뱃지(위) + 입력창·전송(아래). Enter 전송, Shift+Enter 줄바꿈 (Step 1-1, 2-1) */
export function QuestionComposer({
  value,
  onChange,
  onSubmit,
  isBusy,
}: QuestionComposerProps) {
  const trimmedLength = value.trim().length;
  const isOverLimit = trimmedLength > QUESTION_MAX_LENGTH;
  const canSend = !isBusy && trimmedLength > 0 && !isOverLimit;

  function handleSubmit(submitted: string) {
    if (!canSend) {
      return;
    }
    onSubmit(submitted);
  }

  return (
    <div className="question-composer">
      <div className="model-badge-row">
        {providerMeta.map((provider) => (
          <Badge
            key={provider.id}
            label={provider.label}
            icon={
              <span
                className="model-dot"
                style={{ background: `var(--model-${provider.id})` }}
              />
            }
          />
        ))}
      </div>
      <ChatComposer
        value={value}
        onChange={onChange}
        onSubmit={handleSubmit}
        isDisabled={isBusy}
        placeholder="질문을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
        status={
          isOverLimit
            ? {
                type: "error",
                message: `질문은 ${QUESTION_MAX_LENGTH}자 이내로 입력해주세요.`,
              }
            : undefined
        }
        sendButton={
          <Button
            label={isBusy ? "충돌 해결 중" : "전송"}
            variant="primary"
            isDisabled={!canSend}
            onClick={() => handleSubmit(value)}
          />
        }
      />
    </div>
  );
}
