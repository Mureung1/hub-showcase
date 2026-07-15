import { z } from "zod";

const publicSupabaseConfigSchema = z.object({
  url: z
    .url("Supabase URL은 올바른 URL이어야 합니다.")
    .refine((value) => !value.includes("PROJECT_REF"), "실제 Supabase URL을 입력해야 합니다."),
  publishableKey: z
    .string()
    .trim()
    .min(1, "Supabase publishable key가 필요합니다.")
    .refine(
      (value) => !value.includes("REPLACE_ME"),
      "실제 Supabase publishable key를 입력해야 합니다.",
    ),
});

export type PublicSupabaseConfig = z.infer<typeof publicSupabaseConfigSchema>;

export function parsePublicSupabaseConfig(input: unknown): PublicSupabaseConfig {
  return publicSupabaseConfigSchema.parse(input);
}
