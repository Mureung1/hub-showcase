import { useState } from "react";
import type {
  Chat,
  Provider,
  Question,
  SourceAnswer,
} from "./types";
import { hasIncompleteQuestion, isSourceAnswerSettled } from "./types";
import { getActiveScenario } from "./scenarios";
import type { SourceAnswerEvent } from "./scenarios";
import { mockSectionsByProvider, providerMeta } from "./mockData";

export const QUESTION_MAX_LENGTH = 1000;

/** Chat 제목 = 첫 질문 앞 100자 (고정 정책) */
const CHAT_TITLE_MAX_LENGTH = 100;

interface ChatWorkspaceState {
  chats: Chat[];
  /** null = 새 채팅(첫 진입 빈 화면) */
  activeChatId: string | null;
}

/**
 * Workspace의 Chat·Question 상태를 소유하는 Hook (T-001·T-002 범위: Step 1~3).
 * 저장은 이번 Spec 제외 범위라 상태는 메모리에만 유지되고 새로고침 시 초기화된다.
 */
export function useChatWorkspace() {
  const [state, setState] = useState<ChatWorkspaceState>({
    chats: [],
    activeChatId: null,
  });

  const activeChat =
    state.chats.find((chat) => chat.id === state.activeChatId) ?? null;

  /** 처리 중 여부 — 컴포저 비활성("충돌 해결 중")과 새 채팅 확인 팝업 판단 기준 */
  const isActiveChatBusy = activeChat !== null && hasIncompleteQuestion(activeChat);

  /** 특정 Question을 찾아 갱신한다 (Chat 전환과 무관하게 id로 추적) */
  function updateQuestion(
    chatId: string,
    questionId: string,
    updater: (question: Question) => Question,
  ) {
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              questions: chat.questions.map((question) =>
                question.id === questionId ? updater(question) : question,
              ),
            }
          : chat,
      ),
    }));
  }

  /** 시나리오 이벤트 1건을 SourceAnswer에 적용하고, 3개 모두 최종이면 review_required로 전이 */
  function applySourceAnswerEvent(
    chatId: string,
    questionId: string,
    provider: Provider,
    event: SourceAnswerEvent,
  ) {
    updateQuestion(chatId, questionId, (question) => {
      const sourceAnswers = question.sourceAnswers.map((answer) => {
        if (answer.provider !== provider) {
          return answer;
        }
        return {
          ...answer,
          status: event.status,
          retryCount: event.retryCount ?? answer.retryCount,
          excludedFromComparison:
            event.excludedFromComparison ?? answer.excludedFromComparison,
          sections:
            event.status === "succeeded"
              ? [...mockSectionsByProvider[provider]]
              : answer.sections,
        };
      });

      // 세 Provider가 모두 최종 상태면 Question은 검토 단계로 (0.4 상태 전이)
      const allSettled = sourceAnswers.every(isSourceAnswerSettled);
      return {
        ...question,
        sourceAnswers,
        status:
          allSettled && question.status === "processing"
            ? "review_required"
            : question.status,
      };
    });
  }

  /** 활성 시나리오의 Provider별 타임라인대로 상태 전이를 예약한다 */
  function scheduleSourceAnswerFlow(chatId: string, questionId: string) {
    const scenario = getActiveScenario();
    for (const { id: provider } of providerMeta) {
      for (const event of scenario.providerPlans[provider]) {
        setTimeout(() => {
          applySourceAnswerEvent(chatId, questionId, provider, event);
        }, event.at);
      }
    }
  }

  /**
   * 질문 전송. 전송 순간 Question을 `draft`로 생성하고 즉시 `processing`으로
   * 전이한다 (Step 2-2: draft는 UI상 상태가 아니다).
   * 빈 질문(공백만)과 1000자 초과는 실행하지 않는다.
   */
  function submitQuestion(content: string): boolean {
    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > QUESTION_MAX_LENGTH) {
      return false;
    }

    const sourceAnswers: SourceAnswer[] = providerMeta.map(({ id }) => ({
      id: crypto.randomUUID(),
      provider: id,
      status: "pending",
      retryCount: 0,
      excludedFromComparison: false,
      sections: [],
    }));

    const draft: Question = {
      id: crypto.randomUUID(),
      content: trimmed,
      status: "draft",
      sourceAnswers,
    };
    // 정책 전이 순서 유지: draft → processing (draft는 사용자에게 노출하지 않음)
    const question: Question = { ...draft, status: "processing" };

    let chatId: string;
    if (activeChat === null) {
      chatId = crypto.randomUUID();
      const chat: Chat = {
        id: chatId,
        title: trimmed.slice(0, CHAT_TITLE_MAX_LENGTH),
        questions: [question],
      };
      setState((prev) => ({
        chats: [...prev.chats, chat],
        activeChatId: chatId,
      }));
    } else {
      // 한 Chat에 미완료 Question은 1개만 허용 (고정 정책)
      if (hasIncompleteQuestion(activeChat)) {
        return false;
      }
      chatId = activeChat.id;
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((chat) =>
          chat.id === chatId
            ? { ...chat, questions: [...chat.questions, question] }
            : chat,
        ),
      }));
    }

    scheduleSourceAnswerFlow(chatId, question.id);
    return true;
  }

  /** Chat 전환 — 트랜스크립트와 상태는 그대로 복원된다 (Step 2-4) */
  function selectChat(chatId: string) {
    setState((prev) => ({ ...prev, activeChatId: chatId }));
  }

  /** 새 채팅 — 빈 화면(중앙 컴포저)으로 전환. 기존 Chat과 진행 상태는 유지 (Step 2-3) */
  function startNewChat() {
    setState((prev) => ({ ...prev, activeChatId: null }));
  }

  return {
    chats: state.chats,
    activeChat,
    isActiveChatBusy,
    submitQuestion,
    selectChat,
    startNewChat,
  };
}
