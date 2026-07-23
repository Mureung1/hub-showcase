import { z } from "zod";

export const savedOpportunityIdSchema = z.string().uuid("저장 공고 ID 형식이 올바르지 않습니다.");

export const savedOpportunitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});