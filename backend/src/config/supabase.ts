import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const supabaseUrl = requireEnvironmentValue(
  "SUPABASE_URL",
  process.env.SUPABASE_URL ?? process.env.VITE_PUBLIC_SUPABASE_URL,
);
export const supabasePublishableKey = requireEnvironmentValue(
  "SUPABASE_PUBLISHABLE_KEY",
  process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function createAuthenticatedSupabase(accessToken: string) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function requireEnvironmentValue(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name}가 .env에 설정되어야 합니다.`);
  }
  return value;
}
