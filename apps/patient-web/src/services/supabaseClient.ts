import { parsePublicSupabaseConfig } from "@baro-jinryo/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const config = parsePublicSupabaseConfig({
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });

  supabaseClient = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: "baro-jinryo-patient-auth",
    },
  });

  return supabaseClient;
}
