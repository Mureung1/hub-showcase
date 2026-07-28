import { createClient } from "@supabase/supabase-js";
import { getPersistentAuthStorage } from "./sessionStorage.js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const supabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);


export const supabase = supabaseAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: getPersistentAuthStorage(),
    },
  })
  : null;
