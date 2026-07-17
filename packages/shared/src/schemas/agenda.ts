import { z } from "zod";
import { AgendaStatusSchema, AgendaResolutionReasonSchema } from "./enums";

/** 최종 상태(passed/rejected)에서 resolutionReason이 필수인 상태 집합 */
const RESOLVED_STATUSES = ["passed", "rejected"] as const;

/** SPEC-SCHEMA-001 5.4 — Agenda */
export const AgendaSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    status: AgendaStatusSchema,
    resolutionReason: AgendaResolutionReasonSchema.nullable(),
    title: z.string().min(1).max(200),
    summary: z.string(),
    selectedContent: z.string().nullable(),
    userNote: z.string().nullable(),
    // 결정 2-2: 자유형 JSON. 정식 모양은 SPEC-AI-002(Manager)에서 확정한다.
    sourceRefs: z.array(z.unknown()).default([]),
    recheckRequest: z.string().nullable(),
    // 결정 2-2: 자유형 JSON. recheckResult: string → unknown 전환.
    recheckResult: z.unknown().nullable(),
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
  });
export type Agenda = z.infer<typeof AgendaSchema>;
