import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AgendaSchema,
  NO_VALUE,
  type Agenda,
  type AgendaResolutionReason,
  type AgendaStance,
  type SourceRef,
} from "@decision-log/shared";

import type { AgendaDraft, ManagerMeta } from "./agendas.types.js";
import type { FinalizedAgenda } from "./pipeline/finalize.js";

/**
 * Agenda Repository (SPEC-AI-002 §12.1, data-model 3.5).
 *
 * 클라이언트 구분을 지킨다(ADR-002).
 * - **시스템 쓰기**(Agenda 생성·판정 저장, Question 전이, manager_meta): `adminClient`(Secret Key).
 *   Service가 검증된 JWT userId로 소유권을 먼저 확인한 뒤에만 여기 들어온다.
 * - **조회·사용자 행동 쓰기**(채택·직접 입력·제외): 사용자 JWT 클라이언트(RLS).
 * - 클라이언트가 보낸 userId는 어느 경로에서도 신뢰하지 않는다.
 *
 * DB 응답은 shared 스키마로 Zod 검증하고 snake_case↔camelCase 변환은 이 경계에서 한다.
 * ⚠️ `stances`를 매핑에서 빠뜨리면 저장은 되는데 조회에서 빈 배열로 돌아온다 — 3열 비교가 사라진다.
 */

/**
 * 조회 컬럼. `prompt_version`은 **의도적으로 제외** — 판정에 쓴 comparator 버전은
 * 서버 내부 관측값이고 `AgendaSchema`에 없다(계약 미노출은 의도된 것, §13.2 개정 기록).
 */
const COLUMNS =
  "id, question_id, status, resolution_reason, kind, title, summary, " +
  "selected_content, selected_source_ref, user_note, stances, source_refs, " +
  "disagreement_type, revised_type, confidence, display_order, " +
  "recheck_request, recheck_result, recheck_requested_at, reanswered_at, " +
  "resolved_at, created_at, updated_at";

