import { describe, expect, it, vi } from 'vitest';

import type { ExtensionApi } from '../api/extension_api';
import type { ExtensionAuth } from '../auth/extension_auth';
import { createCurrentTabCaptureController } from './capture_current_tab';
import type { PendingCaptureStore } from './pending_capture_store';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';

describe('createCurrentTabCaptureController', () => {
  it('saves the current HTTP tab and offers an optional memo', async () => {
    const dependencies = createDependencies();
    const controller = createCurrentTabCaptureController(dependencies);

    await controller.capture({
      title: 'Article',
      url: 'https://example.com/article',
    });

    expect(dependencies.auth.getAccessToken).toHaveBeenCalledWith({
      interactive: true,
    });
    expect(dependencies.api.capture).toHaveBeenCalledWith('access-token', {
      source: 'chrome_extension',
      title: 'Article',
      url: 'https://example.com/article',
    });
    expect(dependencies.pendingStore.save).toHaveBeenCalledWith(
      `capture:${INSIGHT_ID}`,
      { insightId: INSIGHT_ID, title: 'Article' }
    );
    expect(dependencies.notifications.showSaved).toHaveBeenCalledWith({
      created: true,
      notificationId: `capture:${INSIGHT_ID}`,
    });
  });

  it('shows an already-saved result while keeping the memo target', async () => {
    const dependencies = createDependencies({
      capture: vi.fn().mockResolvedValue({
        created: false,
        insight: { id: INSIGHT_ID, title: 'Existing article' },
        ok: true,
      }),
    });
    const controller = createCurrentTabCaptureController(dependencies);

    await controller.capture({
      title: 'Tab title',
      url: 'https://example.com/article',
    });

    expect(dependencies.pendingStore.save).toHaveBeenCalledWith(
      `capture:${INSIGHT_ID}`,
      { insightId: INSIGHT_ID, title: 'Existing article' }
    );
    expect(dependencies.notifications.showSaved).toHaveBeenCalledWith({
      created: false,
      notificationId: `capture:${INSIGHT_ID}`,
    });
  });

  it.each(['chrome://settings', 'file:///C:/secret.txt', 'about:blank'])(
    'rejects the unsupported page %s before authentication',
    async (url) => {
      const dependencies = createDependencies();
      const controller = createCurrentTabCaptureController(dependencies);

      await controller.capture({ title: 'Unsupported', url });

      expect(dependencies.auth.getAccessToken).not.toHaveBeenCalled();
      expect(dependencies.api.capture).not.toHaveBeenCalled();
      expect(dependencies.notifications.showFailure).toHaveBeenCalledWith(
        'unsupported-page'
      );
    }
  );

  it('shows a login failure when interactive authentication cannot finish', async () => {
    const dependencies = createDependencies({
      getAccessToken: vi.fn().mockResolvedValue(null),
    });
    const controller = createCurrentTabCaptureController(dependencies);

    await controller.capture({ url: 'https://example.com' });

    expect(dependencies.api.capture).not.toHaveBeenCalled();
    expect(dependencies.notifications.showFailure).toHaveBeenCalledWith(
      'login-failed'
    );
  });

  it.each([
    ['permission-denied', 'login-failed'],
    ['invalid-url', 'save-failed'],
    ['write-failed', 'save-failed'],
  ] as const)('maps %s to %s', async (reason, failure) => {
    const dependencies = createDependencies({
      capture: vi.fn().mockResolvedValue({ ok: false, reason }),
    });
    const controller = createCurrentTabCaptureController(dependencies);

    await controller.capture({ url: 'https://example.com' });

    expect(dependencies.notifications.showFailure).toHaveBeenCalledWith(
      failure
    );
  });
});

function createDependencies(
  overrides: {
    capture?: ExtensionApi['capture'];
    getAccessToken?: ExtensionAuth['getAccessToken'];
  } = {}
) {
  return {
    api: {
      capture:
        overrides.capture ??
        vi.fn().mockResolvedValue({
          created: true,
          insight: { id: INSIGHT_ID, title: 'Article' },
          ok: true,
        }),
      saveMemo: vi.fn(),
    } satisfies ExtensionApi,
    auth: {
      getAccessToken:
        overrides.getAccessToken ?? vi.fn().mockResolvedValue('access-token'),
    } satisfies ExtensionAuth,
    notifications: {
      showFailure: vi.fn(),
      showSaved: vi.fn(),
    },
    pendingStore: {
      get: vi.fn(),
      remove: vi.fn(),
      save: vi.fn(),
    } satisfies PendingCaptureStore,
  };
}
