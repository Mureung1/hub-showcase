import { z } from "zod";
import { FinalAnswerGenerationModeSchema } from "./enums";

/** SPEC-SCHEMA-001 5.5 — FinalAnswer */
export const FinalAnswerSchema = z.object({
  id: z.uuid(),
  questionId: z.uuid(),
  content: z.string().min(1),
  generationMode: FinalAnswerGenerationModeSchema,
  createdAt: z.iso.datetime({ offset: true }),
});
export type FinalAnswer = z.infer<typeof FinalAnswerSchema>;
