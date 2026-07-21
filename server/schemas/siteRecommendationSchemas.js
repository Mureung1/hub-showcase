import { z } from "zod";

import { SITE_INFORMATION_TYPES } from "../../src/constants/siteRecommendations.js";
import { profileSchema } from "./analyzeSchemas.js";
import { userSettingsRequestSchema } from "./userSettingsSchemas.js";

export const siteInformationTypeSchema = z.enum(SITE_INFORMATION_TYPES);

export const recommendSitesRequestSchema = z.object({
  profile: profileSchema.nullish().default(null),
  trackedSiteIds: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  desiredInformation: z.array(siteInformationTypeSchema).max(SITE_INFORMATION_TYPES.length).default([]),
  keyword: z.string().trim().max(80, "추가 검색어는 80자 이하로 입력해주세요.").nullable().optional().default(null),
  settings: userSettingsRequestSchema.optional(),
});
