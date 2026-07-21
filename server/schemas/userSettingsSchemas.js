import { z } from "zod";

import {
  USER_SETTINGS_CATEGORIES,
} from "../../src/constants/userSettings.js";

const categorySchema = z.enum(USER_SETTINGS_CATEGORIES);

function unique(values) {
  return Array.from(new Set(values));
}

const categoryListSchema = z.array(categorySchema)
  .max(USER_SETTINGS_CATEGORIES.length, "관심 정보 종류를 너무 많이 선택했습니다.")
  .transform(unique);

const regionListSchema = z.array(z.string().trim().min(1, "선호 지역에 빈 값은 넣을 수 없습니다.").max(60))
  .max(20, "선호 지역은 최대 20개까지 저장할 수 있습니다.")
  .transform(unique);

export const userSettingsRequestSchema = z.object({
  recommendationCategories: categoryListSchema,
  preferredRegions: regionListSchema,
  includeOnline: z.boolean(),
  minimumMatchScore: z.number().int("최소 추천 점수는 정수여야 합니다.").min(0).max(100),
  includeUnknownDeadline: z.boolean(),
  autoSaveAnalyzedOpportunities: z.boolean(),
  recommendationLimit: z.number().int("추천 결과 개수는 정수여야 합니다.").min(1).max(50),
}).strip();