import { describe, expect, it, vi } from 'vitest';

import {
  createChromeCaptureNotifications,
  registerBackground,
  type BackgroundServices,
  type ChromeBackgroundApi,
} from './background';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';
const NOTIFICATION_ID = `capture:${INSIGHT_ID}`;

describe('createChromeCaptureNotifications', () => {
  it('shows a saved notification with an optional memo button', async () => {
    const create = vi.fn().mockResolvedValue(NOTIFICATION_ID);
    const notifications = createChromeCaptureNotifications({ create });

    await notifications.showSaved({
      created: true,
      notificationId: NOTIFICATION_ID,
    });

    expect(create).toHaveBeenCalledWith(NOTIFICATION_ID, {
      buttons: [{ title: '메모 남기기' }],
      iconUrl: 'icons/amadda-192.png',
      message: '저장됨',
      title: '아맞다',
      type: 'basic',
    });
  });

  it.each([
    ['unsupported-page', '이 페이지는 저장할 수 없음'],
    ['login-failed', '로그인이 필요함'],
    ['save-failed', '저장하지 못함'],
  ] as const)('shows the safe failure %s', async (reason, message) => {
    const create = vi.fn();
    const notifications = createChromeCaptureNotifications({ create });

    await notifications.showFailure(reason);

    expect(create).toHaveBeenCalledWith(
      expect.stringMatching(/^failure:/),
      expect.objectContaining({ message })
    );
  });
});

describe('registerBackground', () => {
  it('registers the action, notification, and memo message listeners', () => {
    const chromeApi = createChromeApi();

    registerBackground(chromeApi, createServices());

    expect(chromeApi.action.onClicked.addListener).toHaveBeenCalledOnce();
    expect(
      chromeApi.notifications.onButtonClicked.addListener
    ).toHaveBeenCalledOnce();
    expect(chromeApi.notifications.onClosed.addListener).toHaveBeenCalledOnce();
    expect(chromeApi.runtime.onMessage.addListener).toHaveBeenCalledOnce();
  });

  it('captures the clicked tab', async () => {
    const chromeApi = createChromeApi();
    const services = createServices();
    registerBackground(chromeApi, services);
    const listener = getListener(chromeApi.action.onClicked.addListener);

    listener({ title: 'Article', url: 'https://example.com' });

    await vi.waitFor(() => {
      expect(services.capture).toHaveBeenCalledWith({
        title: 'Article',
        url: 'https://example.com',
      });
    });
  });

  it('opens an extension-owned memo window from the first notification button', async () => {
    const chromeApi = createChromeApi();
    const services = createServices();
    registerBackground(chromeApi, services);
    const listener = getListener(
      chromeApi.notifications.onButtonClicked.addListener
    );

    listener(NOTIFICATION_ID, 0);

    await vi.waitFor(() => {
      expect(chromeApi.windows.create).toHaveBeenCalledWith({
        height: 430,
        type: 'popup',
        url:
          `chrome-extension://extension/memo.html?insightId=${INSIGHT_ID}` +
          '&title=Article',
        width: 380,
      });
      expect(services.pendingStore.remove).toHaveBeenCalledWith(
        NOTIFICATION_ID
      );
      expect(chromeApi.notifications.clear).toHaveBeenCalledWith(
        NOTIFICATION_ID
      );
    });
  });

  it('removes pending context when the notification closes', async () => {
    const chromeApi = createChromeApi();
    const services = createServices();
    registerBackground(chromeApi, services);
    const listener = getListener(chromeApi.notifications.onClosed.addListener);

    listener(NOTIFICATION_ID);

    await vi.waitFor(() => {
      expect(services.pendingStore.remove).toHaveBeenCalledWith(
        NOTIFICATION_ID
      );
    });
  });

  it('returns an asynchronous memo result to the extension page', async () => {
    const chromeApi = createChromeApi();
    const services = createServices();
    registerBackground(chromeApi, services);
    const listener = getListener(chromeApi.runtime.onMessage.addListener);
    const sendResponse = vi.fn();

    const keepsChannelOpen = listener(
      { insightId: INSIGHT_ID, memo: '회의 참고', type: 'save-insight-memo' },
      {},
      sendResponse
    );

    expect(keepsChannelOpen).toBe(true);
    await vi.waitFor(() => {
      expect(services.saveMemo).toHaveBeenCalledWith(INSIGHT_ID, '회의 참고');
      expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });
  });
});

function createServices(): BackgroundServices {
  return {
    capture: vi.fn(),
    pendingStore: {
      get: vi.fn().mockResolvedValue({
        insightId: INSIGHT_ID,
        title: 'Article',
      }),
      remove: vi.fn(),
      save: vi.fn(),
    },
    saveMemo: vi.fn().mockResolvedValue({ ok: true }),
  };
}

function createChromeApi(): ChromeBackgroundApi {
  return {
    action: { onClicked: createEvent() },
    notifications: {
      clear: vi.fn(),
      create: vi.fn(),
      onButtonClicked: createEvent(),
      onClosed: createEvent(),
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://extension/${path}`),
      onMessage: createEvent(),
    },
    windows: { create: vi.fn() },
  };
}

function createEvent() {
  return { addListener: vi.fn() };
}

function getListener(addListener: unknown) {
  const mock = addListener as ReturnType<typeof vi.fn>;
  return mock.mock.calls[0][0] as (...arguments_: unknown[]) => unknown;
}
