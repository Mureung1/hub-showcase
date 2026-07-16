import { Button } from "@astryxdesign/core/Button";
import {
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from "@astryxdesign/core/Chat";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import type { Chat } from "./types";
import { emptyStateGreeting, exampleQuestions } from "./mockData";
import { QuestionComposer } from "./QuestionComposer";
import "./chat.css";

interface ChatCenterProps {
  /** null이면 첫 진입(새 채팅) 빈 화면을 표시한다 */
  activeChat: Chat | null;
  isBusy: boolean;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSubmitQuestion: (value: string) => void;
}

/**
 * Center 영역. Chat이 없으면 중앙 정렬 빈 화면(인사 문구 + 컴포저 + 예시 질문 칩),
 * Chat이 있으면 채팅형 트랜스크립트 + 하단 고정 컴포저 (Step 1-1, 1-3).
 */
export function ChatCenter({
  activeChat,
  isBusy,
  composerValue,
  onComposerChange,
  onSubmitQuestion,
}: ChatCenterProps) {
  if (activeChat === null) {
    return (
      <div className="chat-empty-center">
        <Text type="display-3" as="p" justify="center">
          {emptyStateGreeting}
        </Text>
        <QuestionComposer
          value={composerValue}
          onChange={onComposerChange}
          onSubmit={onSubmitQuestion}
          isBusy={false}
        />
        <div className="example-question-list">
          {exampleQuestions.map((question) => (
            <Button
              key={question}
              label={question}
              variant="ghost"
              size="sm"
              onClick={() => onComposerChange(question)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-transcript-fill">
      <ChatLayout
        key={activeChat.id}
        composer={
        <QuestionComposer
          value={composerValue}
          onChange={onComposerChange}
          onSubmit={onSubmitQuestion}
          isBusy={isBusy}
        />
      }
    >
      <ChatMessageList>
        {activeChat.questions.flatMap((question) => {
          const messages = [
            <ChatMessage key={question.id} sender="user">
              <ChatMessageBubble>{question.content}</ChatMessageBubble>
            </ChatMessage>,
          ];
          if (question.status === "processing") {
            // T-002(Step 3)에서 Provider 3줄 상태 표시로 대체되는 임시 로딩 말풍선
            messages.push(
              <ChatMessage key={`${question.id}-loading`} sender="assistant">
                <ChatMessageBubble>
                  <span className="answer-loading">
                    <Spinner size="sm" />
                    <Text type="supporting" color="secondary">
                      여러 AI 답변을 비교하는 중…
                    </Text>
                  </span>
                </ChatMessageBubble>
              </ChatMessage>,
            );
          }
          return messages;
        })}
      </ChatMessageList>
      </ChatLayout>
    </div>
  );
}
