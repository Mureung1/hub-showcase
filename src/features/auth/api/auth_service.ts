import type { SupabaseClient } from '@supabase/supabase-js';

import type { MobileOAuth, MobileOAuthContext } from '@/shared/capacitor';

export type AuthSession = {
  user: {
    email?: string;
    id: string;
    user_metadata?: Record<string, unknown> | null;
  };
};

export type AuthService = {
  signInWithGoogle: (
    redirectTo: string,
    context?: MobileOAuthContext
  ) => Promise<void>;
  signOut: () => Promise<void>;
  subscribe: (listener: (session: AuthSession | null) => void) => () => void;
  subscribeMobileOAuthCallbacks?: (
    listener: (context?: MobileOAuthContext) => void
  ) => () => void;
  subscribeSignInFailures?: (
    listener: (context?: MobileOAuthContext) => void
  ) => () => void;
};

export function createSupabaseAuthService(
  client: Pick<SupabaseClient, 'auth'>,
  mobileOAuth?: MobileOAuth
): AuthService {
  return {
    async signInWithGoogle(redirectTo, context) {
      if (mobileOAuth) {
        await mobileOAuth.signInWithGoogle(context);
        return;
      }

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

    ...(mobileOAuth
      ? {
          subscribeMobileOAuthCallbacks: mobileOAuth.subscribeCallbacks,
          subscribeSignInFailures: mobileOAuth.subscribeFailures,
        }
      : {}),
  };
}
