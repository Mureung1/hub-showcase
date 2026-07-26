import { describe, expect, it, vi } from 'vitest';

import { createNotionImportCallback } from './notion_import_callback';

const CONNECTION_ID = '10000000-0000-4000-8000-000000000001';
const nativeAndroid = {
  getPlatform: () => 'android',
  isNativePlatform: () => true,
};
const webRuntime = {
  getPlatform: () => 'web',
  isNativePlatform: () => false,
};

describe('Notion Android 복귀', () => {
  it('시스템 브라우저를 열고 정확한 import 딥링크의 connection만 알린다', async () => {
    const dependencies = createDependencies();
    const callback = createNotionImportCallback({
      ...dependencies,
      runtime: nativeAndroid,
    });
    const listener = vi.fn();
    callback?.subscribe(listener);

    await callback?.open('https://api.notion.com/v1/oauth/authorize');
    dependencies.receiveUrl(
      `com.ppre1ude.amadda://import/notion?connection=${CONNECTION_ID}`
    );

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(CONNECTION_ID)
    );
    expect(dependencies.browser.open).toHaveBeenCalledWith({
      url: 'https://api.notion.com/v1/oauth/authorize',
    });
    expect(dependencies.browser.close).toHaveBeenCalledOnce();
  });

  it('auth callback과 다른 scheme·host는 무시한다', async () => {
    const dependencies = createDependencies();
    const callback = createNotionImportCallback({
      ...dependencies,
      runtime: nativeAndroid,
    });
    const listener = vi.fn();
    callback?.subscribe(listener);

    dependencies.receiveUrl(
      `com.ppre1ude.amadda://auth/callback?connection=${CONNECTION_ID}`
    );
    dependencies.receiveUrl(
      `https://example.com/import/notion?connection=${CONNECTION_ID}`
    );

    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
    expect(dependencies.browser.close).not.toHaveBeenCalled();
  });

  it('프로세스 종료 뒤 launch URL에서 connection을 복구한다', async () => {
    const dependencies = createDependencies();
    dependencies.app.getLaunchUrl.mockResolvedValue({
      url: `com.ppre1ude.amadda://import/notion?connection=${CONNECTION_ID}`,
    });
    const callback = createNotionImportCallback({
      ...dependencies,
      runtime: nativeAndroid,
    });
    const listener = vi.fn();
    callback?.subscribe(listener);

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(CONNECTION_ID)
    );
  });

  it('웹에서는 Android callback 어댑터를 만들지 않는다', () => {
    const dependencies = createDependencies();

    expect(
      createNotionImportCallback({ ...dependencies, runtime: webRuntime })
    ).toBeUndefined();
    expect(dependencies.app.addListener).not.toHaveBeenCalled();
  });
});

function createDependencies() {
  let receiveUrl: ((event: { url: string }) => void) | undefined;
  const app = {
    addListener: vi.fn().mockImplementation(async (_eventName, listener) => {
      receiveUrl = listener;
      return { remove: vi.fn().mockResolvedValue(undefined) };
    }),
    getLaunchUrl: vi.fn().mockResolvedValue(undefined),
  };
  const browser = {
    close: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(undefined),
  };

  return {
    app,
    browser,
    receiveUrl(url: string) {
      receiveUrl?.({ url });
    },
  };
}
