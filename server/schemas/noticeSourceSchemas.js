import { z } from "zod";

const sourceModeSchema = z.enum(["live", "manual"]);

export const noticeSourceRequestSchema = z.object({
  category: z.string().trim().min(1, "출처 분류를 입력해 주세요.").max(80).default("직접 추가"),
  html: z.string().max(800_000, "HTML 입력은 800,000자 이하여야 합니다.").default(""),
  linkSelector: z.string().trim().min(1, "링크 선택자를 입력해 주세요.").max(300).default("a[href]"),
  name: z.string().trim().min(1, "출처 이름을 입력해 주세요.").max(120),
  sourceMode: sourceModeSchema.default("live"),
  targetUrl: z.string().trim().url("올바른 웹사이트 URL을 입력해 주세요.").max(2_000),
}).strip();

export const noticeSourceIdSchema = z.string().uuid("저장된 출처 식별자가 올바르지 않습니다.");