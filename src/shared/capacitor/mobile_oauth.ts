import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { isNativeAndroid, type CapacitorRuntime } from './runtime';

export const MOBILE_OAUTH_CALLBACK_URL = 'com.ppre1ude.amadda://auth/callback';

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
  addListener(
    eventName: 'browserFinished',
    listener: () => void
  ): Promise<{ remove(): Promise<void> }>;
  close(): Promise<void>;
  open(options: { url: string }): Promise<void>;
};

type MobileOAuthStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

type MobileOAuthClient = {
  auth: Pick<
    SupabaseClient['auth'],
    'exchangeCodeForSession' | 'signInWithOAuth'
  >;
};

type MobileOAuthDependencies = {
  app: AppUrlOpenPlugin;
  browser: SystemBrowser;
  client: MobileOAuthClient;
  runtime: CapacitorRuntime;
  storage: MobileOAuthStorage;
};

export type MobileOAuthContext = 'android-share';

export type MobileOAuth = {
  signInWithGoogle(context?: MobileOAuthContext): Promise<void>;
  subscribeCallbacks(
    listener: (context?: MobileOAuthContext) => void
  ): () => void;
  subscribeFailures(
    listener: (context?: MobileOAuthContext) => void
  ): () => void;
};

type PendingSignIn = {
  context?: MobileOAuthContext;
  reject(error: Error): void;
  resolve(): void;
  promise: Promise<void>;
};

const CALLBACK_URL = new URL(MOBILE_OAUTH_CALLBACK_URL);
const SAFE_SIGN_IN_ERROR = '로그인을 완료하지 못했어요.';
const OAUTH_CONTEXT_STORAGE_KEY = 'amadda.mobileOAuth.context.v1';

const defaultDependencies: MobileOAuthDependencies = {
  app: App,
  browser: Browser,
  client: undefined as never,
  runtime: Capacitor,
  storage: undefined as never,
};
const defaultStorage: MobileOAuthStorage = {
  getItem: (key) => globalThis.localStorage.getItem(key),
  removeItem: (key) => globalThis.localStorage.removeItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
};

function createPendingSignIn(
  context: MobileOAuthContext | undefined
): PendingSignIn {
  let reject!: (error: Error) => void;
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    ...(context ? { context } : {}),
    promise,
    reject,
    resolve,
  };
}

function isMobileOAuthCallback(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === CALLBACK_URL.protocol &&
      url.hostname === CALLBACK_URL.hostname &&
      url.pathname === CALLBACK_URL.pathname
    );
  } catch {
    return false;
  }
}

function createSafeSignInError() {
  return new Error(SAFE_SIGN_IN_ERROR);
}

