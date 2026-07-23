import { createClient } from "@supabase/supabase-js";
import { clearLegacyLocalAuthSession, getAuthSessionStorage } from "./sessionStorage.js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const supabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (supabaseAuthConfigured) {
  clearLegacyLocalAuthSession(supabaseUrl, globalThis.window?.localStorage);
}

export const supabase = supabaseAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: getAuthSessionStorage(),
    },
  })
  : null;