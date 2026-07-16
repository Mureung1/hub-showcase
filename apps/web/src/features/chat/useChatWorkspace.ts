import { useState } from "react";
import type { Chat, Question } from "./types";
import { hasIncompleteQuestion } from "./types";

export const QUESTION_MAX_LENGTH = 1000;

/** Chat 제목 = 첫 질문 앞 100자 (고정 정책) */
const CHAT_TITLE_MAX_LENGTH = 100;

interface ChatWorkspaceState {
  chats: Chat[];
  /** null = 새 채팅(첫 진입 빈 화면) */
  activeChatId: string | null;
}

/**
 * Workspace의 Chat·Question 상태를 소유하는 Hook (T-001 범위: Step 1·2).
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

    const draft: Question = {
      id: crypto.randomUUID(),
      content: trimmed,
      status: "draft",
    };
    // 정책 전이 순서 유지: draft → processing (draft는 사용자에게 노출하지 않음)
    const question: Question = { ...draft, status: "processing" };

    if (activeChat === null) {
      const chat: Chat = {
        id: crypto.randomUUID(),
        title: trimmed.slice(0, CHAT_TITLE_MAX_LENGTH),
        questions: [question],
      };
      setState((prev) => ({
        chats: [...prev.chats, chat],
        activeChatId: chat.id,
      }));
      return true;
    }

    // 한 Chat에 미완료 Question은 1개만 허용 (고정 정책)
    if (hasIncompleteQuestion(activeChat)) {
      return false;
    }
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((chat) =>
        chat.id === activeChat.id
          ? { ...chat, questions: [...chat.questions, question] }
          : chat,
      ),
    }));
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
