import { z } from "zod";
import {
  AgendaStatusSchema,
  AgendaResolutionReasonSchema,
  AgendaKindSchema,
  AgendaDisagreementTypeSchema,
  AiProviderSchema,
} from "./enums.js";
import { NO_VALUE } from "../constants/noValue.js";

/** 최종 상태(passed/rejected)에서 resolutionReason이 필수인 상태 집합 */
const RESOLVED_STATUSES = ["passed", "rejected"] as const;

/**
 * SPEC-AI-002 — Agenda 근거 참조. SourceAnswer와 그 안의 Section을 가리킨다.
 * sourceAnswerId는 SourceAnswer.id(uuid), sectionId는 StructuredContent의 안정 식별자.
 */
export const SourceRefSchema = z.object({
  sourceAnswerId: z.uuid(),
  sectionId: z.string().min(1),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

/**
 * SPEC-AI-002 — 충돌 쟁점에서 각 provider의 입장(stance).
 * quotes·sourceRefs에 .min(1)을 거는 이유: Spec §11 검증 2·4번("quotes가 0개면 stance
 * 폐기")을 계약 수준에서도 강제한다. 근거 없는 비교 결과를 정상 데이터로 저장하지 않는다.
 */
export const AgendaStanceSchema = z.object({
  provider: AiProviderSchema,
  text: z.string(),
  /** 원문에서 실제로 잘라낸 부분 문자열(§11 검증 2·3번). 1개 이상 */
  quotes: z.array(z.string()).min(1),
  /** 근거가 된 SourceAnswer·Section 참조. 1개 이상 */
  sourceRefs: z.array(SourceRefSchema).min(1),
});
export type AgendaStance = z.infer<typeof AgendaStanceSchema>;

/** SPEC-AI-002 §11 검증 8번 — 재검토 결과의 인용(원문 부분 문자열 검증 대상). */
export const AgendaCitationSchema = z.object({
  sectionId: z.string().min(1),
  quote: z.string().min(1),
});
export type AgendaCitation = z.infer<typeof AgendaCitationSchema>;

/**
 * SPEC-AI-002 §10 — 재검토(Manager 호출 4) 결과.
 * response: 재검색 응답 본문 / citations: 인용 목록 / revisedType: 재분류 결과(없으면 null).
 */
export const AgendaRecheckResultSchema = z.object({
  response: z.string(),
  citations: z.array(AgendaCitationSchema),
  revisedType: AgendaDisagreementTypeSchema.nullable(),
});
export type AgendaRecheckResult = z.infer<typeof AgendaRecheckResultSchema>;

/** selected_source_ref 값(1.6): 실제 참조 | NO_VALUE(직접입력·제외) | null(미판단) */
const SelectedSourceRefSchema = z
  .union([SourceRefSchema, z.literal(NO_VALUE)])
  .nullable();

/** SPEC-SCHEMA-001 5.4 + SPEC-AI-002 §7·§9 — Agenda */
export const AgendaSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    status: AgendaStatusSchema,
    resolutionReason: AgendaResolutionReasonSchema.nullable(),
    // SPEC-AI-002: draft 시점엔 미정이므로 nullable
    kind: AgendaKindSchema.nullable(),
    title: z.string().min(1).max(200),
    summary: z.string(),
    selectedContent: z.string().nullable(),
    selectedSourceRef: SelectedSourceRefSchema,
    userNote: z.string().nullable(),
    // SPEC-AI-002 §7.2 — provider별 입장. Manager 판정 전이면 빈 배열.
    stances: z.array(AgendaStanceSchema).default([]),
    // SPEC-AI-002 정식화: 자유형 unknown[] → SourceRef[]
    sourceRefs: z.array(SourceRefSchema).default([]),
    // SPEC-AI-002 §8.4 — Manager 판정 유형·재검토 재분류(관측값 없으면 null)
    disagreementType: AgendaDisagreementTypeSchema.nullable(),
    revisedType: AgendaDisagreementTypeSchema.nullable(),
    // SPEC-AI-002 결정 9 — 판정 confidence 관측값(0~1, 없으면 null)
    confidence: z.number().min(0).max(1).nullable(),
    // SPEC-AI-002 §7.5 — 표시 순서(단계 5에서 부여, 0부터)
    displayOrder: z.number().int().min(0),
    recheckRequest: z.string().nullable(),
    // SPEC-AI-002 정식화: 자유형 unknown → AgendaRecheckResult
    recheckResult: AgendaRecheckResultSchema.nullable(),
    recheckRequestedAt: z.iso.datetime({ offset: true }).nullable(),
    reansweredAt: z.iso.datetime({ offset: true }).nullable(),
    resolvedAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((value, ctx) => {
    const isResolved = (RESOLVED_STATUSES as readonly string[]).includes(
      value.status,
    );
    // 6장: passed/rejected면 resolutionReason 필수, 그 외 상태면 null
    if (isResolved && value.resolutionReason === null) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionReason"],
        message: "status가 passed/rejected면 resolutionReason은 필수다.",
      });
    }
    if (!isResolved && value.resolutionReason !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionReason"],
        message:
          "status가 passed/rejected가 아니면 resolutionReason은 null이어야 한다.",
      });
    }
    // 6장: passed면 selectedContent 필수 (auto_consensus 포함)
    if (value.status === "passed" && value.selectedContent === null) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedContent"],
        message: "status가 passed면 selectedContent는 필수다.",
      });
    }
    // SPEC-AI-002 §3.4·§9.2: single_source면 resolutionReason은 auto_single_source
    if (
      value.kind === "single_source" &&
      value.resolutionReason !== "auto_single_source"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionReason"],
        message:
          "kind가 single_source면 resolutionReason은 auto_single_source여야 한다.",
      });
    }
    // SPEC-AI-002 §9.2: conflicted(미판단)면 selectedContent·selectedSourceRef 모두 null
    if (value.status === "conflicted") {
      if (value.selectedContent !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["selectedContent"],
          message: "status가 conflicted면 selectedContent는 null이어야 한다.",
        });
      }
      if (value.selectedSourceRef !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["selectedSourceRef"],
          message: "status가 conflicted면 selectedSourceRef는 null이어야 한다.",
        });
      }
    }
    // SPEC-AI-002 §9.2·§9.3(결정 1): 자동 통과·사용자 채택은 실제 참조(NO_VALUE 아님)
    const REAL_REF_REASONS: readonly string[] = [
      "auto_consensus",
      "auto_single_source",
      "user_accepted",
      "user_accepted_after_recheck",
    ];
    // 직접 입력·제외는 NO_VALUE
    const NO_VALUE_REASONS: readonly string[] = [
      "user_composed",
      "user_composed_after_recheck",
      "user_rejected",
      "user_rejected_after_recheck",
    ];
    if (value.resolutionReason !== null) {
      if (REAL_REF_REASONS.includes(value.resolutionReason)) {
        if (
          value.selectedSourceRef === null ||
          value.selectedSourceRef === NO_VALUE
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["selectedSourceRef"],
            message:
              "자동 통과·사용자 채택이면 selectedSourceRef는 실제 참조여야 한다(NO_VALUE 불가).",
          });
        }
      } else if (NO_VALUE_REASONS.includes(value.resolutionReason)) {
        if (value.selectedSourceRef !== NO_VALUE) {
          ctx.addIssue({
            code: "custom",
            path: ["selectedSourceRef"],
            message:
              "직접 입력·제외면 selectedSourceRef는 NO_VALUE여야 한다.",
          });
        }
      }
    }
  });
export type Agenda = z.infer<typeof AgendaSchema>;
