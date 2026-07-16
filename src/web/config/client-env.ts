export interface ClientEnv { readonly supabaseUrl: string; readonly supabaseAnonKey: string }
export function getClientEnv(): ClientEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return { supabaseUrl, supabaseAnonKey };
}
