import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
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
  API_PORT: process.env.API_PORT ?? process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  PATIENT_WEB_ORIGIN: process.env.PATIENT_WEB_ORIGIN,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_POOL_MAX: process.env.DB_POOL_MAX,
  DB_CONNECTION_TIMEOUT_MS: process.env.DB_CONNECTION_TIMEOUT_MS,
  DB_IDLE_TIMEOUT_MS: process.env.DB_IDLE_TIMEOUT_MS,
  DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
});
