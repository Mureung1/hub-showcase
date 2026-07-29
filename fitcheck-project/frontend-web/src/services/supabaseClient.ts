import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) return null;

  if (!client) {
    client = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return client;
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}
