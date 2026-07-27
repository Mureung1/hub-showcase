import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NAVER_API_MODE: z.enum(['DEVELOPERS', 'API_HUB']).default('DEVELOPERS'),
  NAVER_CLIENT_ID: z.string().default(''),
  NAVER_CLIENT_SECRET: z.string().default(''),
  NAVER_API_HUB_KEY: z.string().default(''),
  FMP_API_KEY: z.string().default(''),
  OPEN_DART_API_KEY: z.string().default(''),
  FRED_API_KEY: z.string().default(''),
  TOSS_INVEST_CLIENT_ID: z.string().default(''),
  TOSS_INVEST_CLIENT_SECRET: z.string().default(''),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`환경 변수 검증에 실패했습니다:\n${issues}`)
  }

  return parsed.data
}
