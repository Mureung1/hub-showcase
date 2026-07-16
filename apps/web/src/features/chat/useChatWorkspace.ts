import { useState } from "react";
import type {
  Agenda,
  AgendaResolutionReason,
  Chat,
  FinalAnswer,
  Provider,
  Question,
  SourceAnswer,
} from "./types";
import { hasIncompleteQuestion, isSourceAnswerSettled } from "./types";
import { getActiveScenario } from "./scenarios";
import type { SourceAnswerEvent } from "./scenarios";
import {
  allRejectedFinalAnswerContent,
  mockAgendaTemplates,
  mockFinalAnswerContent,
  mockSectionsByProvider,
  providerMeta,
} from "./mockData";

export const QUESTION_MAX_LENGTH = 1000;

/** Chat 제목 = 첫 질문 앞 100자 (고정 정책) */
const CHAT_TITLE_MAX_LENGTH = 100;

/** Mock 재검색 연출 시간 */
const RECHECK_MOCK_DELAY_MS = 1200;

interface ChatWorkspaceState {
  chats: Chat[];
  /** null = 새 채팅(첫 진입 빈 화면) */
  activeChatId: string | null;
}

/**
 * Mock Manager 비교 결과 생성. 성공한 SourceAnswer의 입장만 근거로 포함하고
 * (근거 없는 비교 결과를 정상 데이터로 저장하지 않는다), stance의 sourceRefs는
 * 실제 SourceAnswer id와 Mock Section의 sectionId를 참조한다.
 * Consensus는 draft → passed(auto_consensus)로 즉시 전이하며 selectedContent를 가진다 (고정 정책).
 * draft는 UI에 노출하지 않는다.
 */
function buildMockAgendas(sourceAnswers: SourceAnswer[]): Agenda[] {
  const succeededByProvider = new Map(
    sourceAnswers
      .filter((answer) => answer.status === "succeeded")
      .map((answer) => [answer.provider, answer]),
  );

  return mockAgendaTemplates.map((template) => {
    const stances = template.stances
      .filter((stance) => succeededByProvider.has(stance.provider))
      .map((stance) => ({
        provider: stance.provider,
        text: stance.text,
        sourceRefs: stance.sectionIds.map((sectionId) => ({
          sourceAnswerId: succeededByProvider.get(stance.provider)!.id,
          sectionId,
        })),
      }));

    const draft: Agenda = {
      id: crypto.randomUUID(),
      status: "draft",
      resolutionReason: null,
      title: template.title,
      summary: template.summary,
      stances,
      selectedContent: null,
      recheckResult: null,
    };

    if (template.kind === "consensus") {
      // draft → passed(auto_consensus): Consensus Agenda 자동 통과
      return {
        ...draft,
        status: "passed" as const,
        resolutionReason: "auto_consensus" as const,
        selectedContent: template.selectedContent,
      };
    }
    // draft → conflicted: 사용자 판단 대기
    return { ...draft, status: "conflicted" as const };
  });
}

/**
 * Mock FinalAnswer 생성 (Step 7). Question당 1회, 재생성 없음 (고정 정책).
 * 사용자 판단 Agenda(Conflict)가 전부 rejected면 별도 생성 연출 없이 고정 문구를
 * all_agendas_rejected 모드로 반환한다 (AC-5).
 */
