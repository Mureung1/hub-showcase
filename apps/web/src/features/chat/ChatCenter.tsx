import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import {
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from "@astryxdesign/core/Chat";
import { Text } from "@astryxdesign/core/Text";
import type { Chat } from "./types";
import { AnswerCard } from "./AnswerCard";
import { AnswersModal } from "./AnswersModal";
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
  // "AI 별 답변 보기" 모달이 열람 중인 Question id (null = 닫힘)
  const [answersModalQuestionId, setAnswersModalQuestionId] = useState<
    string | null
  >(null);

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

  const answersModalQuestion =
    activeChat.questions.find(
      (question) => question.id === answersModalQuestionId,
    ) ?? null;

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
            // 답변 카드: 충돌 지점 리스트 + 자동 통과 접힘 요약 (Step 5).
            messages.push(
              <ChatMessage key={`${question.id}-answer`} sender="assistant">
                <ChatMessageBubble>
                  <AnswerCard
                    question={question}
                    onOpenAnswers={() => setAnswersModalQuestionId(question.id)}
                    onResolveClick={() => {
                      // 충돌 해소 팝업은 T-005에서 연결한다 — 현재는 동작 없음
                    }}
                  />
                </ChatMessageBubble>
              </ChatMessage>,
            );
          }
          return messages;
        })}
      </ChatMessageList>
      </ChatLayout>
      {answersModalQuestion && (
        <AnswersModal
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setAnswersModalQuestionId(null);
            }
          }}
          sourceAnswers={answersModalQuestion.sourceAnswers}
        />
      )}
    </div>
  );
}
