import { useEffect, useState } from "react";
import type {
  Agenda,
  AgendaResolutionReason,
  Chat,
  DecisionNote,
  FinalAnswer,
  Provider,
  Question,
  SourceAnswer,
} from "./types";
import { hasIncompleteQuestion, isSourceAnswerSettled } from "./types";
import { validateWorkspaceEntities } from "./mockValidation";
import { getActiveScenario } from "./scenarios";
import type { SourceAnswerEvent } from "./scenarios";
import type { MockAgendaTemplate } from "./mockData";
import {
  allRejectedFinalAnswerContent,
  mockAgendaTemplates,
  mockFinalAnswerContent,
  mockModelByProvider,
  mockSectionsByProvider,
  providerMeta,
} from "./mockData";

export const QUESTION_MAX_LENGTH = 1000;

/** Chat 제목 = 첫 질문 앞 100자 (고정 정책) */
const CHAT_TITLE_MAX_LENGTH = 100;

/** Mock 재검색 연출 시간 */
const RECHECK_MOCK_DELAY_MS = 1200;

/** ISO 8601 타임스탬프 — 계약(SPEC-SCHEMA-001)은 날짜를 ISO 문자열로 정의한다. */
function nowIso(): string {
  return new Date().toISOString();
}

interface ChatWorkspaceState {
  chats: Chat[];
  /** null = 새 채팅(첫 진입 빈 화면) */
  activeChatId: string | null;
  /** 자동 생성된 Decision Notes 누적 — Right 패널에 계속 표시된다 */
  decisionNotes: DecisionNote[];
}

/**
 * Mock Manager 비교 결과 생성. Agenda 구성은 활성 시나리오의 fixture를 따른다.
 * 성공한 SourceAnswer의 입장만 근거로 포함하고
 * (근거 없는 비교 결과를 정상 데이터로 저장하지 않는다), stance의 sourceRefs는
 * 실제 SourceAnswer id와 Mock Section의 sectionId를 참조한다.
 * Consensus는 draft → passed(auto_consensus)로 즉시 전이하며 selectedContent를 가진다 (고정 정책).
 * draft는 UI에 노출하지 않는다.
 */
function buildMockAgendas(
  sourceAnswers: SourceAnswer[],
  templates: readonly MockAgendaTemplate[],
  questionId: string,
): Agenda[] {
  const succeededByProvider = new Map(
    sourceAnswers
      .filter((answer) => answer.status === "succeeded")
      .map((answer) => [answer.provider, answer]),
  );

  return templates.map((template) => {
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

    const now = nowIso();
    const draft: Agenda = {
      id: crypto.randomUUID(),
      questionId,
      status: "draft",
      resolutionReason: null,
      title: template.title,
      summary: template.summary,
      selectedContent: null,
      userNote: null,
      // 계약상 자유형(unknown[]). Mock은 stance가 참조한 Section 참조를 담는다.
      sourceRefs: stances.flatMap((stance) => stance.sourceRefs),
      recheckRequest: null,
      recheckResult: null,
      recheckRequestedAt: null,
      reansweredAt: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      stances,
    };

    if (template.kind === "consensus") {
      // draft → passed(auto_consensus): Consensus Agenda 자동 통과
      return {
        ...draft,
        status: "passed" as const,
        resolutionReason: "auto_consensus" as const,
        selectedContent: template.selectedContent,
        resolvedAt: now,
      };
    }
    // draft → conflicted: 사용자 판단 대기
    return { ...draft, status: "conflicted" as const };
  });
}

/**
 * Mock FinalAnswer 생성 (Step 7). Question당 1회, 재생성 없음 (고정 정책).
 * domain-policy 기준: 모든 Agenda(Consensus 포함)가 rejected일 때만 고정 문구를
 * all_agendas_rejected 모드로 반환한다. passed Agenda가 1개라도 있으면
 * (예: auto_consensus) 그것을 근거로 정상 FinalAnswer를 생성한다.
 */
