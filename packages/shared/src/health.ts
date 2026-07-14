import { z } from "zod";

const healthBaseSchema = z.object({
  service: z.literal("baro-jinryo-api"),
  timestamp: z.iso.datetime(),
});

export const liveHealthResponseSchema = healthBaseSchema.extend({
  ok: z.literal(true),
  check: z.literal("live"),
});

export const readyHealthResponseSchema = z.discriminatedUnion("ok", [
  healthBaseSchema.extend({
    ok: z.literal(true),
    check: z.literal("ready"),
    database: z.literal("up"),
    databaseLatencyMs: z.number().int().nonnegative(),
  }),
  healthBaseSchema.extend({
    ok: z.literal(false),
    check: z.literal("ready"),
    database: z.literal("down"),
    databaseLatencyMs: z.number().int().nonnegative(),
    message: z.literal("데이터베이스에 연결할 수 없습니다."),
  }),
]);

export const healthResponseSchema = z.union([liveHealthResponseSchema, readyHealthResponseSchema]);

export type LiveHealthResponse = z.infer<typeof liveHealthResponseSchema>;
export type ReadyHealthResponse = z.infer<typeof readyHealthResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
