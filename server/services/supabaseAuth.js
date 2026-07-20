import { createClient } from "@supabase/supabase-js";

function readText(value) {
  return String(value || "").trim();
}

export function getSupabaseAuthConfig(environment = process.env) {
  const url = readText(environment.SUPABASE_URL);
  const anonKey = readText(environment.SUPABASE_ANON_KEY);
  return { anonKey, configured: Boolean(url && anonKey), url };
}

export function createSupabaseAuthService(options = {}) {
  const config = getSupabaseAuthConfig(options.environment);
  const client = options.client ?? (config.configured
    ? createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    })
    : null);

  return {
    configured: Boolean(client),
    async getUser(accessToken) {
      if (!client) {
        const error = new Error("인증 서버가 설정되지 않았습니다.");
        error.code = "auth_not_configured";
        throw error;
      }
      const { data, error } = await client.auth.getUser(accessToken);
      if (error || !data.user) {
        const invalidTokenError = new Error("유효하지 않거나 만료된 로그인 상태입니다.");
        invalidTokenError.code = "invalid_token";
        throw invalidTokenError;
      }
      return data.user;
    },
    createUserClient(accessToken) {
      if (!config.configured) return null;
      return createClient(config.url, config.anonKey, {
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
    },
  };
}