function buildMockFinalAnswer(
  agendas: Agenda[],
  sourceAnswers: SourceAnswer[],
  questionId: string,
): FinalAnswer {
  const isAllRejected =
    agendas.length > 0 &&
    agendas.every((agenda) => agenda.status === "rejected");
  if (isAllRejected) {
    return {
      id: crypto.randomUUID(),
      questionId,
      content: allRejectedFinalAnswerContent,
      generationMode: "all_agendas_rejected",
      createdAt: nowIso(),
    };
  }

  const succeededCount = sourceAnswers.filter(
    (answer) => answer.status === "succeeded",
  ).length;
  return {
    id: crypto.randomUUID(),
    questionId,
    content: mockFinalAnswerContent,
    // 성공한 SourceAnswer가 1개면 단일 소스 기반 (Step 7-4, T-009 시나리오에서 사용)
    generationMode:
      succeededCount === 1 ? "single_source_fallback" : "multi_source",
    createdAt: nowIso(),
  };
}

/**
 * Mock DecisionNote 자동 요약 생성 (Step 8, 사용자 입력 없음).
 * R3-1: 노트 내용은 개조식 bullet만 사용한다 (서술형 문단 금지).
 * 긴 selectedContent 대신 템플릿의 개조식 noteBullet을 담고,
 * 사용자 판단 Agenda는 "제목 — 내 결정 반영" 형태의 개조식 한 줄로 정리한다.
 * all_agendas_rejected면 고정 문구를 그대로 노트 내용으로 저장한다 (확정 정책).
 *
 * 계약(shared)의 DecisionNote는 content 하나만 가지므로, 개조식 bullets는 줄바꿈으로
 * 이어 content에 저장하고 bullets 배열은 표시용 파생 필드로만 뷰에 유지한다.
 * seq·sources는 결정 2-1에 따라 저장하지 않는다.
 */
function buildMockDecisionNote(
  chatId: string,
  chatTitle: string,
  question: Question,
  agendas: Agenda[],
  finalAnswer: FinalAnswer,
): DecisionNote {
  // Agenda 제목으로 활성 시나리오 템플릿의 개조식 noteBullet을 찾는다
  const templates = getActiveScenario().agendaTemplates;
  const noteBulletOf = (agenda: Agenda): string =>
    templates.find((template) => template.title === agenda.title)?.noteBullet ??
    agenda.title;

  const bullets =
    finalAnswer.generationMode === "all_agendas_rejected"
      ? [finalAnswer.content]
      : [
          ...agendas
            .filter((agenda) => agenda.resolutionReason === "auto_consensus")
            .map((agenda) => noteBulletOf(agenda)),
          ...agendas
            .filter(
              (agenda) =>
                agenda.status === "passed" &&
                agenda.resolutionReason !== "auto_consensus",
            )
            .map((agenda) => noteBulletOf(agenda)),
        ].filter((bullet) => bullet.length > 0);

  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    questionId: question.id,
    // 계약 필드: 개조식 bullet을 줄바꿈으로 이어 저장한다 (최소 1자 보장)
    content: bullets.join("\n") || finalAnswer.content,
    createdAt: now,
    updatedAt: now,
    // UI 전용 파생 표시 필드
    chatId,
    title: chatTitle,
    bullets,
  };
}

/**
 * context-next-question fixture (0.5): 완료 Question 2개(각자 FinalAnswer·노트 보유)를
 * 가진 Chat이 초기 Chat 목록에 존재하는 상태. 연속 질문 흐름과 기록 복원 확인용 (AC-6).
 */
