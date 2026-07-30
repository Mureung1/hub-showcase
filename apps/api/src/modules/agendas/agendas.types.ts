import { z } from "zod";
import {
  AgendaDisagreementTypeSchema,
  AiProviderSchema,
  type AiProvider,
  type ErrorCode,
} from "@decision-log/shared";

/**
 * Manager 호출·검증 실패를 errorCode 5종(§2.4)으로 표현한다.
 * retryable = 일시적 오류(타임아웃·네트워크·5xx·429) + 스키마 검증 실패(재시도 1회 대상).
 * message에는 비밀값·토큰·응답 원문을 넣지 않는다(§16.3).
 */
export class ManagerCallError extends Error {
  constructor(
    readonly errorCode: ErrorCode,
    readonly retryable: boolean,
    message: string,
    /**
     * 구조화 출력(json_schema/strict) 거부. true면 단계와 무관하게 즉시 보고하고
     * 우회·강등하지 않는다(§B) — 응답 형식 보장이 사라지면 §11 검증 체계가 무너진다.
     */
    readonly structuredOutputUnsupported = false,
  ) {
    super(message);
    this.name = "ManagerCallError";
  }
}

/**
 * Manager 분류 파이프라인(단계 1~5)의 내부 타입 (SPEC-AI-002 §2~§7).
 *
 * ⚠️ 반환 초안은 종류에 관계없이 **같은 모양**이다(§7.7). `kind`·`stances`·
 * `selectedContent`·`resolutionReason`은 단계 7(T-019.3)이 채운다. 이 단계는
 * `participantCount`와 배정된 섹션만 확정하고, 그 값으로 단계 6 실행 여부·단계 7
 * 채우기 규칙이 결정된다. single_source를 여기서 완성형으로 만들지 않는다(§7.6).
 */

/** 성공한 SourceAnswer의 섹션 하나 (파이프라인 입력 재료). */
export interface PipelineSection {
  provider: AiProvider;
  sourceAnswerId: string;
  sectionId: string;
  title: string;
  content: string;
  /** StructuredContent 내 표시 순서(0부터). displayOrder 계산·pivot 정렬에 쓴다(§7.5). */
  order: number;
}

/**
 * 단계 5 후처리의 입력이 되는 쟁점 후보(내부). 단계 1~4가 채우고 postProcess가 초안으로 굳힌다.
 * `sections`에는 배정된 모든 섹션(pivot 유래면 pivot 섹션 포함)이 들어간다.
 */
export interface Candidate {
  id: string;
  origin: "pivot" | "new";
  title: string;
  /** pivot 섹션의 order(displayOrder 1순위). 신규 쟁점이면 null. */
  pivotOrder: number | null;
  /** 신규 쟁점 생성 순서(displayOrder 2순위). pivot 유래는 0. */
  createdOrder: number;
  /** summary 원천 — pivot 유래는 pivot 섹션 content, 신규는 topicRestated. */
  summarySource: string;
  sections: PipelineSection[];
}

/** 초안이 참조하는 근거(§7.1-4: 비교한 모든 근거 보존). */
export interface DraftSourceRef {
  provider: AiProvider;
  sourceAnswerId: string;
  sectionId: string;
  title: string;
  content: string;
}

/**
 * 단계 5까지의 균일 초안 (§7.7). 저장 전 중간 형태.
 * `id`는 런타임 부여 임시 라벨(A·B·C…, §4.1). 실제 uuid는 단계 7 저장 시점(T-019.3).
 */
export interface AgendaDraft {
  id: string;
  title: string;
  summary: string;
  displayOrder: number;
  /** 코드가 센 참여 provider 수(§7.2). 단계 6 실행 여부·단계 7 규칙을 정한다. */
  participantCount: number;
  /** 이 쟁점에 배정된 근거 섹션들. */
  sourceRefs: DraftSourceRef[];
  /** 출처 구분 — pivot 섹션 유래 / 단계 4 신규(leftover 유래). 단계 7 title·summary 규칙에 쓴다. */
  origin: "pivot" | "new";
}

/**
 * §14.2 품질 지표 — 단계 6·7과 §11 검증에서 나온다.
 * `conflictAcceptRate`·`rejectRate`는 사용자 행동에서 나오므로 여기서 계산하지 않는다.
 */
