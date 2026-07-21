import { describe, expect, it, vi } from 'vitest';

import { MOBILE_OAUTH_CALLBACK_URL, createMobileOAuth } from './mobile_oauth';

const nativeAndroid = {
  getPlatform: () => 'android',
  isNativePlatform: () => true,
};

const webRuntime = {
  getPlatform: () => 'web',
  isNativePlatform: () => false,
};

function createDependencies() {
  let receiveUrl: ((event: { url: string }) => void) | undefined;
  let finishBrowser: (() => void) | undefined;
  const browser = {
    addListener: vi.fn().mockImplementation(async (_eventName, listener) => {
      finishBrowser = listener;
      return { remove: vi.fn().mockResolvedValue(undefined) };
    }),
    close: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(undefined),
  };
  const client = {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/auth' },
        error: null,
      }),
    },
  };
  const app = {
    addListener: vi.fn().mockImplementation(async (_eventName, listener) => {
      receiveUrl = listener;
      return { remove: vi.fn().mockResolvedValue(undefined) };
    }),
    getLaunchUrl: vi.fn().mockResolvedValue(undefined),
  };
  const storageValues = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => storageValues.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      storageValues.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      storageValues.set(key, value);
    }),
  };

  return {
    app,
    browser,
    client,
    finishBrowser() {
      finishBrowser?.();
    },
    receiveUrl(url: string) {
      receiveUrl?.({ url });
    },
    storage,
  };
}

describe('Capacitor 모바일 OAuth', () => {
  it('Android에서는 시스템 브라우저를 열고 정확한 딥링크의 code를 같은 클라이언트로 교환한다', async () => {
    const dependencies = createDependencies();
    const oauth = createMobileOAuth({
      ...dependencies,
      runtime: nativeAndroid,
    });

    const signIn = oauth?.signInWithGoogle();
    await vi.waitFor(() => {
      expect(dependencies.browser.open).toHaveBeenCalledWith({
        url: 'https://accounts.google.com/o/oauth2/auth',
      });
    });
    expect(dependencies.client.auth.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: MOBILE_OAUTH_CALLBACK_URL,
        skipBrowserRedirect: true,
      },
      provider: 'google',
    });

    dependencies.receiveUrl(`${MOBILE_OAUTH_CALLBACK_URL}?code=pkce-code`);

    await expect(signIn).resolves.toBeUndefined();
    expect(
      dependencies.client.auth.exchangeCodeForSession
    ).toHaveBeenCalledWith('pkce-code');
    expect(dependencies.browser.close).toHaveBeenCalledOnce();
  });

  it('딥링크에 code가 없으면 안전한 로그인 오류로 마치고 브라우저를 닫는다', async () => {
    const dependencies = createDependencies();
    const oauth = createMobileOAuth({
      ...dependencies,
      runtime: nativeAndroid,
    });

    const signIn = oauth?.signInWithGoogle();
    await vi.waitFor(() =>
      expect(dependencies.browser.open).toHaveBeenCalledOnce()
    );
    dependencies.receiveUrl(`${MOBILE_OAUTH_CALLBACK_URL}?error=access_denied`);

    await expect(signIn).rejects.toThrow('로그인을 완료하지 못했어요.');
    expect(
      dependencies.client.auth.exchangeCodeForSession
    ).not.toHaveBeenCalled();
    expect(dependencies.browser.close).toHaveBeenCalledOnce();
  });

  it('사용자가 시스템 브라우저를 닫으면 로그인 취소로 처리한다', async () => {
    const dependencies = createDependencies();
    const oauth = createMobileOAuth({
      ...dependencies,
      runtime: nativeAndroid,
    });

    const signIn = oauth?.signInWithGoogle();
    await vi.waitFor(() =>
      expect(dependencies.browser.open).toHaveBeenCalledOnce()
    );
    dependencies.finishBrowser();

    await expect(signIn).rejects.toThrow('로그인을 완료하지 못했어요.');
  });

  it('종료 상태에서 전달된 OAuth 딥링크도 세션으로 교환하고 구독자에게 알린다', async () => {
    const dependencies = createDependencies();
    dependencies.storage.setItem(
      'amadda.mobileOAuth.context.v1',
      'android-share'
    );
    dependencies.app.getLaunchUrl.mockResolvedValue({
      url: `${MOBILE_OAUTH_CALLBACK_URL}?code=restored-code`,
    });
    const oauth = createMobileOAuth({
      ...dependencies,
      runtime: nativeAndroid,
    });
    const callback = vi.fn();

    oauth?.subscribeCallbacks(callback);

    await vi.waitFor(() =>
      expect(callback).toHaveBeenCalledWith('android-share')
    );
    expect(
      dependencies.client.auth.exchangeCodeForSession
    ).toHaveBeenCalledWith('restored-code');
  });

  it('웹에서는 모바일 OAuth 어댑터를 만들지 않아 기존 redirect 흐름을 유지한다', () => {
    const dependencies = createDependencies();

    expect(
      createMobileOAuth({ ...dependencies, runtime: webRuntime })
    ).toBeUndefined();
    expect(dependencies.app.addListener).not.toHaveBeenCalled();
  });
});
