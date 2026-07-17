import { createClient } from '@supabase/supabase-js';

import type { ExtensionEnv } from '../config/extension_env';

const SESSION_EXPIRY_MARGIN_SECONDS = 60;

type ExtensionSession = {
  access_token: string;
  expires_at?: number;
};

type AuthResult = {
  data: { session: ExtensionSession | null };
  error: unknown;
};

export type ExtensionAuthClient = {
  auth: {
    getSession(): Promise<AuthResult>;
    refreshSession(): Promise<AuthResult>;
    setSession(tokens: {
      access_token: string;
      refresh_token: string;
    }): Promise<AuthResult>;
    signInWithOAuth(options: {
      options: { redirectTo: string; skipBrowserRedirect: true };
      provider: 'google';
    }): Promise<{ data: { url: string | null }; error: unknown }>;
  };
};

type ExtensionIdentity = {
  getRedirectURL(path: string): string;
  launchWebAuthFlow(details: {
    interactive: boolean;
    url: string;
  }): Promise<string | undefined>;
};

type ChromeStorageArea = {
  get(key: string): Promise<Record<string, unknown>>;
  remove(key: string): Promise<void>;
  set(items: Record<string, string>): Promise<void>;
};

export type ExtensionAuth = {
  getAccessToken(options: { interactive: boolean }): Promise<string | null>;
};

export function createChromeStorageAdapter(area: ChromeStorageArea) {
  return {
    async getItem(key: string) {
      const values = await area.get(key);
      return typeof values[key] === 'string' ? values[key] : null;
    },
    async removeItem(key: string) {
      await area.remove(key);
    },
    async setItem(key: string, value: string) {
      await area.set({ [key]: value });
    },
  };
}

export function createExtensionAuth({
  client,
  identity,
  now = Date.now,
}: {
  client: ExtensionAuthClient;
  identity: ExtensionIdentity;
  now?: () => number;
}): ExtensionAuth {
  return {
    async getAccessToken({ interactive }) {
      try {
        const current = await client.auth.getSession();
        const session = current.error ? null : current.data.session;

        if (isFreshSession(session, now())) {
          return session.access_token;
        }

        if (session) {
          const refreshed = await client.auth.refreshSession();

          if (!refreshed.error && refreshed.data.session) {
            return refreshed.data.session.access_token;
          }
        }

        return interactive ? startInteractiveLogin(client, identity) : null;
      } catch {
        return null;
      }
    },
  };
}

export function createSupabaseExtensionAuth(
  env: ExtensionEnv,
  chromeApi: Pick<typeof chrome, 'identity' | 'storage'>
) {
  const client = createClient(env.supabaseUrl, env.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',
      persistSession: true,
      storage: createChromeStorageAdapter(chromeApi.storage.local),
    },
  });

  return createExtensionAuth({ client, identity: chromeApi.identity });
}

function isFreshSession(
  session: ExtensionSession | null,
  nowMilliseconds: number
): session is ExtensionSession {
  return Boolean(
    session?.access_token &&
    session.expires_at &&
    session.expires_at >
      Math.floor(nowMilliseconds / 1000) + SESSION_EXPIRY_MARGIN_SECONDS
  );
}

async function startInteractiveLogin(
  client: ExtensionAuthClient,
  identity: ExtensionIdentity
) {
  const redirectTo = identity.getRedirectURL('auth');
  const oauth = await client.auth.signInWithOAuth({
    options: { redirectTo, skipBrowserRedirect: true },
    provider: 'google',
  });

  if (oauth.error || !oauth.data.url) {
    return null;
  }

  const callbackUrl = await identity.launchWebAuthFlow({
    interactive: true,
    url: oauth.data.url,
  });
  const tokens = callbackUrl ? parseCallbackTokens(callbackUrl) : null;

  if (!tokens) {
    return null;
  }

  const result = await client.auth.setSession(tokens);

  return result.error ? null : (result.data.session?.access_token ?? null);
}

function parseCallbackTokens(callbackUrl: string) {
  const params = new URLSearchParams(new URL(callbackUrl).hash.slice(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  return accessToken && refreshToken
    ? { access_token: accessToken, refresh_token: refreshToken }
    : null;
}