export interface ManagerQualityMetrics {
  /** 폐기된 quote / 전체 quote (경고 10% 초과 — 인용 날조·grounding 실패) */
  quoteRejectRate: number | null;
  /** 폐기 쟁점 / 생성 쟁점 (경고 5% 초과 — stance 0개 빈발) */
  agendaDropRate: number | null;
  /** fallback stance로 저장된 쟁점 비율 (경고 10% 초과 — 단계 6 불안정) */
  judgeFailRate: number | null;
  /** 유형별 건수. `main_answer` 비율이 5% 미만이면 충돌 과소 탐지 의심(§14.2·§5.5.3 결론 3) */
  disagreementTypeDist: Record<string, number>;
  /** 판정 confidence 관측값 전체. 표준편차 판단은 축적 후(§14.3) */
  confidences: number[];
  /** 단계 6 호출당 출력 토큰(§5.5의 430 추정과 대조) */
  stage6OutputTokens: number[];
  /** 단계 6 쟁점당 소요 시간(ms). 병렬 wall-clock은 stageDurationsMs.stage6. */
  stage6DurationsMs: number[];
  /**
   * quote 검증 전에 통째로 버려진 stance의 사유별 건수(§14.2).
   *
   * ⚠️ **여기 없으면 `agendaDropRate`가 튀어도 원인을 알 수 없다.** T-019.3.1에서
   * `agendaDropRate` 25% · `quoteRejectRate` 0% 사건이 프로덕션 경로에서 재현됐으나,
   * 이 필드가 `JudgeDraftsResult`에만 있고 저장 객체에 없어 진단값이 또 유실됐다.
   * 지표는 저장되는 곳까지 도달해야 지표다 — 개발 스크립트에만 보이면 사후 진단이 안 된다.
   */
  stancesDiscarded: Record<string, number>;
  /**
   * 쟁점당 (참여 provider 수, 살아남은 stance 수). **부분 손실을 드러내는 유일한 값이다.**
   *
   * §11-4는 stance가 **0개**일 때만 쟁점을 폐기한다. 참여 3개인데 stance 1개만 죽으면
   * 쟁점은 살아남고 3열 화면에 한 칸이 빈다 — **판정은 3사를 보고 내렸는데 근거는 2개만
   * 남는다.** `agendaDropRate`는 이 경우를 0으로 세고 `quoteRejectRate`는 원인이
   * `quotes: []`면 0이므로, 이 배열이 없으면 손실이 어디에도 기록되지 않는다.
   *
   * 비율로 뭉개지 않고 쌍 그대로 남긴다 — "3중 1 손실"과 "2중 1 손실"은 다른 사건이다.
   */
  stanceSurvival: { participants: number; survived: number }[];
  /**
   * 부분 손실을 코드 stance로 메운 건수(§7.6·§11.2, T-019.4).
   * `stanceSurvival`이 "얼마나 죽었나"라면 이쪽은 "얼마나 메웠나"다 — 3열의 그만큼이
   * LLM 요약이 아니라 섹션 제목으로 채워졌다는 뜻이므로 품질 해석에 필요하다.
   */
  stancesFilled: number;
}

/**
 * §14.1 프로세스 지표 중 단계 1~5에서 계산 가능한 것 + 단계 6·7 품질 지표(§14.2).
 */
export interface ManagerMetrics {
  /** 재배정 수 / leftover 수 (경고 임계 50% 초과) */
  reassignmentRate: number | null;
  /** 2개 배정 섹션 / 비-pivot 섹션 (경고 30% 초과) */
  multiAssignRate: number | null;
  /** 실제 수정 제목 / 의심 판정 제목 (경고 20% 미만) */
  titleRevisionRate: number | null;
  /** leftover 섹션 / 비-pivot 섹션 (경고 40% 초과) */
  leftoverRate: number | null;
  /** 이번 실행의 pivot provider (누적 분포는 저장 계층에서 집계) */
  pivotProvider: AiProvider;
  /** 단계 3 실측 출력 토큰 (§5.5의 800 가정 검증, 경고 1500 초과) */
  stage3OutputTokens: number | null;
  /** 단계별 소요 시간(ms) — 실측 항목(§2.3) */
  stageDurationsMs: {
    stage3: number | null;
    stage4: number | null;
    /** 단계 6 병렬 wall-clock. 쟁점당 지연은 quality.stage6DurationsMs. */
    stage6: number | null;
    total: number;
  };
  /** §14.2 품질 지표. 단계 6을 실행하지 않은 경로에서도 형태는 유지한다. */
  quality: ManagerQualityMetrics;
}

/**
 * §3.3 실행 메타 스탬프. 이 단계는 **반환·스크립트 출력에만** 싣는다(DB 기록은 T-019.3).
 */
export interface ManagerMeta {
  pivotProvider: AiProvider;
  pivotSelectionReason: "max_sections" | "hash_tiebreak";
  shuffleSeed: number;
  managerModel: string;
  classifierVersion: string;
  comparatorVersion: string;
  /** 판정 시점 충돌 유형 설정 스탬프(결정 6). 단계 6은 T-019.3이지만 스탬프는 지금 남긴다. */
  conflictTypes: string[];
  metrics: ManagerMetrics;
  /** 실패 시에만 안전 가공 요지(최대 500자, §16.3). 정상 경로에서는 없음. */
  lastError?: string;
}