export function createMobileOAuth(
  dependencies: MobileOAuthDependencies
): MobileOAuth | undefined {
  if (!isNativeAndroid(dependencies.runtime)) {
    return undefined;
  }

  const failureListeners = new Set<(context?: MobileOAuthContext) => void>();
  const callbackListeners = new Set<(context?: MobileOAuthContext) => void>();
  let lastProcessedUrl: string | undefined;
  let pendingSignIn: PendingSignIn | undefined;
  let unobservedCallback: { context?: MobileOAuthContext } | undefined;
  let unobservedFailure: { context?: MobileOAuthContext } | undefined;

  function rememberContext(context: MobileOAuthContext | undefined) {
    try {
      if (context) {
        dependencies.storage.setItem(OAUTH_CONTEXT_STORAGE_KEY, context);
      } else {
        dependencies.storage.removeItem(OAUTH_CONTEXT_STORAGE_KEY);
      }
    } catch {
      // 공유 URL이 아닌 복구 안내 표식이므로 저장소 장애가 OAuth 자체를 막지 않게 한다.
    }
  }

  function consumeStoredContext(): MobileOAuthContext | undefined {
    try {
      const value = dependencies.storage.getItem(OAUTH_CONTEXT_STORAGE_KEY);
      dependencies.storage.removeItem(OAUTH_CONTEXT_STORAGE_KEY);
      return value === 'android-share' ? value : undefined;
    } catch {
      return undefined;
    }
  }

  function notifyFailure(context?: MobileOAuthContext) {
    if (failureListeners.size === 0) {
      unobservedFailure = context ? { context } : {};
      return;
    }

    failureListeners.forEach((listener) => listener(context));
  }

  function notifyCallback(context?: MobileOAuthContext) {
    if (callbackListeners.size === 0) {
      unobservedCallback = context ? { context } : {};
      return;
    }

    callbackListeners.forEach((listener) => listener(context));
  }

  async function closeBrowser() {
    try {
      await dependencies.browser.close();
    } catch {
      // OAuth 결과가 성공했더라도 브라우저 정리 실패가 세션 교환 결과를 바꾸지 않게 한다.
    }
  }

  async function handleUrlOpen(event: AppUrlOpenEvent) {
    if (!isMobileOAuthCallback(event.url)) {
      return;
    }

    if (event.url === lastProcessedUrl) {
      return;
    }
    lastProcessedUrl = event.url;

    const request = pendingSignIn;
    pendingSignIn = undefined;
    const storedContext = consumeStoredContext();
    const context = request?.context ?? storedContext;

    try {
      const url = new URL(event.url);
      const code = url.searchParams.get('code');

      if (url.searchParams.has('error') || !code) {
        throw createSafeSignInError();
      }

      const { error } =
        await dependencies.client.auth.exchangeCodeForSession(code);

      if (error) {
        throw createSafeSignInError();
      }

      request?.resolve();
      notifyCallback(context);
    } catch {
      request?.reject(createSafeSignInError());
      notifyFailure(context);
    } finally {
      await closeBrowser();
    }
  }

  function handleBrowserFinished() {
    const request = pendingSignIn;
    if (!request) {
      return;
    }

    pendingSignIn = undefined;
    const storedContext = consumeStoredContext();
    const context = request.context ?? storedContext;
    request.reject(createSafeSignInError());
    notifyFailure(context);
  }

  const listenerReady = Promise.all([
    dependencies.app.addListener('appUrlOpen', (event) => {
      void handleUrlOpen(event);
    }),
    dependencies.browser.addListener('browserFinished', handleBrowserFinished),
  ]);
  const launchUrlReady = listenerReady.then(async () => {
    try {
      const launchEvent = await dependencies.app.getLaunchUrl();

      if (launchEvent) {
        await handleUrlOpen(launchEvent);
      }
    } catch {
      // 초기 URL 조회 실패는 이후 appUrlOpen 수신과 새 로그인을 막지 않는다.
    }
  });

  return {
    async signInWithGoogle(context) {
      if (pendingSignIn) {
        if (context && !pendingSignIn.context) {
          pendingSignIn.context = context;
          rememberContext(context);
        }
        return pendingSignIn.promise;
      }

      const request = createPendingSignIn(context);
      pendingSignIn = request;
      rememberContext(context);

      try {
        await launchUrlReady;
        const { data, error } = await dependencies.client.auth.signInWithOAuth({
          options: {
            redirectTo: MOBILE_OAUTH_CALLBACK_URL,
            skipBrowserRedirect: true,
          },
          provider: 'google',
        });

        if (error || !data.url) {
          throw createSafeSignInError();
        }

        await dependencies.browser.open({ url: data.url });
      } catch {
        if (pendingSignIn === request) {
          pendingSignIn = undefined;
        }
        consumeStoredContext();
        request.reject(createSafeSignInError());
        notifyFailure(request.context);
      }

      return request.promise;
    },

    subscribeCallbacks(listener) {
      callbackListeners.add(listener);

      if (unobservedCallback) {
        queueMicrotask(() => {
          if (callbackListeners.has(listener) && unobservedCallback) {
            const notification = unobservedCallback;
            unobservedCallback = undefined;
            listener(notification?.context);
          }
        });
      }

      return () => callbackListeners.delete(listener);
    },

    subscribeFailures(listener) {
      failureListeners.add(listener);

      if (unobservedFailure) {
        queueMicrotask(() => {
          if (failureListeners.has(listener) && unobservedFailure) {
            const notification = unobservedFailure;
            unobservedFailure = undefined;
            listener(notification?.context);
          }
        });
      }

      return () => failureListeners.delete(listener);
    },
  };
}

export function createDefaultMobileOAuth(client: MobileOAuthClient) {
  return createMobileOAuth({
    ...defaultDependencies,
    client,
    storage: defaultStorage,
  });
}
