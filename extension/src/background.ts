import { createExtensionApi } from './api/extension_api';
import { createSupabaseExtensionAuth } from './auth/extension_auth';
import { parseExtensionEnv } from './config/extension_env';
import {
  createCurrentTabCaptureController,
  type CaptureFailure,
  type CaptureNotifications,
} from './model/capture_current_tab';
import {
  createPendingCaptureStore,
  type PendingCaptureStore,
} from './model/pending_capture_store';

type CurrentTab = { title?: string; url?: string };
type NotificationOptions = {
  buttons?: Array<{ title: string }>;
  iconUrl: string;
  message: string;
  title: string;
  type: 'basic';
};

export type ChromeBackgroundApi = {
  action: {
    onClicked: {
      addListener(listener: (tab: CurrentTab) => void): void;
    };
  };
  notifications: {
    clear(notificationId: string): Promise<boolean> | void;
    create(
      notificationId: string,
      options: NotificationOptions
    ): Promise<string> | void;
    onButtonClicked: {
      addListener(
        listener: (notificationId: string, buttonIndex: number) => void
      ): void;
    };
    onClosed: {
      addListener(listener: (notificationId: string) => void): void;
    };
  };
  runtime: {
    getURL(path: string): string;
    onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: unknown,
          sendResponse: (response: unknown) => void
        ) => boolean | void
      ): void;
    };
  };
  windows: {
    create(options: {
      height: number;
      type: 'popup';
      url: string;
      width: number;
    }): Promise<unknown> | void;
  };
};

export type BackgroundServices = {
  capture(tab: CurrentTab): Promise<void> | void;
  pendingStore: PendingCaptureStore;
  saveMemo(
    insightId: string,
    memo: string
  ): Promise<
    | { ok: true }
    | { ok: false; reason: 'not-found' | 'permission-denied' | 'write-failed' }
  >;
};

export function createChromeCaptureNotifications(
  notifications: Pick<ChromeBackgroundApi['notifications'], 'create'>
): CaptureNotifications {
  return {
    async showFailure(reason) {
      await notifications.create(`failure:${crypto.randomUUID()}`, {
        iconUrl: 'icons/amadda-192.png',
        message: getFailureMessage(reason),
        title: '아맞다',
        type: 'basic',
      });
    },
    async showSaved({ created, notificationId }) {
      await notifications.create(notificationId, {
        buttons: [{ title: '메모 남기기' }],
        iconUrl: 'icons/amadda-192.png',
        message: created
          ? '인사이트를 저장했어요.'
          : '이미 저장한 인사이트예요.',
        title: '아맞다',
        type: 'basic',
      });
    },
  };
}

export function registerBackground(
  chromeApi: ChromeBackgroundApi,
  services: BackgroundServices
) {
  chromeApi.action.onClicked.addListener((tab) => {
    ignoreRejection(Promise.resolve(services.capture(tab)));
  });

  chromeApi.notifications.onButtonClicked.addListener(
    (notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        ignoreRejection(openMemoWindow(chromeApi, services, notificationId));
      }
    }
  );

  chromeApi.notifications.onClosed.addListener((notificationId) => {
    ignoreRejection(services.pendingStore.remove(notificationId));
  });

  chromeApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isSaveMemoMessage(message)) {
      return false;
    }

    ignoreRejection(
      services
        .saveMemo(message.insightId, message.memo)
        .then(sendResponse)
        .catch(() => {
          sendResponse({ ok: false, reason: 'write-failed' });
        })
    );
    return true;
  });
}

function startBackground(chromeApi: typeof chrome) {
  const env = parseExtensionEnv(import.meta.env);
  const api = createExtensionApi({ apiOrigin: env.apiOrigin });
  const auth = createSupabaseExtensionAuth(env, chromeApi);
  const pendingStore = createPendingCaptureStore(chromeApi.storage.local);
  const notifications = createChromeCaptureNotifications(
    chromeApi.notifications
  );
  const controller = createCurrentTabCaptureController({
    api,
    auth,
    notifications,
    pendingStore,
  });

  registerBackground(chromeApi as unknown as ChromeBackgroundApi, {
    async capture(tab) {
      try {
        await controller.capture(tab);
      } catch {
        await notifications.showFailure('save-failed');
      }
    },
    pendingStore,
    async saveMemo(insightId, memo) {
      const accessToken = await auth.getAccessToken({ interactive: false });

      return accessToken
        ? api.saveMemo(accessToken, insightId, memo)
        : { ok: false, reason: 'permission-denied' };
    },
  });
}

async function openMemoWindow(
  chromeApi: ChromeBackgroundApi,
  services: BackgroundServices,
  notificationId: string
) {
  const target = await services.pendingStore.get(notificationId);

  if (!target) {
    return;
  }

  const parameters = new URLSearchParams({
    insightId: target.insightId,
    title: target.title,
  });
  await chromeApi.windows.create({
    height: 430,
    type: 'popup',
    url: chromeApi.runtime.getURL(`memo.html?${parameters.toString()}`),
    width: 380,
  });
  await services.pendingStore.remove(notificationId);
  await chromeApi.notifications.clear(notificationId);
}

function getFailureMessage(reason: CaptureFailure) {
  if (reason === 'unsupported-page') {
    return '이 페이지는 저장할 수 없어요. 다른 페이지에서 다시 시도해 주세요.';
  }

  return reason === 'login-failed'
    ? '로그인이 필요해요. 확장 아이콘에서 로그인한 뒤 다시 시도해 주세요.'
    : '인사이트를 저장하지 못했어요. 현재 페이지는 그대로 열려 있어요. 다시 시도해 주세요.';
}

function isSaveMemoMessage(
  value: unknown
): value is { insightId: string; memo: string; type: 'save-insight-memo' } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'save-insight-memo' &&
    'insightId' in value &&
    typeof value.insightId === 'string' &&
    'memo' in value &&
    typeof value.memo === 'string'
  );
}

function ignoreRejection(value: unknown) {
  void Promise.resolve(value).catch(() => undefined);
}

if (typeof chrome !== 'undefined') {
  startBackground(chrome);
}
