import { fileURLToPath } from "node:url";
import { z } from "zod";

/**
 * 서버 환경변수 검증 — 서버 시작 시 1회 (SPEC-AUTH-003 2.1, CLAUDE.md 8장).
 * 필수 값이 없으면 명확한 메시지로 기동에 실패시킨다. 오류 메시지에 키 "값"은 노출하지 않는다.
 *
 * 필수화하는 값:
 * - SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (SPEC-AUTH-003)
 * - SUPABASE_SECRET_KEY (SPEC-DB-001 — 시스템 쓰기 클라이언트)
 * - AI_KEY_ENCRYPTION_KEY (SPEC-DB-001 — BYOK 키 암호화 마스터 키, base64 32바이트)
 * - AI Provider 앱 기본 키 3종 (SPEC-AI-001 7.4 — 단, 플래그가 ON일 때만 필수)
 */

/**
 * 답변 프롬프트 템플릿(.md) 기본 경로 — 저장소 루트의 /prompts (SPEC-AI-001 10장).
 * 이 파일 기준 상대 경로라 cwd와 무관하고, dist가 src 구조를 그대로 미러링하므로
 * dev(src/shared/config)와 build(dist/shared/config) 모두 같은 깊이로 해석된다.
 * 프롬프트는 런타임에 읽는 텍스트라 교체 시 재빌드가 필요 없다.
 */
const defaultPromptsDir = fileURLToPath(
  new URL("../../../../../prompts", import.meta.url),
);

/**
 * Manager 프롬프트(.md) 기본 경로 — 저장소 루트의 /prompts/manager (SPEC-AI-002 §15.1).
 * 로더는 이 아래에서 `classify/<version>.md`·`leftover/<version>.md`를 읽는다.
 * ⚠️ 배포 시 /prompts가 저장소 루트에 있어야 한다 (Render Root Directory 주의, §15.1).
 */
const defaultManagerPromptsDir = fileURLToPath(
  new URL("../../../../../prompts/manager", import.meta.url),
);

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

  // --- SPEC-AI-001 7장 BYOK 하이브리드 ---
  /** 사용자 키가 없을 때 앱 기본 키를 쓸지. 기본 ON (7.2) */
  APP_DEFAULT_AI_KEYS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  /** 앱 기본 키 (7.4). 플래그가 ON이면 아래 superRefine에서 필수화한다. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),

  // --- SPEC-AI-001 2.3 활성 구현·버전 선택 ---
  /** 답변 프롬프트 템플릿 루트. 파일만 교체하면 되도록 런타임에 읽는다. */
  ANSWER_PROMPTS_DIR: z.string().min(1).default(defaultPromptsDir),
  /** 사용할 프롬프트 버전. source_answers.prompt_version에 스탬프된다. */
  ANSWER_PROMPT_VERSION: z.string().min(1).default("v1"),
  /** 활성 정규화기 버전 (초기엔 v1 하나) */
  ANSWER_NORMALIZER_VERSION: z.string().min(1).default("v1"),

  /**
   * Provider별 모델 (교체·재현성을 위해 설정으로 뺀다. 저장 레코드에 스탬프).
   * 기본값은 각 provider의 **최소(최저가) 티어** — 비용을 억제하고 45초 예산 안에 들어온다.
   * 더 큰 모델이 필요하면 env로 override 한다.
   */
  CLAUDE_MODEL: z.string().min(1).default("claude-haiku-4-5"),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-nano"),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),

  // --- SPEC-AI-002 §15.2 Manager(비교·분류 엔진) 설정 ---
  // Manager는 BYOK 대상이 아니라 앱 키만 쓰는 내부 엔진이다(§15.2). 키 값은 메시지에 넣지 않는다.
  OPENROUTER_API_KEY: z
    .string({ message: "OPENROUTER_API_KEY가 필요합니다." })
    .min(1, "OPENROUTER_API_KEY가 비어 있습니다."),
  MANAGER_MODEL: z
    .string({ message: "MANAGER_MODEL이 필요합니다." })
    .min(1, "MANAGER_MODEL이 비어 있습니다."),
  /** Manager 프롬프트 루트. 파일만 교체하면 되도록 런타임에 읽는다(§15.1). */
  MANAGER_PROMPTS_DIR: z.string().min(1).default(defaultManagerPromptsDir),
  /** 단계 3·4(AgendaClassifier) 프롬프트 버전. manager_meta.classifierVersion에 스탬프. */
  CLASSIFIER_PROMPT_VERSION: z.string().min(1).default("v1"),
  /** 단계 6(ConflictComparator) 프롬프트 버전. manager_meta.comparatorVersion에 스탬프. */
  COMPARATOR_PROMPT_VERSION: z.string().min(1).default("v1"),
  /** 재검토(§10, AgendaRechecker) 프롬프트 버전. */
  RECHECKER_PROMPT_VERSION: z.string().min(1).default("v1"),
  /** 결정 6 — 충돌로 매핑할 유형 목록(쉼표 구분). 단계 6용이라 이번엔 읽기만 한다. */
  MANAGER_CONFLICT_TYPES: z.string().min(1).default("main_answer"),
  /** 단계 6 병렬 제한. 단계 6은 T-019.3 — 여기선 자리만. */
  MANAGER_CONCURRENCY: z.coerce.number().int().positive().default(3),
  /**
   * 단계 3·4(분류) 호출 타임아웃(ms). SPEC-AI-001의 45초 정책을 그대로 쓴다(§2.4).
   * 분할 후 p90이 여유롭게 들어오므로 올리지 않는다.
   */
  MANAGER_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  /**
   * 단계 6(판정)·재검토 호출 타임아웃(ms) — **분류보다 길다**(§2.4, 2026-07-30 개정).
   *
   * 실측 분포가 p50 83초·p90 111초·최대 115초라 정상 응답을 자르지 않는 값이 필요하다.
   * **120초는 잠정값이다** — F 회귀에서 fallback 비율(`judgeFailRate`)을 보고 조정한다.
   *
   * ⚠️ §2.4.2 — 이 타임아웃은 **재시도하지 않고** §2.5의 fallback stance로 직행한다.
   * 그래서 이 값이 곧 쟁점당 지연의 상한이 된다.
   */
  MANAGER_JUDGE_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  /**
   * 단계 6에만 적용하는 OpenRouter `reasoning.effort`(§15.3). 빈 문자열이면 무설정.
   *
   * ⚠️ **단계 3·4에는 적용하지 않는다.** 실측에서 지연 2.68배·토큰 2.36배로
   * 오히려 나빠졌다(3/3 회차 동일 방향, §15.3). 전형값은 거의 그대로이고
   * 실효는 최악 케이스 절단이다(최대 292.5초 → 118.4초).
   */
  MANAGER_JUDGE_REASONING_EFFORT: z
    .enum(["", "low", "medium", "high"])
    .default("low"),
})
  .superRefine((value, ctx) => {
    // 7.2: 플래그 ON이면 앱 기본 키 3종이 있어야 한다. 키 "값"은 메시지에 넣지 않는다.
    if (!value.APP_DEFAULT_AI_KEYS_ENABLED) return;
    const required = [
      "ANTHROPIC_API_KEY",
      "OPENAI_API_KEY",
      "GEMINI_API_KEY",
    ] as const;
    for (const key of required) {
      if (!value[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `APP_DEFAULT_AI_KEYS_ENABLED가 ON이면 ${key}가 필요합니다.`,
        });
      }
    }
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