/** DB row(snake) → shared Agenda(camel). 검증 포함. */
function toAgenda(row: unknown): Agenda {
  const r = row as Record<string, unknown>;
  return AgendaSchema.parse({
    id: r.id,
    questionId: r.question_id,
    status: r.status,
    resolutionReason: r.resolution_reason ?? null,
    kind: r.kind ?? null,
    title: r.title,
    summary: r.summary,
    selectedContent: r.selected_content ?? null,
    selectedSourceRef: r.selected_source_ref ?? null,
    userNote: r.user_note ?? null,
    stances: r.stances ?? [],
    sourceRefs: r.source_refs ?? [],
    disagreementType: r.disagreement_type ?? null,
    revisedType: r.revised_type ?? null,
    // numeric(3,2)는 드라이버에 따라 문자열로 올 수 있어 명시적으로 수치화한다.
    confidence: r.confidence === null || r.confidence === undefined
      ? null
      : Number(r.confidence),
    displayOrder: r.display_order,
    recheckRequest: r.recheck_request ?? null,
    recheckResult: r.recheck_result ?? null,
    recheckRequestedAt: r.recheck_requested_at ?? null,
    reansweredAt: r.reanswered_at ?? null,
    resolvedAt: r.resolved_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

/** 초안의 근거 참조를 계약 형태(SourceRef)로 줄인다 — title·content는 원본에서 다시 읽는다. */
function toStoredSourceRefs(draft: AgendaDraft): SourceRef[] {
  return draft.sourceRefs.map((ref) => ({
    sourceAnswerId: ref.sourceAnswerId,
    sectionId: ref.sectionId,
  }));
}

/**
 * 단계 5 완료 — 쟁점 목록을 `draft`로 **일괄 INSERT** 한다(§12.1 1단계).
 *
 * 단계 6이 병렬이라 완료 시점이 제각각이다. 목록을 먼저 확정해두면 중간에 서버가 죽어도
 * 쟁점 자체는 남고, SSE로 보낸 것과 DB 상태가 어긋나지 않는다.
 * 반환 순서는 `display_order`로 고정한다 — 임시 라벨(A·B·C)과 실제 uuid를 잇는 근거다.
 */
export async function insertDrafts(
  adminClient: SupabaseClient,
  questionId: string,
  drafts: AgendaDraft[],
): Promise<Agenda[]> {
  if (drafts.length === 0) return [];
  const { data, error } = await adminClient
    .from("agendas")
    .insert(
      drafts.map((draft) => ({
        question_id: questionId,
        status: "draft",
        resolution_reason: null,
        kind: null,
        title: draft.title,
        summary: draft.summary,
        selected_content: null,
        selected_source_ref: null,
        // draft는 단계 6이 아직 채우지 않은 상태다 — CHECK(agendas_stances_ck)가 허용하는 유일한 예외.
        stances: [],
        source_refs: toStoredSourceRefs(draft),
        display_order: draft.displayOrder,
      })),
    )
    .select(COLUMNS);
  if (error) throw new Error(`Agenda 생성 실패: ${error.message}`);
  // INSERT ... RETURNING 의 행 순서는 보장되지 않는다. 표시 순서는 여기서 확정한다(§7.5).
  return (data ?? [])
    .map(toAgenda)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * 단계 6·7 완료 — 쟁점 하나를 마감 상태로 UPDATE 한다(§12.1 2단계).
 * 쟁점마다 완료 즉시 호출된다. 모아서 한 번에 쓰지 않는다(조기 표시).
 */
export async function updateJudged(
  adminClient: SupabaseClient,
  agendaId: string,
  finalized: FinalizedAgenda,
  comparatorVersion: string | null,
): Promise<Agenda> {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from("agendas")
    .update({
      status: finalized.status,
      resolution_reason: finalized.resolutionReason,
      kind: finalized.kind,
      stances: finalized.stances,
      selected_content: finalized.selectedContent,
      selected_source_ref: finalized.selectedSourceRef,
      disagreement_type: finalized.disagreementType,
      confidence: finalized.confidence,
      // §15.4 — 이 Agenda의 판정 기준이 된 comparator 버전. 단계 6을 타지 않았으면 null.
      prompt_version: comparatorVersion,
      resolved_at: finalized.status === "passed" ? now : null,
      updated_at: now,
    })
    .eq("id", agendaId)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Agenda 판정 저장 실패: ${error.message}`);
  return toAgenda(data);
}

/**
 * §11-4로 폐기된 쟁점의 draft 행을 지운다.
 *
 * 근거 없는 비교 결과를 정상 데이터로 남기지 않기 위해서다(§11·CLAUDE.md 12장).
 * 판정 실패는 폐기가 아니라 fallback stance로 살아남으므로(§2.5) 여기로 오지 않는다 —
 * 여기 오는 것은 인용이 전부 날조여서 stance가 0개가 된 쟁점뿐이다.
 */
export async function deleteAgendas(
  adminClient: SupabaseClient,
  agendaIds: string[],
): Promise<void> {
  if (agendaIds.length === 0) return;
  const { error } = await adminClient
    .from("agendas")
    .delete()
    .in("id", agendaIds);
  if (error) throw new Error(`Agenda 폐기 실패: ${error.message}`);
}

/**
 * Question의 Agenda 스냅샷. 사용자 클라이언트(RLS)로 조회하면 본인 것만 보인다.
 * 표시 순서는 `display_order`가 소유한다(§7.5) — `created_at`은 일괄 INSERT라 동일할 수 있다.
 */
export async function listByQuestion(
  client: SupabaseClient,
  questionId: string,
): Promise<Agenda[]> {
  const { data, error } = await client
    .from("agendas")
    .select(COLUMNS)
    .eq("question_id", questionId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Agenda 조회 실패: ${error.message}`);
  return (data ?? []).map(toAgenda);
}

/** 사용자 판단 대상 Agenda 한 건. RLS로 남의 것은 보이지 않는다. */
export async function findOwnedAgenda(
  userClient: SupabaseClient,
  questionId: string,
  agendaId: string,
): Promise<Agenda | null> {
  const { data, error } = await userClient
    .from("agendas")
    .select(COLUMNS)
    .eq("id", agendaId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (error) throw new Error(`Agenda 조회 실패: ${error.message}`);
  if (!data) return null;
  return toAgenda(data);
}

/** 사용자 판단 결과(§9.2 사용자 행동 3행). `userClient`(RLS)로 쓴다 — 사용자 행동이므로. */
export interface UserDecisionPatch {
  status: "passed" | "rejected";
  resolutionReason: AgendaResolutionReason;
  selectedContent: string | null;
  selectedSourceRef: SourceRef | typeof NO_VALUE;
  userNote: string | null;
}

export async function applyUserDecision(
  userClient: SupabaseClient,
  agendaId: string,
  patch: UserDecisionPatch,
): Promise<Agenda> {
  const now = new Date().toISOString();
  const { data, error } = await userClient
    .from("agendas")
    .update({
      status: patch.status,
      resolution_reason: patch.resolutionReason,
      selected_content: patch.selectedContent,
      selected_source_ref: patch.selectedSourceRef,
      ...(patch.userNote === null ? {} : { user_note: patch.userNote }),
      resolved_at: now,
      updated_at: now,
    })
    .eq("id", agendaId)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Agenda 판단 저장 실패: ${error.message}`);
  return toAgenda(data);
}

/** §3.3 실행 메타 스탬프. 재현·감사용이며 시스템 쓰기다. */
export async function saveManagerMeta(
  adminClient: SupabaseClient,
  questionId: string,
  managerMeta: ManagerMeta,
): Promise<void> {
  const { error } = await adminClient
    .from("questions")
    .update({ manager_meta: managerMeta, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw new Error(`manager_meta 저장 실패: ${error.message}`);
}

/**
 * §12.1 — conflict 쟁점이 1개 이상일 때만 `review_required`로 전이한다.
 *
 * ⚠️ 충돌 0건이면 **이 함수를 호출하지 않는다.** 사용자가 누를 것이 없는데 전이시키면
 * 사용자 행동이 다음 단계의 트리거가 될 수 없어 Question이 갇힌다. 예외가 아니라 정상 경로다.
 * `completed` 전이는 이번 범위에서 web의 기존 PATCH가 수행한다(FinalAnswer는 아직 Mock).
 */
export async function markReviewRequired(
  adminClient: SupabaseClient,
  questionId: string,
): Promise<void> {
  const { error } = await adminClient
    .from("questions")
    .update({
      status: "review_required",
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);
  if (error) throw new Error(`Question 상태 전이 실패: ${error.message}`);
}

/** 스냅샷에 필요한 stance 원문을 SourceAnswer에서 되읽는다(사용자 채택 시 내용 확정용). */
export async function findSectionContent(
  client: SupabaseClient,
  sourceAnswerId: string,
  sectionId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("source_answers")
    .select("structured_content")
    .eq("id", sourceAnswerId)
    .maybeSingle();
  if (error) throw new Error(`SourceAnswer 조회 실패: ${error.message}`);
  if (!data) return null;

  const content = (data as Record<string, unknown>).structured_content;
  if (typeof content !== "object" || content === null) return null;
  const sections = (content as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return null;

  for (const section of sections) {
    if (typeof section !== "object" || section === null) continue;
    const s = section as Record<string, unknown>;
    if (s.sectionId === sectionId && typeof s.content === "string") {
      return s.content;
    }
  }
  return null;
}

/** stance 배열에 그 참조가 실제로 들어 있는지(사용자가 보낸 참조를 신뢰하지 않는다). */
export function hasSourceRef(
  stances: AgendaStance[],
  ref: SourceRef,
): boolean {
  return stances.some((stance) =>
    stance.sourceRefs.some(
      (candidate) =>
        candidate.sourceAnswerId === ref.sourceAnswerId &&
        candidate.sectionId === ref.sectionId,
    ),
  );
}
