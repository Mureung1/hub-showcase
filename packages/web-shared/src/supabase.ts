import { parsePublicSupabaseConfig } from "@baro-jinryo/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseClientGetterOptions {
  url: string | undefined;
  publishableKey: string | undefined;
  storageKey: string;
}

export function createSupabaseClientGetter(options: SupabaseClientGetterOptions) {
  let client: SupabaseClient | undefined;

  return function getSupabaseClient(): SupabaseClient {
    if (client) return client;

    const config = parsePublicSupabaseConfig({
      url: options.url,
      publishableKey: options.publishableKey,
    });
    client = createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: options.storageKey,
      },
    });
    return client;
  };
}
