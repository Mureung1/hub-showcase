import { createSupabaseClientGetter } from "@baro-jinryo/web-shared";

export const getSupabaseClient = createSupabaseClientGetter({
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  storageKey: "baro-jinryo-staff-auth",
});
