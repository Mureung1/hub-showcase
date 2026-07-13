import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGINS: z.string().min(1),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  KAKAO_REST_API_KEY: z.string().min(1),
  LOG_LEVEL: z.string().min(1).default('info'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const missingFields = parsed.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
    .join(', ')

  throw new Error(`환경 변수를 확인해주세요: ${missingFields}`)
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}