function buildContextNextQuestionState(): ChatWorkspaceState {
  const questionMessages = [
    "Supabase RLS는 어떻게 설정할까?",
    "확정한 RLS 정책은 어떤 절차로 배포하는 게 좋을까?",
  ];
  const chatTitle = questionMessages[0].slice(0, CHAT_TITLE_MAX_LENGTH);
  const chatId = crypto.randomUUID();

  const decisionNotes: DecisionNote[] = [];
  const questions = questionMessages.map((message, index) => {
    const questionId = crypto.randomUUID();
    const created = nowIso();

    // 세 Provider 모두 성공한 상태로 구성
    const sourceAnswers: SourceAnswer[] = providerMeta.map(({ id }) => ({
      id: crypto.randomUUID(),
      questionId,
      provider: id,
      model: mockModelByProvider[id],
      status: "succeeded",
      structuredContent: { sections: [...mockSectionsByProvider[id]] },
      errorCode: null,
      errorMessage: null,
      retryCount: 0,
      excludedFromComparison: false,
      excludedAt: null,
      startedAt: created,
      completedAt: created,
      createdAt: created,
      updatedAt: created,
    }));

    // Conflict는 사용자 채택(user_accepted)으로 모두 해소된 상태
    const agendas = buildMockAgendas(
      sourceAnswers,
      mockAgendaTemplates,
      questionId,
    ).map((agenda) =>
      agenda.status === "conflicted"
        ? {
            ...agenda,
            status: "passed" as const,
            resolutionReason: "user_accepted" as const,
            selectedContent: agenda.stances[0]?.text ?? null,
            resolvedAt: nowIso(),
            updatedAt: nowIso(),
          }
        : agenda,
    );

    const finalAnswer = buildMockFinalAnswer(agendas, sourceAnswers, questionId);
    const question: Question = {
      id: questionId,
      chatId,
      sequenceNumber: index + 1,
      message,
      status: "completed",
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: created,
      updatedAt: created,
      completedAt: created,
      sourceAnswers,
      agendas,
      finalAnswer,
    };
    decisionNotes.push(
      buildMockDecisionNote(chatId, chatTitle, question, agendas, finalAnswer),
    );
    return question;
  });

  const chatCreated = nowIso();
  return {
    chats: [
      {
        id: chatId,
        title: chatTitle,
        questions,
        createdAt: chatCreated,
        updatedAt: chatCreated,
      },
    ],
    // 빈 화면에서 시작해 Chat 전환 → 기록 복원을 확인한다 (AC-6-2)
    activeChatId: null,
    decisionNotes,
  };
}

/**
 * Workspace의 Chat·Question 상태를 소유하는 Hook (Step 1~9).
 * 저장은 이번 Spec 제외 범위라 상태는 메모리에만 유지되고 새로고침 시 초기화된다.
 */
