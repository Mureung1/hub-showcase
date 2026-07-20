import { z } from "zod";

/**
 * 서버 환경변수 검증 — 서버 시작 시 1회 (SPEC-AUTH-003 2.1, CLAUDE.md 8장).
 * 필수 값이 없으면 명확한 메시지로 기동에 실패시킨다. 오류 메시지에 키 "값"은 노출하지 않는다.
 *
 * 필수화하는 값:
 * - SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (SPEC-AUTH-003)
 * - SUPABASE_SECRET_KEY (SPEC-DB-001 — 시스템 쓰기 클라이언트)
 * - AI_KEY_ENCRYPTION_KEY (SPEC-DB-001 — BYOK 키 암호화 마스터 키, base64 32바이트)
 * AI Provider 키는 각 AI Spec에서 필수화한다.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  SUPABASE_URL: z.url({ message: "SUPABASE_URL은 유효한 URL이어야 합니다." }),
  SUPABASE_PUBLISHABLE_KEY: z
    .string({ message: "SUPABASE_PUBLISHABLE_KEY가 필요합니다." })
    .min(1, "SUPABASE_PUBLISHABLE_KEY가 비어 있습니다."),
  SUPABASE_SECRET_KEY: z
    .string({ message: "SUPABASE_SECRET_KEY가 필요합니다." })
    .min(1, "SUPABASE_SECRET_KEY가 비어 있습니다."),
  AI_KEY_ENCRYPTION_KEY: z
    .string({ message: "AI_KEY_ENCRYPTION_KEY가 필요합니다." })
    .min(1, "AI_KEY_ENCRYPTION_KEY가 비어 있습니다.")
    .refine(
      (value) => Buffer.from(value, "base64").length === 32,
      "AI_KEY_ENCRYPTION_KEY는 base64로 인코딩된 32바이트(AES-256) 키여야 합니다.",
    ),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

/**
 * 환경변수를 검증해 반환한다. 실패 시 어떤 키가 문제인지(키 이름만) 담아 throw 한다.
 * 값 자체는 절대 메시지에 넣지 않는다.
 */
export function loadEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // issue.path(키 이름)와 message만 사용한다 — 값은 노출하지 않는다.
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `서버 환경변수 검증 실패 — apps/api/.env를 확인하세요. [${details}]`,
    );
  }

  cached = parsed.data;
  return cached;
}
