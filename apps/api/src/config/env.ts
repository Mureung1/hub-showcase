import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGIN: z
    .string()
    .default("http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175")
    .transform((value, context) => {
      const origins = value.split(",").map((origin) => origin.trim());
      if (origins.some((origin) => !z.url().safeParse(origin).success)) {
        context.addIssue({ code: "custom", message: "CORS_ORIGIN 값을 확인해 주세요." });
        return z.NEVER;
      }
      return origins;
    }),
  PATIENT_WEB_ORIGIN: z.url().default("http://127.0.0.1:5173"),
  STAFF_HOSPITAL_ID: z
    .uuid()
    .default("10000000-0000-4000-8000-000000000001"),
  ALLOW_DEV_STAFF_AUTH_BYPASS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  SUPABASE_URL: z.url().default("https://PROJECT_REF.supabase.co"),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).default("sb_publishable_REPLACE_ME"),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL은 PostgreSQL 연결 문자열이어야 합니다.",
    ),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  DB_SSL_REJECT_UNAUTHORIZED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  API_PORT: process.env.API_PORT ?? process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  PATIENT_WEB_ORIGIN: process.env.PATIENT_WEB_ORIGIN,
  STAFF_HOSPITAL_ID: process.env.STAFF_HOSPITAL_ID,
  ALLOW_DEV_STAFF_AUTH_BYPASS: process.env.ALLOW_DEV_STAFF_AUTH_BYPASS,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_POOL_MAX: process.env.DB_POOL_MAX,
  DB_CONNECTION_TIMEOUT_MS: process.env.DB_CONNECTION_TIMEOUT_MS,
  DB_IDLE_TIMEOUT_MS: process.env.DB_IDLE_TIMEOUT_MS,
  DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
});

if (env.NODE_ENV === "production" && env.ALLOW_DEV_STAFF_AUTH_BYPASS) {
  throw new Error("production에서는 ALLOW_DEV_STAFF_AUTH_BYPASS를 사용할 수 없습니다.");
}
