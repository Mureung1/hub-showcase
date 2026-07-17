import type { ExtensionApi } from '../api/extension_api';
import type { ExtensionAuth } from '../auth/extension_auth';
import {
  getCaptureNotificationId,
  type PendingCaptureStore,
} from './pending_capture_store';

export type CaptureFailure =
  'login-failed' | 'save-failed' | 'unsupported-page';

export type CaptureNotifications = {
  showFailure(reason: CaptureFailure): Promise<void> | void;
  showSaved(result: {
    created: boolean;
    notificationId: string;
  }): Promise<void> | void;
};

type CurrentTab = {
  title?: string;
  url?: string;
};

export function createCurrentTabCaptureController({
  api,
  auth,
  notifications,
  pendingStore,
}: {
  api: ExtensionApi;
  auth: ExtensionAuth;
  notifications: CaptureNotifications;
  pendingStore: PendingCaptureStore;
}) {
  return {
    async capture(tab: CurrentTab) {
      if (!isSupportedPage(tab.url)) {
        await notifications.showFailure('unsupported-page');
        return;
      }

      const accessToken = await auth.getAccessToken({ interactive: true });

      if (!accessToken) {
        await notifications.showFailure('login-failed');
        return;
      }

      const result = await api.capture(accessToken, {
        source: 'chrome_extension',
        title: tab.title,
        url: tab.url,
      });

      if (!result.ok) {
        await notifications.showFailure(
          result.reason === 'permission-denied' ? 'login-failed' : 'save-failed'
        );
        return;
      }

      const notificationId = getCaptureNotificationId(result.insight.id);
      await pendingStore.save(notificationId, {
        insightId: result.insight.id,
        title: result.insight.title,
      });
      await notifications.showSaved({
        created: result.created,
        notificationId,
      });
    },
  };
}

function isSupportedPage(url: string | undefined): url is string {
  if (!url) {
    return false;
  }

  try {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
