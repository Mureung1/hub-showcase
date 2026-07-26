import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

import { isNativeAndroid, type CapacitorRuntime } from './runtime';

type AppUrlOpenEvent = {
  url: string;
};

type AppUrlOpenPlugin = {
  addListener(
    eventName: 'appUrlOpen',
    listener: (event: AppUrlOpenEvent) => void
  ): Promise<{ remove(): Promise<void> }>;
  getLaunchUrl(): Promise<AppUrlOpenEvent | undefined>;
};

type SystemBrowser = {
  close(): Promise<void>;
  open(options: { url: string }): Promise<void>;
};

type NotionImportCallbackDependencies = {
  app: AppUrlOpenPlugin;
  browser: SystemBrowser;
  runtime: CapacitorRuntime;
};

export type NotionImportCallback = {
  open(authorizeUrl: string): Promise<void>;
  subscribe(listener: (connectionId: string) => void): () => void;
};

const CALLBACK_URL = new URL('com.ppre1ude.amadda://import/notion');
const defaultDependencies: NotionImportCallbackDependencies = {
  app: App,
  browser: Browser,
  runtime: Capacitor,
};

export function createNotionImportCallback(
  dependencies: NotionImportCallbackDependencies
): NotionImportCallback | undefined {
  if (!isNativeAndroid(dependencies.runtime)) {
    return undefined;
  }

  const listeners = new Set<(connectionId: string) => void>();
  let lastProcessedUrl: string | undefined;
  let unobservedConnectionId: string | undefined;

  async function handleUrl(event: AppUrlOpenEvent) {
    const connectionId = readConnectionId(event.url);

    if (!connectionId || event.url === lastProcessedUrl) {
      return;
    }
    lastProcessedUrl = event.url;

    if (listeners.size === 0) {
      unobservedConnectionId = connectionId;
    } else {
      listeners.forEach((listener) => listener(connectionId));
    }

    try {
      await dependencies.browser.close();
    } catch {
      // 연결 ID를 복구한 뒤 브라우저 정리 실패가 분석 재개를 막지 않게 한다.
    }
  }

  const listenerReady = dependencies.app.addListener('appUrlOpen', (event) => {
    void handleUrl(event);
  });
  void listenerReady.then(async () => {
    try {
      const launchEvent = await dependencies.app.getLaunchUrl();
      if (launchEvent) {
        await handleUrl(launchEvent);
      }
    } catch {
      // 초기 URL 조회 실패는 이후 appUrlOpen 수신을 막지 않는다.
    }
  });

  return {
    async open(authorizeUrl) {
      await listenerReady;
      await dependencies.browser.open({ url: authorizeUrl });
    },

    subscribe(listener) {
      listeners.add(listener);

      if (unobservedConnectionId) {
        const connectionId = unobservedConnectionId;
        unobservedConnectionId = undefined;
        queueMicrotask(() => {
          if (listeners.has(listener)) {
            listener(connectionId);
          }
        });
      }

      return () => listeners.delete(listener);
    },
  };
}

export function createDefaultNotionImportCallback() {
  return createNotionImportCallback(defaultDependencies);
}

function readConnectionId(value: string) {
  try {
    const url = new URL(value);
    const connectionId = url.searchParams.get('connection');

    if (
      url.protocol !== CALLBACK_URL.protocol ||
      url.hostname !== CALLBACK_URL.hostname ||
      url.pathname !== CALLBACK_URL.pathname ||
      !connectionId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        connectionId
      )
    ) {
      return null;
    }

    return connectionId;
  } catch {
    return null;
  }
}
