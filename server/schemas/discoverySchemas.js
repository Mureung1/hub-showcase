import { z } from "zod";

export const noticeDiscoveryQuerySchema = z.object({
  sourceId: z.string().trim().min(1, "공지 출처를 선택해주세요.").max(80),
  keyword: z.string().trim().max(80, "검색어는 80자 이하로 입력해주세요.").optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
