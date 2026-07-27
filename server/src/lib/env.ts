import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().optional(),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  allowedOrigins: parsedEnv.ALLOWED_ORIGINS
    ? parsedEnv.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : [],
};