function buildMockFinalAnswer(
  agendas: Agenda[],
  sourceAnswers: SourceAnswer[],
): FinalAnswer {
  const userJudged = agendas.filter(
    (agenda) => agenda.resolutionReason !== "auto_consensus",
  );
  const isAllRejected =
    userJudged.length > 0 &&
    userJudged.every((agenda) => agenda.status === "rejected");
  if (isAllRejected) {
    return {
      content: allRejectedFinalAnswerContent,
      generationMode: "all_agendas_rejected",
    };
  }

  const succeededCount = sourceAnswers.filter(
    (answer) => answer.status === "succeeded",
  ).length;
  return {
    content: mockFinalAnswerContent,
    // 성공한 SourceAnswer가 1개면 단일 소스 기반 (Step 7-4, T-009 시나리오에서 사용)
    generationMode:
      succeededCount === 1 ? "single_source_fallback" : "multi_source",
  };
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

      // 세 Provider가 모두 최종 상태면 Mock Manager 결과(Agenda)를 만들고
      // Question은 검토 단계로 전이한다 (0.4 상태 전이)
      const allSettled = sourceAnswers.every(isSourceAnswerSettled);
      const startsReview = allSettled && question.status === "processing";
      return {
        ...question,
        sourceAnswers,
        agendas: startsReview ? buildMockAgendas(sourceAnswers) : question.agendas,
        status: startsReview ? "review_required" : question.status,
      };
    });
  }

  /**
   * Conflict Agenda 사용자 판단 반영 (Step 5·6 상태 전이).
   * resolutionReason이 user_rejected 계열이면 rejected, 그 외에는 passed가 되며
   * passed에는 채택된 selectedContent를 저장한다.
   * 해소 팝업(T-005)에서 호출한다 — 제거 애니메이션은 UI 계층에서 처리 후 호출.
   */
  function resolveAgenda(
    chatId: string,
    questionId: string,
    agendaId: string,
    resolutionReason: Exclude<AgendaResolutionReason, null | "auto_consensus">,
    selectedContent: string | null,
  ) {
    const isRejected =
      resolutionReason === "user_rejected" ||
      resolutionReason === "user_rejected_after_recheck";
    updateQuestion(chatId, questionId, (question) => {
      const agendas = question.agendas.map((agenda) =>
        agenda.id === agendaId
          ? {
              ...agenda,
              status: isRejected ? ("rejected" as const) : ("passed" as const),
              resolutionReason,
              selectedContent: isRejected ? null : selectedContent,
            }
          : agenda,
      );

      // 모든 Agenda가 passed/rejected면 FinalAnswer 자동 생성 (Step 7, 1회만)
      const allFinal =
        agendas.length > 0 &&
        agendas.every(
          (agenda) =>
            agenda.status === "passed" || agenda.status === "rejected",
        );
      const finalAnswer =
        allFinal && question.finalAnswer === null
          ? buildMockFinalAnswer(agendas, question.sourceAnswers)
          : question.finalAnswer;

      return { ...question, agendas, finalAnswer };
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
      agendas: [],
      finalAnswer: null,
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

  /**
   * 재검토 요청 (Step 6-4·6-5, Agenda당 1회).
   * conflicted → recheck_requested로 전이하고, Mock 딜레이 후 reanswered와 함께
   * 재검색 결과(recheckResult)를 채운다. 재검토 후 확정은 *_after_recheck reason을 쓴다.
   */
  function requestRecheck(
    chatId: string,
    questionId: string,
    agendaId: string,
    recheckRequest: string,
  ) {
    updateQuestion(chatId, questionId, (question) => ({
      ...question,
      agendas: question.agendas.map((agenda) =>
        agenda.id === agendaId && agenda.status === "conflicted"
          ? { ...agenda, status: "recheck_requested", recheckRequest }
          : agenda,
      ),
    }));

    // Mock 재검색 연출 — 실제 Manager AI 호출은 백엔드 Spec에서 구현
    setTimeout(() => {
      updateQuestion(chatId, questionId, (question) => ({
        ...question,
        agendas: question.agendas.map((agenda) => {
          if (agenda.id !== agendaId || agenda.status !== "recheck_requested") {
            return agenda;
          }
          const recheckResult =
            mockAgendaTemplates.find(
              (template) => template.title === agenda.title,
            )?.recheckResult ??
            "공식 문서 기준의 재검색 결과를 확인하지 못했습니다.";
          return { ...agenda, status: "reanswered", recheckResult };
        }),
      }));
    }, RECHECK_MOCK_DELAY_MS);
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
    resolveAgenda,
    requestRecheck,
    selectChat,
    startNewChat,
  };
}
