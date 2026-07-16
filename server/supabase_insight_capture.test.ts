import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseInsightCaptureAuthenticator,
  createSupabaseInsightCaptureStore,
} from './supabase_insight_capture';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const ROW = {
  category: null,
  created_at: '2026-07-16T00:00:00.000Z',
  domain: 'example.com',
  id: '10000000-0000-4000-8000-000000000001',
  memo: null,
  normalized_url: 'https://example.com/article',
  original_url: 'https://example.com/article',
  schema_version: 1,
  title: 'Example article',
  title_origin: 'capture',
  updated_at: '2026-07-16T00:00:00.000Z',
  user_id: USER_ID,
};

describe('createSupabaseInsightCaptureAuthenticator', () => {
  it('accepts only a token that Supabase resolves to a user', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const authenticator = createSupabaseInsightCaptureAuthenticator({
      auth: { getUser },
    } as unknown as SupabaseClient);

    await expect(authenticator.authenticate('access-token')).resolves.toBe(
      USER_ID
    );
    expect(getUser).toHaveBeenCalledWith('access-token');
  });
});

describe('createSupabaseInsightCaptureStore', () => {
  it('looks up a normalized URL within the authenticated user scope', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: ROW, error: null });
    const query = createQuery(maybeSingle);
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    const store = createSupabaseInsightCaptureStore({
      from,
    } as unknown as SupabaseClient);

    await expect(
      store.findByNormalizedUrl(USER_ID, 'https://example.com/article')
    ).resolves.toEqual({
      insight: {
        category: null,
        createdAt: ROW.created_at,
        domain: ROW.domain,
        id: ROW.id,
        memo: null,
        normalizedUrl: ROW.normalized_url,
        originalUrl: ROW.original_url,
        title: ROW.title,
        titleOrigin: 'capture',
        updatedAt: ROW.updated_at,
      },
      status: 'found',
    });
    expect(from).toHaveBeenCalledWith('insights');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', USER_ID);
    expect(query.eq).toHaveBeenNthCalledWith(
      2,
      'normalized_url',
      'https://example.com/article'
    );
  });

  it('maps a unique conflict from insertion to a duplicate result', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505' },
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const store = createSupabaseInsightCaptureStore({
      from: vi.fn(() => ({ insert })),
    } as unknown as SupabaseClient);

    await expect(
      store.create({
        domain: 'example.com',
        normalizedUrl: 'https://example.com/article',
        originalUrl: 'https://example.com/article',
        title: 'Example article',
        titleOrigin: 'capture',
        userId: USER_ID,
      })
    ).resolves.toEqual({ status: 'duplicate' });
  });
});

function createQuery(maybeSingle: ReturnType<typeof vi.fn>) {
  const query = { eq: vi.fn(), maybeSingle };

  query.eq.mockReturnValue(query);

  return query;
}
