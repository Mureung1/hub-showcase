import { describe, expect, it, vi } from 'vitest';

import {
  createAndroidSharePluginAdapter,
  type AndroidShareNativePlugin,
} from './android_share_plugin';

const nativeAndroid = {
  getPlatform: () => 'android',
  isNativePlatform: () => true,
};

const webRuntime = {
  getPlatform: () => 'web',
  isNativePlatform: () => false,
};

type Deferred<Value> = {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
};

function createDeferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe('Android 공유 플러그인 어댑터', () => {
  it('네이티브가 아닌 브라우저에서는 등록과 호출을 하지 않는 no-op이다', async () => {
    const registerPlugin = vi.fn();
    const adapter = createAndroidSharePluginAdapter({
      registerPlugin,
      runtime: webRuntime,
    });
    const onShare = vi.fn();

    const cleanup = await adapter.subscribe(onShare);
    await adapter.finishShare();
    await cleanup();

    expect(registerPlugin).not.toHaveBeenCalled();
    expect(onShare).not.toHaveBeenCalled();
  });

  it('listener를 먼저 등록한 뒤 최초 pending 공유를 소비한다', async () => {
    const operations: string[] = [];
    const remove = vi.fn().mockResolvedValue(undefined);
    const nativePlugin: AndroidShareNativePlugin = {
      addListener: vi.fn().mockImplementation(async () => {
        operations.push('listener');
        return { remove };
      }),
      finishShare: vi.fn().mockResolvedValue(undefined),
      getPendingShare: vi.fn().mockImplementation(async () => {
        operations.push('pending');
        return {
          id: 'share-1',
          text: 'https://example.com/initial',
          title: '초기 공유',
        };
      }),
    };
    const adapter = createAndroidSharePluginAdapter({
      registerPlugin: () => nativePlugin,
      runtime: nativeAndroid,
    });
    const onShare = vi.fn();

    await adapter.subscribe(onShare);

    expect(operations).toEqual(['listener', 'pending']);
    expect(onShare).toHaveBeenCalledWith({
      id: 'share-1',
      text: 'https://example.com/initial',
      title: '초기 공유',
    });
  });

  it('겹친 wake-up을 직렬로 소비하고 이벤트 payload를 공유 입력으로 사용하지 않는다', async () => {
    const firstPending = createDeferred<Record<string, unknown>>();
    let wakeUp: ((payload: Record<string, unknown>) => void) | undefined;
    let pendingCalls = 0;
    const nativePlugin: AndroidShareNativePlugin = {
      addListener: vi.fn().mockImplementation(async (_eventName, listener) => {
        wakeUp = listener;
        return { remove: vi.fn().mockResolvedValue(undefined) };
      }),
      finishShare: vi.fn().mockResolvedValue(undefined),
      getPendingShare: vi.fn().mockImplementation(async () => {
        pendingCalls += 1;
        return pendingCalls === 1 ? firstPending.promise : {};
      }),
    };
    const adapter = createAndroidSharePluginAdapter({
      registerPlugin: () => nativePlugin,
      runtime: nativeAndroid,
    });
    const onShare = vi.fn();

    const subscription = adapter.subscribe(onShare);
    await vi.waitFor(() => expect(wakeUp).toBeTypeOf('function'));
    wakeUp?.({ id: 'unsafe-id', text: 'https://unsafe.example.com' });
    wakeUp?.({});
    firstPending.resolve({
      id: 'latest-share',
      text: 'https://example.com/latest',
    });
    await subscription;

    expect(pendingCalls).toBe(3);
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledWith({
      id: 'latest-share',
      text: 'https://example.com/latest',
    });
  });

  it('서로 다른 33개 공유 뒤에는 최근 32개 id만 중복으로 무시한다', async () => {
    let wakeUp: (() => void) | undefined;
    const pendingShares = Array.from({ length: 33 }, (_value, index) => ({
      id: `share-${index + 1}`,
      text: `https://example.com/${index + 1}`,
    }));
    const nativePlugin: AndroidShareNativePlugin = {
      addListener: vi.fn().mockImplementation(async (_eventName, listener) => {
        wakeUp = listener;
        return { remove: vi.fn().mockResolvedValue(undefined) };
      }),
      finishShare: vi.fn().mockResolvedValue(undefined),
      getPendingShare: vi.fn().mockImplementation(async () => {
        return pendingShares.shift() ?? {};
      }),
    };
    const adapter = createAndroidSharePluginAdapter({
      registerPlugin: () => nativePlugin,
      runtime: nativeAndroid,
    });
    const onShare = vi.fn();

    await adapter.subscribe(onShare);
    for (let index = 0; index < 32; index += 1) {
      wakeUp?.();
    }
    await vi.waitFor(() => expect(onShare).toHaveBeenCalledTimes(33));

    pendingShares.push({ id: 'share-33', text: 'https://example.com/33' });
    wakeUp?.();
    await vi.waitFor(() => expect(nativePlugin.getPendingShare).toHaveBeenCalledTimes(34));
    expect(onShare).toHaveBeenCalledTimes(33);

    pendingShares.push({ id: 'share-1', text: 'https://example.com/1' });
    wakeUp?.();
    await vi.waitFor(() => expect(onShare).toHaveBeenCalledTimes(34));
  });

  it('구독 해제 시 listener handle을 제거하고 이후 wake-up을 무시한다', async () => {
    let wakeUp: (() => void) | undefined;
    const remove = vi.fn().mockResolvedValue(undefined);
    const nativePlugin: AndroidShareNativePlugin = {
      addListener: vi.fn().mockImplementation(async (_eventName, listener) => {
        wakeUp = listener;
        return { remove };
      }),
      finishShare: vi.fn().mockResolvedValue(undefined),
      getPendingShare: vi.fn().mockResolvedValue({}),
    };
    const adapter = createAndroidSharePluginAdapter({
      registerPlugin: () => nativePlugin,
      runtime: nativeAndroid,
    });

    const cleanup = await adapter.subscribe(vi.fn());
    await cleanup();
    wakeUp?.();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(nativePlugin.getPendingShare).toHaveBeenCalledTimes(1);
  });

  it('Android에서 finishShare를 네이티브 플러그인으로 전달한다', async () => {
    const nativePlugin: AndroidShareNativePlugin = {
      addListener: vi.fn(),
      finishShare: vi.fn().mockResolvedValue(undefined),
      getPendingShare: vi.fn(),
    };
    const adapter = createAndroidSharePluginAdapter({
      registerPlugin: () => nativePlugin,
      runtime: nativeAndroid,
    });

    await adapter.finishShare();

    expect(nativePlugin.finishShare).toHaveBeenCalledTimes(1);
  });
});
