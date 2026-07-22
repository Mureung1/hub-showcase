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
import {
  loadChatsWithQuestions,
  createChatWithFirstQuestion as apiCreateChat,
  createNextQuestion as apiCreateNextQuestion,
  markQuestionCompleted,
  ApiStorageError,
  type StoredChat,
} from "../../lib/apiStorageAdapter";
import type { SourceAnswerEvent } from "./scenarios";
import type { MockAgendaTemplate } from "./mockData";
import {
  allRejectedFinalAnswerContent,
  mockAgendaTemplates,
  mockFinalAnswerContent,
  mockModelByProvider,
  mockSectionsByProvider,
  mockSummaryByProvider,
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
      structuredContent: {
        summary: mockSummaryByProvider[id],
        sections: [...mockSectionsByProvider[id]],
      },
      // 브라우저 Mock에는 실제 토큰·지연 관측값이 없다(값 부재 = null, data-model 1.6).
      // 실제 값은 서버 파이프라인이 채운다(SPEC-AI-001 8.3).
      responseMeta: null,
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
 * 새 Question에 붙일 Provider별 SourceAnswer(pending) 초기 배열 (Mock AI 흐름의 시작점).
 * 서버 저장 경로·메모리 경로가 함께 사용한다.
 */
function buildPendingSourceAnswers(questionId: string): SourceAnswer[] {
  const created = nowIso();
  return providerMeta.map(({ id }) => ({
    id: crypto.randomUUID(),
    questionId,
    provider: id,
    model: mockModelByProvider[id],
    status: "pending",
    structuredContent: null,
    // 아직 호출 전이므로 관측 메타 없음(8.3)
    responseMeta: null,
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
}

/**
 * 서버에서 복원한 Chat·Question(평면)을 UI 뷰 Chat으로 변환한다.
 * AI 생성물은 이 Spec에서 서버에 없으므로 빈 배열로 둔다(0.4 한계 — 옛 Question은
 * 메시지·상태만 복원되고 답변·Agenda·FinalAnswer·노트는 복원되지 않는다).
 */
function toViewChat(stored: StoredChat): Chat {
  return {
    ...stored.chat,
    questions: stored.questions.map((question) => ({
      ...question,
      sourceAnswers: [],
      agendas: [],
      finalAnswer: null,
    })),
  };
}

/**
 * Workspace의 Chat·Question 상태를 소유하는 Hook (Step 1~9).
 * 기본(happy-path) 사용에서는 Chat·Question을 apiStorageAdapter→Express→Supabase로
 * 실제 저장·복원한다(SPEC-DB-001 5장). AI 생성물은 여전히 브라우저 Mock이다(0.4 한계).
 * `?scenario=`로 지정하는 개발 시나리오는 서버 없이 기존 메모리 흐름을 유지한다.
 */
export function useChatWorkspace() {
  // 기본 시나리오에서만 서버 저장을 켠다 — dev 시나리오(provider-retry·all-rejected·
  // context-next-question 등)는 AI 흐름 테스트용이라 기존 메모리 동작을 유지한다.
  const serverBacked = getActiveScenario().id === "happy-path";
  const [state, setState] = useState<ChatWorkspaceState>(() =>
    getActiveScenario().id === "context-next-question"
      ? buildContextNextQuestionState()
      : { chats: [], activeChatId: null, decisionNotes: [] },
  );

  // 서버 저장 모드: 마운트 시 Chat·Question을 복원한다(재로그인 복원, AC4).
  // per-run `cancelled`만 쓴다(ref 가드를 두면 StrictMode 이중 마운트에서 첫 fetch가
  // cleanup으로 취소되고 두 번째가 건너뛰어져 복원이 사라진다). 재fetch는 idempotent.
  useEffect(() => {
    if (!serverBacked) return;
    let cancelled = false;
    void loadChatsWithQuestions()
      .then((stored) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, chats: stored.map(toViewChat) }));
      })
      .catch((error) => {
        console.error(
          "[apiStorage] Chat 복원 실패:",
          error instanceof Error ? error.message : error,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [serverBacked]);

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
            ? {
                summary: mockSummaryByProvider[provider],
                sections: [...mockSectionsByProvider[provider]],
              }
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

    // 이 해소로 Question이 완료되는지 현재 스냅샷으로 예측한다(updater 밖에서 판단해야
    // setState 이후 안전하게 서버에 완료를 영속화할 수 있다). 남은 Agenda가 이것뿐이면 완료.
    if (serverBacked) {
      const question = state.chats
        .find((chat) => chat.id === chatId)
        ?.questions.find((q) => q.id === questionId);
      const willComplete =
        !!question &&
        question.finalAnswer === null &&
        question.agendas.length > 0 &&
        question.agendas.every((agenda) =>
          agenda.id === agendaId
            ? true
            : agenda.status === "passed" || agenda.status === "rejected",
        );
      if (willComplete) {
        // Question 완료를 서버에 영속화(미완료 1개 해제·재로그인 복원 일관성). 실패는 로깅만.
        void markQuestionCompleted(chatId, questionId).catch((error) =>
          console.error(
            "[apiStorage] Question 완료 영속화 실패:",
            error instanceof Error ? error.message : error,
          ),
        );
      }
    }

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

  /** 뷰 Chat에 새 Question(processing)을 붙여 로컬 상태에 반영하고 Mock 흐름을 예약한다. */
  function seedNewQuestion(question: Question, isNewChat: boolean, newChat?: Chat) {
    if (isNewChat && newChat) {
      setState((prev) => ({
        ...prev,
        chats: [...prev.chats, newChat],
        activeChatId: newChat.id,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((chat) =>
          chat.id === question.chatId
            ? { ...chat, questions: [...chat.questions, question] }
            : chat,
        ),
      }));
    }
    scheduleSourceAnswerFlow(question.chatId, question.id);
  }

  /**
   * 질문 전송. Question을 `processing`으로 생성한다(Step 2-2: draft는 UI상 상태가 아니다).
   * 빈 질문(공백만)과 1000자 초과는 실행하지 않는다.
   * 서버 저장 모드에서는 Chat·Question을 Express→Supabase에 먼저 저장하고(서버가 id·title·
   * sequence 부여), 반환된 id로 Mock AI 흐름을 잇는다. 미완료 1개 제약은 서버가 최종 강제한다.
   */
  async function submitQuestion(content: string): Promise<boolean> {
    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > QUESTION_MAX_LENGTH) {
      return false;
    }
    // 기존 Chat이면 미완료 Question 1개 제한을 먼저 확인한다 (고정 정책, 서버가 최종 강제)
    if (activeChat !== null && hasIncompleteQuestion(activeChat)) {
      return false;
    }

    if (serverBacked) {
      try {
        if (activeChat === null) {
          const { chat, question } = await apiCreateChat(trimmed);
          const viewQuestion: Question = {
            ...question,
            sourceAnswers: buildPendingSourceAnswers(question.id),
            agendas: [],
            finalAnswer: null,
          };
          const viewChat: Chat = { ...chat, questions: [viewQuestion] };
          seedNewQuestion(viewQuestion, true, viewChat);
        } else {
          const question = await apiCreateNextQuestion(activeChat.id, trimmed);
          const viewQuestion: Question = {
            ...question,
            sourceAnswers: buildPendingSourceAnswers(question.id),
            agendas: [],
            finalAnswer: null,
          };
          seedNewQuestion(viewQuestion, false);
        }
        return true;
      } catch (error) {
        // 저장 실패(예: 미완료 1개 QUESTION_ALREADY_OPEN)는 반영하지 않고 false 반환.
        console.error(
          "[apiStorage] 질문 저장 실패:",
          error instanceof ApiStorageError
            ? `${error.code}: ${error.message}`
            : error,
        );
        return false;
      }
    }

    // --- 비-서버(dev 시나리오): 기존 메모리 흐름 유지 ---
    const chatId = activeChat?.id ?? crypto.randomUUID();
    const questionId = crypto.randomUUID();
    const created = nowIso();
    const question: Question = {
      id: questionId,
      chatId,
      sequenceNumber: (activeChat?.questions.length ?? 0) + 1,
      message: trimmed,
      status: "processing",
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: created,
      updatedAt: created,
      completedAt: null,
      sourceAnswers: buildPendingSourceAnswers(questionId),
      agendas: [],
      finalAnswer: null,
    };
    const newChat: Chat | undefined =
      activeChat === null
        ? {
            id: chatId,
            title: trimmed.slice(0, CHAT_TITLE_MAX_LENGTH),
            questions: [question],
            createdAt: created,
            updatedAt: created,
          }
        : undefined;
    seedNewQuestion(question, activeChat === null, newChat);
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
