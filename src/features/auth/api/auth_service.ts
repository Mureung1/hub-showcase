import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthSession = {
  user: {
    email?: string;
    id: string;
    user_metadata: Record<string, unknown>;
  };
};

export type AuthService = {
  signInWithGoogle: (redirectTo: string) => Promise<void>;
  signOut: () => Promise<void>;
  subscribe: (listener: (session: AuthSession | null) => void) => () => void;
};

export function createSupabaseAuthService(
  client: Pick<SupabaseClient, 'auth'>
): AuthService {
  return {
    async signInWithGoogle(redirectTo) {
      const { error } = await client.auth.signInWithOAuth({
        options: { redirectTo },
        provider: 'google',
      });

      if (error) {
        throw error;
      }
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });

      if (error) {
        throw error;
      }
    },

    subscribe(listener) {
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        listener(
          session
            ? {
                user: {
                  email: session.user.email,
                  id: session.user.id,
                  user_metadata: session.user.user_metadata,
                },
              }
            : null
        );
      });

      return () => subscription.unsubscribe();
    },
  };
}