export function useChatWorkspace() {
  const [state, setState] = useState<ChatWorkspaceState>(() =>
    getActiveScenario().id === "context-next-question"
      ? buildContextNextQuestionState()
      : { chats: [], activeChatId: null, decisionNotes: [] },
  );

  const activeChat =
    state.chats.find((chat) => chat.id === state.activeChatId) ?? null;

  /** 처리 중 여부 — 컴포저 비활성("충돌 해결 중")과 새 채팅 확인 팝업 판단 기준 */
  const isActiveChatBusy = activeChat !== null && hasIncompleteQuestion(activeChat);

  /**
   * 활성 Chat의 노트만 표시한다 (Step 8 R1 개정).
   * 데이터는 전역 decisionNotes에 Chat 연결(chatId)로 보관하고 표시만 필터 —
   * 새 Chat(빈 화면)에서는 빈 목록이 된다.
   */
  const activeChatNotes = state.decisionNotes.filter(
    (note) => note.chatId === state.activeChatId,
  );

  /**
   * Mock 데이터 반환 직전 계약 검증 (Spec 8장, AC5). 상태가 UI로 나가기 전에
   * 구성 엔티티를 개별 parse하고, 실패하면 errorCode와 원문을 드러낸다 (결정 3-1·3-3).
   */
  const mockValidationError = validateWorkspaceEntities(
    state.chats,
    state.decisionNotes,
  );
  const validationMessage = mockValidationError?.message ?? null;
  useEffect(() => {
    if (validationMessage) {
      console.error(
        `[Mock 계약 검증 실패] ${mockValidationError?.errorCode}: ${validationMessage}`,
      );
    }
    // errorCode는 message와 1:1이므로 message만 의존성으로 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationMessage]);

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
        const isSucceeded = event.status === "succeeded";
        const isFailed = event.status === "failed";
        const isProcessing = event.status === "processing";
        const excludedFromComparison =
          event.excludedFromComparison ?? answer.excludedFromComparison;
        const timestamp = nowIso();
        return {
          ...answer,
          status: event.status,
          retryCount: event.retryCount ?? answer.retryCount,
          excludedFromComparison,
          // 6장: failed면 errorCode 필수 / succeeded면 성공이므로 코드 제거
          errorCode: isSucceeded
            ? null
            : isFailed
              ? (event.errorCode ?? answer.errorCode ?? "PROVIDER_TIMEOUT")
              : answer.errorCode,
          // 6장: succeeded면 structuredContent 필수 (Mock Section을 채운다)
          structuredContent: isSucceeded
            ? { sections: [...mockSectionsByProvider[provider]] }
            : answer.structuredContent,
          startedAt:
            isProcessing && answer.startedAt === null
              ? timestamp
              : answer.startedAt,
          completedAt:
            isSucceeded || isFailed ? timestamp : answer.completedAt,
          // 6장: excludedFromComparison=true면 excludedAt 필수
          excludedAt:
            excludedFromComparison && answer.excludedAt === null
              ? timestamp
              : answer.excludedAt,
          updatedAt: timestamp,
        };
      });

      // 세 Provider가 모두 최종 상태면 Mock Manager 결과(Agenda)를 만들고
      // Question은 검토 단계로 전이한다 (0.4 상태 전이)
      const allSettled = sourceAnswers.every(isSourceAnswerSettled);
      const startsReview = allSettled && question.status === "processing";
      return {
        ...question,
        sourceAnswers,
        agendas: startsReview
          ? buildMockAgendas(
              sourceAnswers,
              getActiveScenario().agendaTemplates,
              questionId,
            )
          : question.agendas,
        status: startsReview ? "review_required" : question.status,
        updatedAt: nowIso(),
      };
    });
  }

  /**
   * Conflict Agenda 사용자 판단 반영 (Step 5·6 상태 전이).
   * resolutionReason이 user_rejected 계열이면 rejected, 그 외에는 passed가 되며
   * passed에는 채택된 selectedContent를 저장한다.
   * 마지막 Agenda가 최종 처리되면 같은 갱신에서 FinalAnswer 생성 →
   * DecisionNote 자동 저장 → Question `completed` 전환까지 수행한다
   * (Step 8: DecisionNote 자동 저장 후에만 completed — 고정 정책).
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
    setState((prev) => {
      let createdNote: DecisionNote | null = null;

      const chats = prev.chats.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }
        return {
          ...chat,
          questions: chat.questions.map((question) => {
            if (question.id !== questionId) {
              return question;
            }
            const resolvedAt = nowIso();
            const agendas = question.agendas.map((agenda) =>
              agenda.id === agendaId
                ? {
                    ...agenda,
                    status: isRejected
                      ? ("rejected" as const)
                      : ("passed" as const),
                    resolutionReason,
                    selectedContent: isRejected ? null : selectedContent,
                    resolvedAt,
                    updatedAt: resolvedAt,
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
            const createsFinalAnswer = allFinal && question.finalAnswer === null;
            const finalAnswer = createsFinalAnswer
              ? buildMockFinalAnswer(agendas, question.sourceAnswers, question.id)
              : question.finalAnswer;

            if (createsFinalAnswer && finalAnswer) {
              // FinalAnswer 생성 직후 별도 연출 없이 노트 자동 생성 (Step 8-2 즉시 추가)
              createdNote = buildMockDecisionNote(
                chat.id,
                chat.title,
                question,
                agendas,
                finalAnswer,
              );
            }

            return {
              ...question,
              agendas,
              finalAnswer,
              // 노트 저장과 같은 갱신에서 completed 전환 → 입력 재활성·● 제거는 파생
              status: createsFinalAnswer
                ? ("completed" as const)
                : question.status,
              completedAt: createsFinalAnswer ? nowIso() : question.completedAt,
              updatedAt: nowIso(),
            };
          }),
        };
      });

      return {
        ...prev,
        chats,
        decisionNotes: createdNote
          ? [...prev.decisionNotes, createdNote]
          : prev.decisionNotes,
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
    // 기존 Chat이면 미완료 Question 1개 제한을 먼저 확인한다 (고정 정책)
    if (activeChat !== null && hasIncompleteQuestion(activeChat)) {
      return false;
    }

    const chatId = activeChat?.id ?? crypto.randomUUID();
    const questionId = crypto.randomUUID();
    const created = nowIso();

    const sourceAnswers: SourceAnswer[] = providerMeta.map(({ id }) => ({
      id: crypto.randomUUID(),
      questionId,
      provider: id,
      model: mockModelByProvider[id],
      status: "pending",
      structuredContent: null,
      errorCode: null,
      errorMessage: null,
      retryCount: 0,
      excludedFromComparison: false,
      excludedAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: created,
      updatedAt: created,
    }));

    // 정책 전이 순서(draft → processing)는 유지하되, draft는 사용자에게 노출하지 않으므로
    // 초기 상태를 곧바로 processing으로 둔다.
    const question: Question = {
      id: questionId,
      chatId,
      // 연속 질문 시 Chat 안에서 순번 증가 (Step 9)
      sequenceNumber: (activeChat?.questions.length ?? 0) + 1,
      message: trimmed,
      status: "processing",
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: created,
      updatedAt: created,
      completedAt: null,
      sourceAnswers,
      agendas: [],
      finalAnswer: null,
    };

    if (activeChat === null) {
      const chat: Chat = {
        id: chatId,
        title: trimmed.slice(0, CHAT_TITLE_MAX_LENGTH),
        questions: [question],
        createdAt: created,
        updatedAt: created,
      };
      setState((prev) => ({
        ...prev,
        chats: [...prev.chats, chat],
        activeChatId: chatId,
      }));
    } else {
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
   * R1 개정: 추가 의견(recheckRequest)은 선택 입력 — 있을 때만 저장한다
   * (domain-policy의 recheck_request nullable과 정합).
   */
  function requestRecheck(
    chatId: string,
    questionId: string,
    agendaId: string,
    recheckRequest: string,
  ) {
    const trimmedRequest = recheckRequest.trim();
    updateQuestion(chatId, questionId, (question) => ({
      ...question,
      agendas: question.agendas.map((agenda) =>
        agenda.id === agendaId && agenda.status === "conflicted"
          ? {
              ...agenda,
              status: "recheck_requested" as const,
              recheckRequest:
                trimmedRequest.length > 0 ? trimmedRequest : agenda.recheckRequest,
              recheckRequestedAt: nowIso(),
              updatedAt: nowIso(),
            }
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
            getActiveScenario().agendaTemplates.find(
              (template) => template.title === agenda.title,
            )?.recheckResult ??
            "공식 문서 기준의 재검색 결과를 확인하지 못했습니다.";
          const reansweredAt = nowIso();
          return {
            ...agenda,
            status: "reanswered" as const,
            recheckResult,
            reansweredAt,
            updatedAt: reansweredAt,
          };
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
    /** 활성 Chat 기준으로 필터된 노트 (Step 8 R1) */
    decisionNotes: activeChatNotes,
    isActiveChatBusy,
    /** Mock 계약 검증 실패 정보 (없으면 null) — 기존 error UI로 노출한다 (AC6) */
    mockValidationError,
    submitQuestion,
    resolveAgenda,
    requestRecheck,
    selectChat,
    startNewChat,
  };
}
