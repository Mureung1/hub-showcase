import { useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import {
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from "@astryxdesign/core/Chat";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import type { Agenda, AgendaResolutionReason, Chat, Question } from "./types";
import { AnswerCard } from "./AnswerCard";
import { AnswersModal } from "./AnswersModal";
import { ConflictResolveModal } from "./ConflictResolveModal";
import { emptyStateGreeting, exampleQuestions } from "./mockData";
import { QuestionComposer } from "./QuestionComposer";
import { SourceAnswerLoadingBubble } from "./SourceAnswerLoadingBubble";
import "./chat.css";

/** 제거 애니메이션(.conflict-item.removing)과 맞춘 시간 (Step 5-5) */
const CONFLICT_REMOVE_ANIMATION_MS = 280;

/** 토스트 자동 소멸까지의 시간 (Step 6 R5 — 표시 후 약 2초 뒤 자동 소멸) */
const TOAST_AUTO_HIDE_MS = 2000;

type UserResolutionReason = Exclude<
  AgendaResolutionReason,
  null | "auto_consensus"
>;

interface ChatCenterProps {
  /** null이면 첫 진입(새 채팅) 빈 화면을 표시한다 */
  activeChat: Chat | null;
  isBusy: boolean;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSubmitQuestion: (value: string) => void;
  onResolveAgenda: (
    chatId: string,
    questionId: string,
    agendaId: string,
    resolutionReason: UserResolutionReason,
    selectedContent: string | null,
  ) => void;
  onRequestRecheck: (
    chatId: string,
    questionId: string,
    agendaId: string,
    recheckRequest: string,
  ) => void;
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
  onResolveAgenda,
  onRequestRecheck,
}: ChatCenterProps) {
  const toast = useToast();
  // "AI 별 답변 보기" 모달이 열람 중인 Question id (null = 닫힘)
  const [answersModalQuestionId, setAnswersModalQuestionId] = useState<
    string | null
  >(null);
  // 충돌 해소 모달이 열람 중인 Agenda id (null = 닫힘)
  const [resolvingAgendaId, setResolvingAgendaId] = useState<string | null>(
    null,
  );
  // 제거 애니메이션 중인 Agenda id 목록 — 애니메이션이 끝난 뒤 상태를 전이한다
  const [removingAgendaIds, setRemovingAgendaIds] = useState<
    ReadonlySet<string>
  >(new Set());
  // ChatLayout root(=자체 스크롤 컨테이너)에 연결하는 로컬 ref (Step 8 R5)
  const layoutRef = useRef<HTMLDivElement>(null);

  // completed Question 수 — 증가 시점이 곧 completed 전환 시점이다.
  // FinalAnswer 생성·노트 저장·completed 전환은 useChatWorkspace에서 같은 갱신에 일어나므로,
  // 이 값이 늘어난 렌더의 트랜스크립트에는 이미 FinalAnswer 카드가 그려져 있다.
  const completedCount =
    activeChat === null
      ? 0
      : activeChat.questions.filter((question) => question.status === "completed")
          .length;

  // Step 8 R5: Question이 completed로 전환되면 중앙 트랜스크립트를 부드럽게 최하단으로
  // 1회 이동해 FinalAnswer 하단과 재활성화된 입력창이 보이게 한다. completedCount 증가
  // 시점에만 실행하므로 이후 사용자의 수동 스크롤은 방해하지 않는다.
  // (R4 노트 패널 자동 스크롤과 같은 로컬 ref + 상태 전환 시점 effect 패턴)
  useEffect(() => {
    const layout = layoutRef.current;
    if (layout) {
      layout.scrollTo({ top: layout.scrollHeight, behavior: "smooth" });
    }
  }, [completedCount]);

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

  // 함수 선언 내부에서는 TS narrowing이 유지되지 않으므로 non-null 확정 후 캡처한다
  const activeChatId = activeChat.id;

  const answersModalQuestion =
    activeChat.questions.find(
      (question) => question.id === answersModalQuestionId,
    ) ?? null;

  // 해소 모달 대상 — 재검토 진행 등 최신 상태가 반영되도록 매 렌더 시 다시 찾는다
  const resolving = ((): { question: Question; agenda: Agenda } | null => {
    if (resolvingAgendaId === null) {
      return null;
    }
    for (const question of activeChat.questions) {
      const agenda = question.agendas.find((a) => a.id === resolvingAgendaId);
      if (agenda) {
        return { question, agenda };
      }
    }
    return null;
  })();

  /** 판단 확정: 모달 닫기 → 토스트 → 제거 애니메이션 → 상태 전이(카운터 감소) */
  function finalizeResolution(
    question: Question,
    agendaId: string,
    resolutionReason: UserResolutionReason,
    selectedContent: string | null,
  ) {
    const isRejected =
      resolutionReason === "user_rejected" ||
      resolutionReason === "user_rejected_after_recheck";
    setResolvingAgendaId(null);
    toast({
      body: isRejected
        ? "Agenda를 최종 답변에서 제외했습니다"
        : "Agenda가 채택되었습니다",
      // Step 6 R5: 표시 후 약 2초 뒤 자동 소멸
      autoHideDuration: TOAST_AUTO_HIDE_MS,
    });
    setRemovingAgendaIds((prev) => new Set(prev).add(agendaId));
    setTimeout(() => {
      onResolveAgenda(
        activeChatId,
        question.id,
        agendaId,
        resolutionReason,
        selectedContent,
      );
      setRemovingAgendaIds((prev) => {
        const next = new Set(prev);
        next.delete(agendaId);
        return next;
      });
    }, CONFLICT_REMOVE_ANIMATION_MS);
  }

  return (
    <div className="chat-transcript-fill">
      <ChatLayout
        key={activeChat.id}
        ref={layoutRef}
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
          } else if (
            question.status === "review_required" ||
            question.status === "completed"
          ) {
            // Step 3-4: 세 Provider가 최종 상태가 되면 로딩 말풍선을 답변 카드로 즉시 교체.
            // 답변 카드: 충돌 지점 리스트 + 자동 통과 접힘 요약 (Step 5).
            // completed 이후에도 카드(FinalAnswer 포함)는 트랜스크립트에 남는다 (Step 8-4).
            messages.push(
              <ChatMessage key={`${question.id}-answer`} sender="assistant">
                <ChatMessageBubble>
                  <AnswerCard
                    question={question}
                    removingAgendaIds={removingAgendaIds}
                    onOpenAnswers={() => setAnswersModalQuestionId(question.id)}
                    onResolveClick={(agendaId) =>
                      setResolvingAgendaId(agendaId)
                    }
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
      {resolving && (
        <ConflictResolveModal
          agenda={resolving.agenda}
          onClose={() => setResolvingAgendaId(null)}
          onAcceptStance={(stanceText) =>
            finalizeResolution(
              resolving.question,
              resolving.agenda.id,
              resolving.agenda.status === "reanswered"
                ? "user_accepted_after_recheck"
                : "user_accepted",
              stanceText,
            )
          }
          onAcceptRecheck={() =>
            finalizeResolution(
              resolving.question,
              resolving.agenda.id,
              "user_accepted_after_recheck",
              resolving.agenda.recheckResult,
            )
          }
          onCompose={(text) =>
            finalizeResolution(
              resolving.question,
              resolving.agenda.id,
              resolving.agenda.status === "reanswered"
                ? "user_composed_after_recheck"
                : "user_composed",
              text,
            )
          }
          onReject={() =>
            finalizeResolution(
              resolving.question,
              resolving.agenda.id,
              resolving.agenda.status === "reanswered"
                ? "user_rejected_after_recheck"
                : "user_rejected",
              null,
            )
          }
          onRecheck={(request) =>
            onRequestRecheck(
              activeChat.id,
              resolving.question.id,
              resolving.agenda.id,
              request,
            )
          }
        />
      )}
    </div>
  );
}
