import { Button } from "@astryxdesign/core/Button";
import {
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from "@astryxdesign/core/Chat";
import { Text } from "@astryxdesign/core/Text";
import type { Chat } from "./types";
import { emptyStateGreeting, exampleQuestions } from "./mockData";
import { QuestionComposer } from "./QuestionComposer";
import { SourceAnswerLoadingBubble } from "./SourceAnswerLoadingBubble";
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
            // Step 3: 로딩 말풍선 안에 Provider 3줄 상태 표시
            messages.push(
              <ChatMessage key={`${question.id}-loading`} sender="assistant">
                <ChatMessageBubble>
                  <SourceAnswerLoadingBubble
                    sourceAnswers={question.sourceAnswers}
                  />
                </ChatMessageBubble>
              </ChatMessage>,
            );
          } else if (question.status === "review_required") {
            // Step 3-4: 세 Provider가 최종 상태가 되면 로딩 말풍선을 답변 카드로 즉시 교체.
            // 카드 내용(충돌 리스트·Agenda)은 T-003~T-004에서 구현한다 (placeholder).
            messages.push(
              <ChatMessage key={`${question.id}-answer`} sender="assistant">
                <ChatMessageBubble>
                  <div className="answer-card-placeholder">
                    <Text type="label" as="p">
                      AI 답변 비교가 완료되었습니다.
                    </Text>
                    <Text type="supporting" color="secondary" as="p">
                      충돌 지점 리스트와 AI 별 답변 보기는 다음 단계(T-003~T-004)에서
                      제공됩니다.
                    </Text>
                  </div>
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
