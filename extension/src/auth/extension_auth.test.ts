import { describe, expect, it, vi } from 'vitest';

import {
  createChromeStorageAdapter,
  createExtensionAuth,
  type ExtensionAuthClient,
} from './extension_auth';

const NOW_SECONDS = 1_800_000_000;

describe('createChromeStorageAdapter', () => {
  it('maps Supabase string storage to chrome.storage.local', async () => {
    const values: Record<string, string> = {};
    const area = {
      get: vi.fn(async (key: string) => ({ [key]: values[key] })),
      remove: vi.fn(async (key: string) => {
        delete values[key];
      }),
      set: vi.fn(async (items: Record<string, string>) => {
        Object.assign(values, items);
      }),
    };
    const storage = createChromeStorageAdapter(area);

    await storage.setItem('session', 'value');
    await expect(storage.getItem('session')).resolves.toBe('value');
    await storage.removeItem('session');
    await expect(storage.getItem('session')).resolves.toBeNull();
  });
});

describe('createExtensionAuth', () => {
  it('reuses a session that is not about to expire', async () => {
    const client = createClient({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'stored-token',
            expires_at: NOW_SECONDS + 120,
          },
        },
        error: null,
      }),
    });
    const auth = createExtensionAuth({
      client,
      identity: createIdentity(),
      now: () => NOW_SECONDS * 1000,
    });

    await expect(auth.getAccessToken({ interactive: true })).resolves.toBe(
      'stored-token'
    );
    expect(client.auth.refreshSession).not.toHaveBeenCalled();
    expect(client.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('refreshes a session that is about to expire', async () => {
    const client = createClient({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'old-token', expires_at: NOW_SECONDS + 10 },
        },
        error: null,
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'fresh-token',
            expires_at: NOW_SECONDS + 3600,
          },
        },
        error: null,
      }),
    });
    const auth = createExtensionAuth({
      client,
      identity: createIdentity(),
      now: () => NOW_SECONDS * 1000,
    });

    await expect(auth.getAccessToken({ interactive: false })).resolves.toBe(
      'fresh-token'
    );
  });

  it('launches Google OAuth and persists the returned session', async () => {
    const client = createClient({
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: 'https://project.supabase.co/auth/v1/authorize' },
        error: null,
      }),
      setSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'access', expires_at: NOW_SECONDS + 3600 },
        },
        error: null,
      }),
    });
    const identity = createIdentity({
      launchWebAuthFlow: vi
        .fn()
        .mockResolvedValue(
          'https://extension.chromiumapp.org/auth#access_token=access&refresh_token=refresh'
        ),
    });
    const auth = createExtensionAuth({
      client,
      identity,
      now: () => NOW_SECONDS * 1000,
    });

    await expect(auth.getAccessToken({ interactive: true })).resolves.toBe(
      'access'
    );
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: 'https://extension.chromiumapp.org/auth',
        skipBrowserRedirect: true,
      },
      provider: 'google',
    });
    expect(identity.launchWebAuthFlow).toHaveBeenCalledWith({
      interactive: true,
      url: 'https://project.supabase.co/auth/v1/authorize',
    });
    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('does not start interactive OAuth for a background memo request', async () => {
    const client = createClient();
    const auth = createExtensionAuth({
      client,
      identity: createIdentity(),
      now: () => NOW_SECONDS * 1000,
    });

    await expect(
      auth.getAccessToken({ interactive: false })
    ).resolves.toBeNull();
    expect(client.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('returns null without exposing OAuth failures', async () => {
    const client = createClient({
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: null },
        error: new Error('sensitive detail'),
      }),
    });
    const auth = createExtensionAuth({
      client,
      identity: createIdentity(),
      now: () => NOW_SECONDS * 1000,
    });

    await expect(
      auth.getAccessToken({ interactive: true })
    ).resolves.toBeNull();
  });
});

function createClient(
  overrides: Partial<ExtensionAuthClient['auth']> = {}
): ExtensionAuthClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: new Error('refresh failed'),
      }),
      setSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      ...overrides,
    },
  };
}

function createIdentity(
  overrides: Partial<{
    getRedirectURL: (path: string) => string;
    launchWebAuthFlow: (details: {
      interactive: boolean;
      url: string;
    }) => Promise<string | undefined>;
  }> = {}
) {
  return {
    getRedirectURL: vi.fn(() => 'https://extension.chromiumapp.org/auth'),
    launchWebAuthFlow: vi.fn(),
    ...overrides,
  };
}
