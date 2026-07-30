import { useEffect, useState } from "react";
import { NO_VALUE } from "@decision-log/shared";
import type {
  Agenda,
  AgendaResolutionReason,
  Chat,
  DecisionNote,
  FinalAnswer,
  Provider,
  Question,
  SourceAnswer,
  SourceAnswerStatus,
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
  loadAgendas,
  loadSourceAnswers,
  patchAgenda,
  startSourceAnswers,
  type AgendaPatchBody,
} from "../../lib/apiStorageAdapter";
import type { SourceAnswerEvent } from "./scenarios";
import type { MockAgendaTemplate } from "./mockData";
import {
  allProvidersFailedContent,
  managerFailedContent,
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
/**
 * 템플릿이 참조하는 Mock sectionId(`"claude-s2"`)를 **실제 답변에 존재하는 sectionId**로 옮긴다.
 * 실제 Provider가 붙이는 sectionId는 임의(`"s1"`·`"rec-basic"` 등)라 그대로 쓰면 없는 Section을
 * 가리키게 된다. 템플릿의 `-s<N>` 순번을 order 인덱스로 보고, 실제 섹션 수가 적으면 마지막으로
 * 클램프해 **참조 무결성만** 맞춘다(Agenda 비교 "내용"이 canned인 것은 의도된 상태 — 실제 비교는
 * SPEC-AI-002). 근거는 succeeded 답변의 실제 섹션에서만 가져온다.
 */
function resolveSectionId(
  answer: SourceAnswer,
  templateSectionId: string,
): string | null {
  const sections = answer.structuredContent?.sections ?? [];
  if (sections.length === 0) return null;

  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const match = /-s(\d+)$/.exec(templateSectionId);
  const index = match ? Number(match[1]) - 1 : 0;
  const clamped = Math.min(Math.max(index, 0), ordered.length - 1);
  return ordered[clamped]?.sectionId ?? null;
}

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

  return templates.map((template, index) => {
    const stances = template.stances
      .filter((stance) => succeededByProvider.has(stance.provider))
      .map((stance) => {
        const answer = succeededByProvider.get(stance.provider)!;
        return {
          provider: stance.provider,
          text: stance.text,
          // 원문에서 잘라낸 부분 문자열(§11). 템플릿이 실제 섹션 content 기준으로 채운다.
          quotes: stance.quotes,
          sourceRefs: stance.sectionIds
            .map((sectionId) => resolveSectionId(answer, sectionId))
            .filter((sectionId): sectionId is string => sectionId !== null)
            .map((sectionId) => ({
              sourceAnswerId: answer.id,
              sectionId,
            })),
        };
      });

    // 자동 통과·사용자 채택 시 selectedSourceRef로 쓸 실제 참조(§9.2). 첫 stance의 첫 참조.
    const firstSourceRef = stances[0]?.sourceRefs[0] ?? null;

    const now = nowIso();
    const draft: Agenda = {
      id: crypto.randomUUID(),
      questionId,
      status: "draft",
      resolutionReason: null,
      kind: template.kind,
      title: template.title,
      summary: template.summary,
      selectedContent: null,
      selectedSourceRef: null,
      userNote: null,
      // SourceRef[]. Mock은 stance가 참조한 Section 참조를 담는다.
      sourceRefs: stances.flatMap((stance) => stance.sourceRefs),
      disagreementType: null,
      revisedType: null,
      confidence: null,
      displayOrder: index,
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
        selectedSourceRef: firstSourceRef,
        resolvedAt: now,
      };
    }
    if (template.kind === "single_source") {
      // draft → passed(auto_single_source): 단일 소스 Agenda 자동 통과(§3.4·§9.2).
      // "합의"가 아니라 단일 답변 근거임을 라벨·selectedSourceRef로 드러낸다.
      return {
        ...draft,
        status: "passed" as const,
        resolutionReason: "auto_single_source" as const,
        selectedContent: stances[0]?.text ?? template.selectedContent,
        selectedSourceRef: firstSourceRef,
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
/**
 * 자동 통과인가 — `resolutionReason` 기준(§12.5).
 *
 * ⚠️ **`auto_single_source`를 빼먹으면 안 된다.** 그러면 단일 소스 자동 통과가
 * "사용자 판단" 쪽으로 떨어져 노트에 "— 내 결정 반영"이 붙는다. 사용자가 판단한 적
 * 없는 항목에 그렇게 적으면 **노트가 사실과 달라진다.** §12.5가 표현 정교화가 아니라
 * 정확성 문제로 다루라고 못박은 지점이다.
 */
function isAutoPassed(agenda: Agenda): boolean {
  return (
    agenda.resolutionReason === "auto_consensus" ||
    agenda.resolutionReason === "auto_single_source"
  );
}

function buildMockDecisionNote(
  chatId: string,
  chatTitle: string,
  question: Question,
  agendas: Agenda[],
  finalAnswer: FinalAnswer,
): DecisionNote {
  // Agenda 제목으로 활성 시나리오 템플릿의 개조식 noteBullet을 찾는다
  const templates = getActiveScenario().agendaTemplates;
  const noteBulletOf = (agenda: Agenda): string => {
    // §12.5 — 자동 통과 항목에는 사용자 판단 문구를 쓰지 않는다.
    // Mock 템플릿의 noteBullet 은 "…— 내 결정 반영"처럼 **사용자가 판단했을 때**의
    // 문구다. 같은 쟁점이 단일 소스로 자동 통과하는 시나리오에서 그대로 쓰면
    // 사용자가 판단한 적 없는 항목에 "내 결정 반영"이 붙어 노트가 사실과 달라진다.
    // (서버 경로는 제목이 템플릿과 매칭되지 않아 agenda.title 로 떨어지므로 이미 중립이다.)
    if (isAutoPassed(agenda)) return agenda.title;
    return (
      templates.find((template) => template.title === agenda.title)
        ?.noteBullet ?? agenda.title
    );
  };

  const bullets =
    finalAnswer.generationMode === "all_agendas_rejected"
      ? [finalAnswer.content]
      : [
          ...agendas
            .filter((agenda) => isAutoPassed(agenda))
            .map((agenda) => noteBulletOf(agenda)),
          ...agendas
            .filter(
              (agenda) => agenda.status === "passed" && !isAutoPassed(agenda),
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
            // 사용자 채택 → 채택한 stance의 실제 참조(§9.2)
            selectedSourceRef: agenda.stances[0]?.sourceRefs[0] ?? null,
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

  /**
   * live SSE 진행 상태(questionId → provider → status). 로딩 말풍선 점등 전용이다.
   * 실제 SourceAnswer 배열은 succeeded일 때 structuredContent가 있어야 계약을 만족하므로,
   * 스트리밍 중에는 이 파생 상태만 갱신하고 배열은 done 시점에 한 번에 반영한다.
   */
  /**
   * Manager 진행 표시(§12.2). 화면 전용이며 저장하지 않는다.
   * 이것이 없으면 `source_answer.done` 이후 쟁점이 나올 때까지 화면이 비어 있다.
   */
  const [managerProgress, setManagerProgress] = useState<
    Record<
      string,
      {
        stage: "classify" | "leftover" | "finalize" | "judge";
        done: number | null;
        total: number | null;
      }
    >
  >({});
  const [liveStatuses, setLiveStatuses] = useState<
    Record<string, Partial<Record<Provider, SourceAnswerStatus>>>
  >({});

  // 서버 저장 모드: 마운트 시 Chat·Question을 복원한다(재로그인 복원, AC4).
  // per-run `cancelled`만 쓴다(ref 가드를 두면 StrictMode 이중 마운트에서 첫 fetch가
  // cleanup으로 취소되고 두 번째가 건너뛰어져 복원이 사라진다). 재fetch는 idempotent.
  useEffect(() => {
    if (!serverBacked) return;
    let cancelled = false;
    void loadChatsWithQuestions()
      .then(async (stored) => {
        if (cancelled) return;
        // SourceAnswer 스냅샷도 함께 복원한다(새로고침·재진입, SPEC-AI-001 4장).
        // 조회 실패한 Question은 빈 배열로 두고 나머지 복원을 막지 않는다.
        const answersByQuestion = new Map<string, SourceAnswer[]>();
        // §12.3 — Agenda 스냅샷도 함께 복원한다. 이것이 없으면 새로고침 후 3열 비교와
        // 충돌 목록이 사라지고, 사용자는 판단할 대상을 잃는다.
        const agendasByQuestion = new Map<string, Agenda[]>();
        await Promise.all(
          stored.flatMap(({ chat, questions }) =>
            questions.map(async (question) => {
              try {
                answersByQuestion.set(
                  question.id,
                  await loadSourceAnswers(chat.id, question.id),
                );
              } catch (error) {
                console.error(
                  "[apiStorage] SourceAnswer 복원 실패:",
                  error instanceof Error ? error.message : error,
                );
              }
              try {
                agendasByQuestion.set(
                  question.id,
                  await loadAgendas(chat.id, question.id),
                );
              } catch (error) {
                console.error(
                  "[apiStorage] Agenda 복원 실패:",
                  error instanceof Error ? error.message : error,
                );
              }
            }),
          ),
        );
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          chats: stored.map((item) => {
            const view = toViewChat(item);
            return {
              ...view,
              questions: view.questions.map((question) => ({
                ...question,
                sourceAnswers:
                  answersByQuestion.get(question.id) ?? question.sourceAnswers,
                agendas: agendasByQuestion.get(question.id) ?? question.agendas,
              })),
            };
          }),
        }));

        /**
         * 경로 C — 새로고침 복원도 **확정 스냅샷**이다(§12.1).
         *
         * ⚠️ 이 호출이 없으면 `agenda.done`(경로 A)에서만 마감이 판단되고, 새로고침하는
         * 순간 다시 갇힌다. SSE로 왔든 GET으로 왔든 **확정된 0건은 같은 처리로 수렴**해야
         * 한다. 대상을 0건으로 좁히는 이유는 비어 있지 않은 복원이 이미 정상 동작하고
         * 있어(T-019.4 F-6), 다시 태우면 DecisionNote가 중복 생성될 수 있기 때문이다.
         */
        for (const { chat, questions } of stored) {
          for (const question of questions) {
            const restored = agendasByQuestion.get(question.id) ?? [];
            const managerRan = (answersByQuestion.get(question.id) ?? []).some(
              (answer) => answer.status === "succeeded",
            );
            // ⚠️ `status !== "completed"` 로 막으면 안 된다 — Manager 완전 실패는 이미
            // completed 로 저장돼 있어 그 가드에 걸리고, 새로고침 시 고정 문구가 사라져
            // **아무 설명도 없는 빈 카드**가 된다. 판단 기준은 상태가 아니라 "복원할
            // FinalAnswer 가 없는가"다.
            if (restored.length === 0 && managerRan) {
              applyAgendas(chat.id, question.id, [], { final: true });
            }
          }
        }
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
    // 마운트 1회 복원이다. applyAgendas는 매 렌더 새로 만들어지므로 의존성에 넣으면
    // 복원이 반복 실행된다 — 의도적으로 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // updateQuestion 대신 setState를 직접 쓴다 — settle 시 충돌 0건이면 같은 갱신에서
    // FinalAnswer·DecisionNote(별도 state)까지 만들어야 하기 때문이다.
    setState((prev) => {
      let createdNote: DecisionNote | null = null;
      const chats = prev.chats.map((chat) => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          questions: chat.questions.map((question) => {
            if (question.id !== questionId) return question;
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

            // 세 Provider가 모두 최종 상태가 되기 전에는 SourceAnswer만 갱신한다.
            const allSettled = sourceAnswers.every(isSourceAnswerSettled);
            const startsReview =
              allSettled && question.status === "processing";
            if (!startsReview) {
              return { ...question, sourceAnswers, updatedAt: nowIso() };
            }

            // 모두 최종 → Mock Manager 결과(Agenda)를 만든다 (0.4 상태 전이).
            const agendas = buildMockAgendas(
              sourceAnswers,
              getActiveScenario().agendaTemplates,
              questionId,
            );
            // 충돌이 하나도 없이 전부 자동 통과(단일 소스 fallback 등)면 사용자 판단
            // 트리거가 없으므로 여기서 바로 FinalAnswer·DecisionNote를 만들고 완료한다.
            const allAgendasAutoFinal =
              agendas.length > 0 &&
              agendas.every(
                (agenda) =>
                  agenda.status === "passed" || agenda.status === "rejected",
              );
            if (allAgendasAutoFinal) {
              const settledQuestion = { ...question, sourceAnswers, agendas };
              const finalAnswer = buildMockFinalAnswer(
                agendas,
                sourceAnswers,
                questionId,
              );
              createdNote = buildMockDecisionNote(
                chat.id,
                chat.title,
                settledQuestion,
                agendas,
                finalAnswer,
              );
              const now = nowIso();
              return {
                ...settledQuestion,
                finalAnswer,
                status: "completed" as const,
                completedAt: now,
                updatedAt: now,
              };
            }
            // 충돌이 있으면 검토 단계로 전이해 사용자 판단을 기다린다.
            return {
              ...question,
              sourceAnswers,
              agendas,
              status: "review_required" as const,
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
    resolutionReason: Exclude<
      AgendaResolutionReason,
      null | "auto_consensus" | "auto_single_source"
    >,
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
            const isAccepted =
              resolutionReason === "user_accepted" ||
              resolutionReason === "user_accepted_after_recheck";
            const agendas = question.agendas.map((agenda) => {
              if (agenda.id !== agendaId) {
                return agenda;
              }
              // §9.2: 채택이면 채택 stance의 실제 참조, 직접 입력·제외면 NO_VALUE.
              // 재검토 결과 채택(user_accepted_after_recheck)은 stance와 매칭되지 않으므로
              // 해당 Agenda의 첫 stance 참조로 근거를 유지한다(최소 전환, 인용 UI는 T-019.4).
              const selectedSourceRef = isAccepted
                ? (agenda.stances.find(
                    (stance) => stance.text === selectedContent,
                  )?.sourceRefs[0] ??
                  agenda.stances[0]?.sourceRefs[0] ??
                  null)
                : NO_VALUE;
              return {
                ...agenda,
                status: isRejected
                  ? ("rejected" as const)
                  : ("passed" as const),
                resolutionReason,
                selectedContent: isRejected ? null : selectedContent,
                selectedSourceRef,
                resolvedAt,
                updatedAt: resolvedAt,
              };
            });

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

  /**
   * 서버가 돌려준 SourceAnswer 스냅샷을 반영하고, 3사가 모두 최종이면 다음 단계로 넘긴다.
   * - 하나라도 성공 → Mock Manager 비교(Agenda) 생성 + review_required (§1-② 브라우저 Mock 유지)
   * - 3사 전멸 → 고정 문구로 FinalAnswer + DecisionNote 저장 후 completed (§6.2)
   */
  function applyServerSnapshot(
    chatId: string,
    questionId: string,
    sourceAnswers: SourceAnswer[],
  ) {
    const allSettled =
      sourceAnswers.length > 0 && sourceAnswers.every(isSourceAnswerSettled);
    const allFailed =
      allSettled && sourceAnswers.every((answer) => answer.status === "failed");

    // 전멸이면 여기서 Question이 완료되므로 서버에도 완료를 영속화한다(미완료 1개 해제).
    if (serverBacked && allFailed) {
      void markQuestionCompleted(chatId, questionId).catch((error) =>
        console.error(
          "[apiStorage] Question 완료 영속화 실패:",
          error instanceof Error ? error.message : error,
        ),
      );
    }

    setState((prev) => {
      let createdNote: DecisionNote | null = null;

      const chats = prev.chats.map((chat) => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          questions: chat.questions.map((question) => {
            if (question.id !== questionId) return question;
            // 3사 전멸(6.2): 고정 문구를 FinalAnswer로 만들고 같은 문구를 노트로도 저장한다.
            // 완료 조건은 FinalAnswer + DecisionNote 둘 다이므로 노트 없이 completed로 가지 않는다.
            if (allFailed && question.finalAnswer === null) {
              const now = nowIso();
              const finalAnswer: FinalAnswer = {
                id: crypto.randomUUID(),
                questionId,
                content: allProvidersFailedContent,
                // 전 Provider 실패 전용 값은 아직 enum에 없다(AI-003에서 재검토).
                // 비교할 답변이 하나도 없으므로 all_agendas_rejected로 표기한다.
                generationMode: "all_agendas_rejected",
                createdAt: now,
              };
              createdNote = {
                id: crypto.randomUUID(),
                questionId,
                content: allProvidersFailedContent,
                createdAt: now,
                updatedAt: now,
                chatId: chat.id,
                title: chat.title,
                bullets: [allProvidersFailedContent],
              };
              return {
                ...question,
                sourceAnswers,
                agendas: [],
                finalAnswer,
                status: "completed" as const,
                completedAt: now,
                updatedAt: now,
              };
            }

            // ⚠️ 서버 경로는 여기서 Agenda를 만들지 않는다(§12.5).
            // Manager가 SSE(agenda.*)로 보내주며, 그것을 applyAgendas 가 단독으로 받는다.
            // 여기서 Mock을 만들면 잠시 뒤 서버 값으로 덮여 화면이 두 번 바뀐다.
            // 상태 전이도 Agenda가 확정된 뒤 applyAgendas 가 판단한다.
            return {
              ...question,
              sourceAnswers,
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

  /**
   * 서버 경로의 사용자 판단(§12.4). PATCH 결과 Agenda를 그대로 반영한다.
   *
   * 낙관적 갱신을 하지 않는 이유: `selectedContent`·`selectedSourceRef`는 서버가 §9.2
   * 규칙표대로 채우고 `accept`의 내용은 **서버가 원문에서 되읽는다.** 화면에서 미리
   * 만들어 두면 서버 값과 어긋난 상태가 남고, 그것이 그대로 DecisionNote에 실린다.
   */
  async function resolveAgendaOnServer(
    chatId: string,
    questionId: string,
    agendaId: string,
    body: AgendaPatchBody,
  ): Promise<void> {
    const updated = await patchAgenda(chatId, questionId, agendaId, body);
    applyJudgedAgenda(chatId, questionId, updated);
  }

  /**
   * 서버 경로의 재검토 요청·재시도(§10).
   *
   * 실패해도 상태를 되돌리지 않는다 — 서버가 `recheck_requested`를 유지하므로(§10.6)
   * 화면에서 임의로 `conflicted`로 돌리면 서버와 어긋나고 [다시 시도] 버튼이 사라진다.
   * 실패 후 현재 상태는 GET으로 화해한다.
   */
  async function requestRecheckOnServer(
    chatId: string,
    questionId: string,
    agendaId: string,
    recheckRequest: string,
    retry: boolean,
  ): Promise<void> {
    const trimmed = recheckRequest.trim();
    try {
      const updated = await patchAgenda(chatId, questionId, agendaId, {
        action: retry ? "retry_recheck" : "recheck",
        recheckRequest: trimmed.length > 0 ? trimmed : null,
      });
      applyJudgedAgenda(chatId, questionId, updated);
    } catch (error) {
      console.error(
        "[agendas] 재검토 실패:",
        error instanceof ApiStorageError
          ? `${error.code}: ${error.message}`
          : error,
      );
      // 서버가 recheck_requested 를 유지하고 있다. 그 상태를 그대로 가져와 [다시 시도]를 남긴다.
      try {
        applyAgendas(chatId, questionId, await loadAgendas(chatId, questionId));
      } catch {
        /* 화해까지 실패하면 다음 갱신에 맡긴다 */
      }
      throw error;
    }
  }

  /**
   * 판정된 쟁점 한 건을 교체한다(§12.2 조기 표시).
   * 교체 후 마감 판단은 `applyAgendas`가 하도록 넘긴다 — 규칙을 두 곳에 두지 않는다.
   */
  function applyJudgedAgenda(
    chatId: string,
    questionId: string,
    judged: Agenda,
  ) {
    // 병합만 정의하고 마감 판단은 applyAgendas 에 맡긴다 — 규칙을 두 곳에 두지 않는다.
    applyAgendas(chatId, questionId, (prev) =>
      prev.some((a) => a.id === judged.id)
        ? prev.map((a) => (a.id === judged.id ? judged : a))
        : [...prev, judged],
    );
  }

  /**
   * **Agenda 집합이 갱신되는 단 하나의 지점** (§12.5·§12.1).
   *
   * 공급원이 서버(SSE `agenda.*` / GET 복원)든 `?scenario=` Mock이든, Agenda가 정해지면
   * 반드시 여기를 지난다. 세 곳에서 각각 "scenario면 Mock, 아니면 서버"로 분기하면
   * 반드시 어긋나므로, 공급원 판단은 호출부가 하고 **마감 규칙은 여기 하나만 둔다.**
   *
   * 마감 규칙(§12.1): 전부 `passed`/`rejected`면 FinalAnswer·DecisionNote를 만들고
   * `completed`로 전이한다. **충돌 0건 경로가 여기로 뚫려 있어야 한다** — 사용자가 누를
   * 것이 없으면 사용자 행동이 트리거가 될 수 없어 Question이 `review_required`에 갇힌다.
   * 그래서 "사용자 행동"이 아니라 "Agenda 집합 갱신"에 매달아 둔다(T-019.1 회귀).
   */
  function applyAgendas(
    chatId: string,
    questionId: string,
    next: Agenda[] | ((prev: Agenda[]) => Agenda[]),
    /**
     * **Agenda 집합이 확정된 시점인가.** `agenda.done`·GET 화해·새로고침 복원이 true다.
     * `agenda.created`(draft 목록)·`agenda.judged`(진행 중)는 false다.
     *
     * 0건을 "Manager 완전 실패"로 볼 수 있는 것은 확정 시점뿐이다 — 아직 오는 중인
     * 빈 배열과 섞이면 정상 실행을 실패로 오판한다.
     */
    options?: { final?: boolean },
  ) {
    let completes = false;
    setState((prev) => {
      let createdNote: DecisionNote | null = null;
      const chats = prev.chats.map((chat) => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          questions: chat.questions.map((question) => {
            if (question.id !== questionId) return question;
            // completed 라도 **FinalAnswer 가 없으면** 아직 복원할 것이 남았다.
            // FinalAnswer·DecisionNote 는 브라우저 Mock 이라 서버에서 돌아오지 않으므로,
            // 새로고침 직후에는 `completed + finalAnswer null` 조합이 정상적으로 생긴다.
            if (question.status === "completed" && question.finalAnswer !== null) {
              return question;
            }

            const agendas =
              typeof next === "function" ? next(question.agendas) : next;

            /**
             * ⚠️ **`agendas.length > 0`을 조건에서 뺐다.**
             *
             * 같은 계열의 갇힘이 세 번 나왔다 — T-019.1(충돌 0건), T-019.4(Manager 완전
             * 실패), 그리고 이번. 원인은 매번 **마감 판단이 "무언가 있다"는 전제에 매달려**
             * 있었던 것이다. `every`는 빈 배열에서 true이므로 **0건도 자연스럽게 마감**이
             * 되고, 그래야 같은 계열이 또 안 나온다.
             */
            const allFinal = agendas.every(
              (agenda) =>
                agenda.status === "passed" || agenda.status === "rejected",
            );
            // Manager가 쟁점을 하나도 만들지 못한 경우(§2.5 완전 실패). 확정 시점에만 판단한다.
            const managerProducedNothing =
              (options?.final ?? false) && agendas.length === 0;

            if (!allFinal) {
              // 아직 판단할 것이 남았다. 충돌이 하나라도 있으면 사용자 판단을 기다린다.
              const hasConflict = agendas.some(
                (agenda) => agenda.status === "conflicted",
              );
              return {
                ...question,
                agendas,
                status: hasConflict
                  ? ("review_required" as const)
                  : question.status,
                updatedAt: nowIso(),
              };
            }

            // 아직 확정 전인 0건(진행 중)은 건드리지 않는다 — 정상 실행을 실패로 오판한다.
            if (agendas.length === 0 && !managerProducedNothing) {
              return question;
            }

            // 전부 마감됨 → FinalAnswer·DecisionNote 생성 후 완료(여전히 브라우저 Mock).
            completes = true;
            const settledQuestion = { ...question, agendas };
            const now0 = nowIso();
            /**
             * §2.5·§6.2 — Manager 완전 실패. **3사 전멸과 다르다.**
             * 원문 세 개는 그대로 살아 있으므로 `sourceAnswers`를 건드리지 않고,
             * 없는 판정을 있는 것처럼 보이지 않게 쟁점 목록도 만들지 않는다.
             */
            const finalAnswer: FinalAnswer = managerProducedNothing
              ? {
                  id: crypto.randomUUID(),
                  questionId,
                  content: managerFailedContent,
                  // 비교 결과가 없다는 뜻을 기존 enum으로 표기한다(전용 값은 AI-003 재검토).
                  generationMode: "all_agendas_rejected",
                  createdAt: now0,
                }
              : buildMockFinalAnswer(
                  agendas,
                  question.sourceAnswers,
                  questionId,
                );
            createdNote = managerProducedNothing
              ? {
                  id: crypto.randomUUID(),
                  questionId,
                  content: managerFailedContent,
                  createdAt: now0,
                  updatedAt: now0,
                  chatId: chat.id,
                  title: chat.title,
                  bullets: [managerFailedContent],
                }
              : buildMockDecisionNote(
                  chat.id,
                  chat.title,
                  settledQuestion,
                  agendas,
                  finalAnswer,
                );
            const now = nowIso();
            return {
              ...settledQuestion,
              finalAnswer,
              status: "completed" as const,
              completedAt: now,
              updatedAt: now,
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

    // §12.1 — 완료를 **서버에도 영속화한다.** 화면만 completed로 두면 새로고침 시
    // review_required로 되돌아오고 미완료 1개 제약도 풀리지 않는다.
    // 사용자 행동이 아니라 **Agenda 집합 갱신**에 매달아야 충돌 0건 경로도 함께 뚫린다.
    if (completes && serverBacked) {
      void markQuestionCompleted(chatId, questionId).catch((error) =>
        console.error(
          "[apiStorage] Question 완료 영속화 실패:",
          error instanceof Error ? error.message : error,
        ),
      );
    }
  }

  /**
   * 이전 결정 Context 구성 (SPEC-AI-001 9장 — 이번 슬라이스는 web이 실어 보낸다).
   * 직전 completed Question의 FinalAnswer + 그 이전 Question들의 DecisionNote를 문자열로 묶는다.
   * 서버는 이 값을 프롬프트 재료로만 쓰며 소유권 판단에는 쓰지 않는다(신뢰 경계).
   */
  function buildContext(chatId: string): string | null {
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return null;

    const completed = chat.questions.filter(
      (question) => question.status === "completed",
    );
    if (completed.length === 0) return null;

    const last = completed[completed.length - 1];
    const parts: string[] = [];

    if (last?.finalAnswer) {
      parts.push(`[직전 확정 답변]\n${last.finalAnswer.content}`);
    }
    const earlierNotes = state.decisionNotes
      .filter(
        (note) =>
          note.chatId === chatId &&
          completed.some(
            (question) =>
              question.id === note.questionId && question.id !== last?.id,
          ),
      )
      .map((note) => note.content);
    if (earlierNotes.length > 0) {
      parts.push(`[이전 결정 노트]\n${earlierNotes.join("\n")}`);
    }

    return parts.length > 0 ? parts.join("\n\n") : null;
  }

  /**
   * live 경로: 서버가 3사를 실호출하고 진행을 SSE로 푸시한다(§3·§4).
   * - source_answer.updated → 로딩 말풍선 점등용 진행 상태만 갱신한다.
   *   (succeeded는 structuredContent가 있어야 계약을 만족하므로, 실제 답변 배열은 done에서 한 번에 반영)
   * - done → 최종 스냅샷을 반영하고 다음 단계로 넘긴다.
   * - done 없이 스트림이 닫히면 GET 스냅샷으로 화해한다.
   */
  async function runLiveSourceAnswers(chatId: string, questionId: string) {
    const context = buildContext(chatId);
    let applied = false;
    let agendasApplied = false;

    try {
      const { done } = await startSourceAnswers(
        chatId,
        questionId,
        context,
        (event) => {
          if (event.type === "source_answer.updated") {
            setLiveStatuses((prev) => ({
              ...prev,
              [questionId]: {
                ...prev[questionId],
                [event.provider]: event.status,
              },
            }));
            return;
          }
          if (event.type === "source_answer.done") {
            applyServerSnapshot(chatId, questionId, event.sourceAnswers);
            applied = true;
            return;
          }
          // --- Manager 구간 (§12.2) ---
          if (event.type === "agenda.progress") {
            // 결과가 아니라 경과다. 저장하지 않고 진행 표시에만 쓴다.
            setManagerProgress((prev) => ({
              ...prev,
              [questionId]: {
                stage: event.stage,
                done: event.done,
                total: event.total,
              },
            }));
            return;
          }
          if (event.type === "agenda.created") {
            // draft 목록. 아직 판정 전이므로 마감 판단은 일어나지 않는다.
            applyAgendas(chatId, questionId, event.agendas);
            return;
          }
          if (event.type === "agenda.judged") {
            // **판정되는 대로 한 건씩 교체한다.** 모아두면 조기 표시가 사라진다.
            applyJudgedAgenda(chatId, questionId, event.agenda);
            return;
          }
          if (event.type === "agenda.done") {
            // 확정 스냅샷 — 0건이면 Manager 완전 실패다(§2.5).
            applyAgendas(chatId, questionId, event.agendas, { final: true });
            agendasApplied = true;
            return;
          }
        },
      );

      // 서버 크래시·프록시 절단 등으로 done을 못 받은 경우 — 현재 스냅샷으로 화해한다.
      if (!done && !applied) {
        const snapshot = await loadSourceAnswers(chatId, questionId);
        applyServerSnapshot(chatId, questionId, snapshot);
      }
      // §12.2 — Agenda 쪽 최종 스냅샷을 못 받았으면 GET으로 화해한다.
      // 특정 이벤트 이름이 아니라 "스냅샷을 받았는가"로 판단한다.
      if (!agendasApplied) {
        try {
          applyAgendas(chatId, questionId, await loadAgendas(chatId, questionId), {
            final: true,
          });
        } catch (error) {
          console.error(
            "[agendas] 스냅샷 화해 실패:",
            error instanceof Error ? error.message : error,
          );
        }
      }
    } catch (error) {
      console.error(
        "[sourceAnswers] 생성 실패:",
        error instanceof ApiStorageError
          ? `${error.code}: ${error.message}`
          : error,
      );
      // 스트림을 열지 못했거나(사전 점검 실패 등) 화해도 실패한 경우:
      // 3사를 실패로 표시해 흐름이 pending에 멈추지 않게 한다.
      if (!applied) {
        markAllFailedLocally(chatId, questionId);
      }
    } finally {
      setLiveStatuses((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setManagerProgress((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  }

  /** 서버 응답을 전혀 얻지 못했을 때의 마지막 화해 — 3사를 실패·제외로 표시한다. */
  function markAllFailedLocally(chatId: string, questionId: string) {
    const chat = state.chats.find((c) => c.id === chatId);
    const question = chat?.questions.find((q) => q.id === questionId);
    if (!question) return;
    const now = nowIso();
    applyServerSnapshot(
      chatId,
      questionId,
      question.sourceAnswers.map((answer) => ({
        ...answer,
        status: "failed" as const,
        errorCode: "UNKNOWN_ERROR" as const,
        errorMessage: "생성 결과를 확인하지 못했습니다.",
        excludedFromComparison: true,
        excludedAt: now,
        completedAt: now,
        updatedAt: now,
      })),
    );
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
    // live 경로는 서버 실호출(SSE), dev 시나리오는 기존 메모리 Mock 타임라인을 유지한다.
    if (serverBacked) {
      void runLiveSourceAnswers(question.chatId, question.id);
    } else {
      scheduleSourceAnswerFlow(question.chatId, question.id);
    }
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
          const recheckResponse =
            getActiveScenario().agendaTemplates.find(
              (template) => template.title === agenda.title,
            )?.recheckResult ??
            "공식 문서 기준의 재검색 결과를 확인하지 못했습니다.";
          const reansweredAt = nowIso();
          return {
            ...agenda,
            status: "reanswered" as const,
            // SPEC-AI-002: recheckResult는 { response, citations, revisedType } 객체.
            // 최소 전환 — citations는 빈 배열, 재분류(revisedType)는 없음(T-019.4에서 채운다).
            recheckResult: {
              response: recheckResponse,
              citations: [],
              revisedType: null,
            },
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
    /** live SSE 진행 상태(questionId → provider → status) — 로딩 말풍선 점등용 */
    liveStatuses,
    /** Manager 진행 표시(questionId → 단계·N/M). 무음 구간을 없앤다(§12.2) */
    managerProgress,
    /** 서버 Agenda를 쓰는가 — UI가 Mock 경로와 서버 경로를 가르는 유일한 신호 */
    serverBacked,
    submitQuestion,
    resolveAgenda,
    requestRecheck,
    /** 서버 경로 전용(§12.4). Mock 경로는 resolveAgenda 를 그대로 쓴다 */
    resolveAgendaOnServer,
    requestRecheckOnServer,
    selectChat,
    startNewChat,
  };
}
