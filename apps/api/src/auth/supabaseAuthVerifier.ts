import { createClient } from "@supabase/supabase-js";
import type { AuthVerifier, VerifiedAuthUser } from "./authVerifier.js";

export class SupabaseAuthVerifier implements AuthVerifier {
  private readonly client;

  constructor(url: string, publishableKey: string) {
    this.client = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
  }

  async verify(accessToken: string): Promise<VerifiedAuthUser | null> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { id: data.user.id, emailConfirmed: Boolean(data.user.email_confirmed_at) };
  }
}
