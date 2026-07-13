import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseClient: SupabaseClient | null =
  env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey)
    : null;
