import { z } from "zod";

/**
 * SPEC-SCHEMA-001 5.6 — DecisionNote.
 * 결정 2-1: seq·sources 필드는 존재하지 않는다. 노트 번호·정렬이 필요하면
 * Question의 sequenceNumber에서 파생한다(join 정렬).
 */
export const DecisionNoteSchema = z.object({
  id: z.uuid(),
  questionId: z.uuid(),
  content: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type DecisionNote = z.infer<typeof DecisionNoteSchema>;