/**
 * 관측용 추적 정보 (검증 스크립트 출력 전용). 저장 계약(T-019.3)에는 실리지 않는다 —
 * leftover 처리·제목 중립화 전후처럼 초안에는 남지 않는 파이프라인 내부를 드러낸다.
 */
/**
 * 단계 3의 provider별 호출 결과(§5.1 분할). 호출 성공/실패를 명시적으로 남겨,
 * "모델이 배정 안 함"과 "호출이 실패해서 leftover"를 구분한다(§6.3 실패 모드 오진 방지).
 */
export interface Stage3CallInfo {
  provider: AiProvider;
  ok: boolean;
  /** 이 호출의 출력 토큰(§14.1 경고 1,500은 호출당에 적용). 실패·미상이면 null. */
  tokens: number | null;
  durationMs: number;
  /** 단계 3b(누락 재호출) 여부. */
  retried: boolean;
}

export interface PipelineTrace {
  leftoverSectionIds: string[];
  reassignments: { sectionId: string; agendaId: string }[];
  newAgendaIds: string[];
  titleRevisions: { agendaId: string; before: string; after: string }[];
  /** provider별 단계 3 호출 결과(성공/실패·토큰·지연). */
  stage3Calls: Stage3CallInfo[];
  stage3bInvoked: boolean;
  stage3Failed: boolean;
  stage4Ran: boolean;
}

export interface BuildAgendaDraftsResult {
  drafts: AgendaDraft[];
  managerMeta: ManagerMeta;
  trace: PipelineTrace;
}

// ---------------------------------------------------------------------------
// Manager 출력 Zod 계약 — 외부 데이터이므로 검증 전까지 신뢰하지 않는다(CLAUDE.md 5장).
// ID(sectionId·agendaId)는 z.string()으로 받고 실존 검증은 postProcess가 한다(§7.1-3).
// (LLM에 보내는 JSON Schema의 enum 앵커 제약은 어댑터가 런타임에 생성한다 — §16.2.)
// ---------------------------------------------------------------------------

/** 단계 3 출력 (§5.4). */
export const ClassifyAssignmentSchema = z.object({
  sectionId: z.string(),
  topicRestated: z.string(),
  agendaIds: z.array(z.string()).max(2),
  // 스키마 다이어트(§5.5.2 B-2)로 optional화 시도 — 파이프라인에서 읽지 않는 필드다.
  secondAgendaReason: z.string().optional(),
});
export const ClassifyOutputSchema = z.object({
  assignments: z.array(ClassifyAssignmentSchema),
});
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

/** 단계 4 출력 (§6.6). leftover=0이면 titleRevisions만 있는 축소 스키마를 쓴다(§6.1). */
export const TitleRevisionSchema = z.object({
  agendaId: z.string(),
  issue: z.string(),
  newTitle: z.string(),
});
export const ReassignmentSchema = z.object({
  sectionId: z.string(),
  reassignReason: z.string(),
  agendaId: z.string(),
});
export const NewAgendaSchema = z.object({
  topicRestated: z.string(),
  title: z.string(),
  sectionIds: z.array(z.string()),
});
export const LeftoverOutputSchema = z.object({
  titleRevisions: z.array(TitleRevisionSchema),
  reassignments: z.array(ReassignmentSchema),
  newAgendas: z.array(NewAgendaSchema),
});
export type LeftoverOutput = z.infer<typeof LeftoverOutputSchema>;

/** 축소 스키마 — leftover=0일 때. */
export const LeftoverTitleOnlyOutputSchema = z.object({
  titleRevisions: z.array(TitleRevisionSchema),
});

/**
 * 단계 6 출력 (§8.6).
 *
 * 필드 순서가 사고 순서다 — `comparisonNote`(추론)가 `disagreementType`(결론)보다,
 * `quotes`(원문 찾기)가 `text`(압축)보다 앞이다. `comparisonNote`는 저장하지 않고 버린다(§8.6).
 *
 * `provider`를 여기서 enum으로 좁히지 않는 이유: 참여 provider는 쟁점마다 다르므로
 * LLM에 보내는 JSON Schema에서 런타임 enum으로 제약하고(§8.6), 서버 쪽 검증은
 * "그 쟁점의 참여자인가"를 §11에서 확인한다.
 */
export const CompareStanceSchema = z.object({
  provider: AiProviderSchema,
  quotes: z.array(z.string()),
  text: z.string(),
});
export const CompareOutputSchema = z.object({
  comparisonNote: z.string(),
  stances: z.array(CompareStanceSchema),
  disagreementType: AgendaDisagreementTypeSchema,
  confidence: z.number(),
});
export type CompareOutput = z.infer<typeof CompareOutputSchema>;
