import { describe, expect, it, vi } from 'vitest';

import { createSupabaseBrowserClient } from './supabase_client';

describe('createSupabaseBrowserClient', () => {
  it('creates the browser client with persistent OAuth session handling', () => {
    const client = { auth: {} };
    const createClient = vi.fn(() => client);

    expect(
      createSupabaseBrowserClient(
        {
          publishableKey: 'sb_publishable_public-key',
          url: 'https://project-ref.supabase.co',
        },
        createClient
      )
    ).toBe(client);
    expect(createClient).toHaveBeenCalledWith(
      'https://project-ref.supabase.co',
      'sb_publishable_public-key',
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }
    );
  });
});
