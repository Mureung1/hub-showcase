import { describe, expect, it, vi } from 'vitest';

import {
  createPendingCaptureStore,
  getCaptureNotificationId,
} from './pending_capture_store';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';

describe('createPendingCaptureStore', () => {
  it('persists, reads, and removes a memo target by notification id', async () => {
    const values: Record<string, unknown> = {};
    const area = {
      get: vi.fn(async (key: string) => ({ [key]: values[key] })),
      remove: vi.fn(async (key: string) => {
        delete values[key];
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(values, items);
      }),
    };
    const store = createPendingCaptureStore(area);
    const target = { insightId: INSIGHT_ID, title: 'Article' };
    const notificationId = getCaptureNotificationId(INSIGHT_ID);

    await store.save(notificationId, target);
    await expect(store.get(notificationId)).resolves.toEqual(target);
    await store.remove(notificationId);
    await expect(store.get(notificationId)).resolves.toBeNull();
  });

  it('rejects corrupted storage values', async () => {
    const store = createPendingCaptureStore({
      get: vi.fn().mockResolvedValue({
        'amadda.pending-capture.capture:invalid': {
          insightId: 1,
          title: 'Article',
        },
      }),
      remove: vi.fn(),
      set: vi.fn(),
    });

    await expect(store.get('capture:invalid')).resolves.toBeNull();
  });
});

describe('getCaptureNotificationId', () => {
  it('creates a stable notification id without exposing other data', () => {
    expect(getCaptureNotificationId(INSIGHT_ID)).toBe(`capture:${INSIGHT_ID}`);
  });
});
