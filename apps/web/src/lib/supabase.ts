import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Supabase Client를 앱에서 1회 생성한다 (SPEC-AUTH-001 5장).
 * - 프론트에는 URL과 Publishable Key만 둔다 (CLAUDE.md 6장). VITE_ 값은 공개로 간주한다.
 * - 서비스 데이터 조회·저장에는 사용하지 않으며, Auth 기능에 한해 auth feature의
 *   Service/Hook을 통해서만 사용한다.
 *
 * 환경변수가 아직 채워지지 않은 개발 초기 상태에서도 앱(라우팅·폼 검증)은
 * 동작해야 하므로, 값이 없으면 throw 하지 않고 `supabase = null`로 두고
 * `isSupabaseConfigured = false`를 노출한다. 실제 Auth 동작을 시도하는 지점에서만
 * 명확한 오류를 낸다 (authService).
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});

export const isSupabaseConfigured = parsed.success;

export const supabase: SupabaseClient | null = parsed.success
  ? createClient(parsed.data.VITE_SUPABASE_URL, parsed.data.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null;

if (!parsed.success) {
  // 비밀값을 로그에 남기지 않는다 — 어떤 키가 비었는지만 알린다.
  console.warn(
    "[auth] Supabase 환경변수가 설정되지 않았습니다. .env.local의 " +
      "VITE_SUPABASE_URL·VITE_SUPABASE_PUBLISHABLE_KEY를 확인하세요. " +
      "인증 동작은 비활성화되며 화면·검증만 동작합니다.",
  );
}
