/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  createInstallPromptEventStore,
  type BeforeInstallPromptEvent,
} from '@/shared/pwa';

import {
  isAndroidGoogleChrome,
  usePwaInstallPrompt,
} from './use_pwa_install_prompt';

const ANDROID_CHROME = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36',
  userAgentData: {
    brands: [{ brand: 'Google Chrome', version: '138' }],
    platform: 'Android',
  },
} as const;

describe('usePwaInstallPrompt', () => {
  it('설치 이벤트 뒤 저장에 성공하면 안내를 한 번 표시한다', async () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    const storage = createStorage();
    store.start(target);
    const { result } = renderHook(() =>
      usePwaInstallPrompt({
        navigatorIdentity: ANDROID_CHROME,
        storage,
        store,
      })
    );

    act(() => target.dispatchEvent(createBeforeInstallPromptEvent()));
    expect(result.current.isVisible).toBe(false);

    act(() => result.current.recordSuccessfulSave());

    await waitFor(() => expect(result.current.isVisible).toBe(true));
    expect(storage.getItem('amadda.pwa-install-notice.v1')).toBe('seen');
  });

  it('저장 성공 뒤 설치 이벤트가 도착해도 안내를 표시한다', async () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    store.start(target);
    const { result } = renderHook(() =>
      usePwaInstallPrompt({
        navigatorIdentity: ANDROID_CHROME,
        storage: createStorage(),
        store,
      })
    );

    act(() => result.current.recordSuccessfulSave());
    expect(result.current.isVisible).toBe(false);

    act(() => target.dispatchEvent(createBeforeInstallPromptEvent()));

    await waitFor(() => expect(result.current.isVisible).toBe(true));
  });

  it.each([
    ['데스크톱 Chrome', { userAgent: 'Mozilla/5.0 Chrome/138.0.0.0' }],
    [
      'Samsung Internet',
      {
        userAgent:
          'Mozilla/5.0 (Linux; Android 15) SamsungBrowser/28.0 Chrome/130.0 Mobile Safari/537.36',
      },
    ],
    [
      'Android WebView',
      {
        userAgent:
          'Mozilla/5.0 (Linux; Android 15; wv) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36',
      },
    ],
  ])('%s에서는 설치 안내 대상을 허용하지 않는다', (_name, identity) => {
    expect(isAndroidGoogleChrome(identity)).toBe(false);
  });

  it('Client Hints가 있으면 Android Google Chrome 브랜드를 우선한다', () => {
    expect(isAndroidGoogleChrome(ANDROID_CHROME)).toBe(true);
    expect(
      isAndroidGoogleChrome({
        userAgent: ANDROID_CHROME.userAgent,
        userAgentData: {
          brands: [{ brand: 'Microsoft Edge', version: '138' }],
          platform: 'Android',
        },
      })
    ).toBe(false);
  });

  it('이미 본 사용자와 저장소 실패에는 안내를 숨긴다', async () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    store.start(target);
    act(() => target.dispatchEvent(createBeforeInstallPromptEvent()));
    const seen = renderHook(() =>
      usePwaInstallPrompt({
        navigatorIdentity: ANDROID_CHROME,
        storage: createStorage({ 'amadda.pwa-install-notice.v1': 'seen' }),
        store,
      })
    );

    act(() => seen.result.current.recordSuccessfulSave());
    await Promise.resolve();
    expect(seen.result.current.isVisible).toBe(false);
    seen.unmount();

    const failedStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('storage blocked');
      }),
    };
    const blocked = renderHook(() =>
      usePwaInstallPrompt({
        navigatorIdentity: ANDROID_CHROME,
        storage: failedStorage,
        store,
      })
    );

    act(() => blocked.result.current.recordSuccessfulSave());
    await waitFor(() => expect(failedStorage.setItem).toHaveBeenCalledOnce());
    expect(blocked.result.current.isVisible).toBe(false);
  });

  it('설치 요청을 원자적으로 한 번만 실행한다', async () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    const promptEvent = createBeforeInstallPromptEvent();
    store.start(target);
    const { result } = renderHook(() =>
      usePwaInstallPrompt({
        navigatorIdentity: ANDROID_CHROME,
        storage: createStorage(),
        store,
      })
    );
    act(() => {
      target.dispatchEvent(promptEvent);
      result.current.recordSuccessfulSave();
    });
    await waitFor(() => expect(result.current.isVisible).toBe(true));

    await act(async () => {
      await Promise.all([result.current.install(), result.current.install()]);
    });

    expect(promptEvent.prompt).toHaveBeenCalledOnce();
    expect(result.current.isVisible).toBe(false);
  });

  it('설치 완료 이벤트가 오면 표시 중인 안내를 닫는다', async () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    store.start(target);
    const { result } = renderHook(() =>
      usePwaInstallPrompt({
        navigatorIdentity: ANDROID_CHROME,
        storage: createStorage(),
        store,
      })
    );
    act(() => {
      target.dispatchEvent(createBeforeInstallPromptEvent());
      result.current.recordSuccessfulSave();
    });
    await waitFor(() => expect(result.current.isVisible).toBe(true));

    act(() => target.dispatchEvent(new Event('appinstalled')));

    await waitFor(() => expect(result.current.isVisible).toBe(false));
  });
});

function createBeforeInstallPromptEvent(): BeforeInstallPromptEvent {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({
      outcome: 'dismissed',
      platform: '',
    } as const),
  });
}

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}
