// hometax guide-extension 통신 유틸 테스트 — 실제 브라우저/확장 없이 chrome.runtime.sendMessage를
// 모킹해 4가지 분기를 고정한다: 성공 / lastError / chrome 자체가 없음 / 타임아웃.
// @types/chrome이 전역 타입을 엄격하게 강제해서, 모킹 코드는 any 캐스팅으로 우회한다(테스트 전용).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function setMockChrome(mock: unknown) {
  (globalThis as any).chrome = mock;
}

function clearMockChrome() {
  delete (globalThis as any).chrome;
}

async function importFresh() {
  vi.resetModules();
  return import('./hometaxExtension');
}

describe('checkHometaxExtension / startHometaxGuide', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_HOMETAX_EXTENSION_ID', 'test-extension-id');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    clearMockChrome();
  });

  it('chrome API 자체가 없으면 no-chrome-api로 즉시 실패한다', async () => {
    clearMockChrome();
    const { checkHometaxExtension } = await importFresh();
    await expect(checkHometaxExtension()).resolves.toEqual({ available: false, reason: 'no-chrome-api' });
  });

  it('확장이 정상 응답하면 available:true', async () => {
    setMockChrome({
      runtime: {
        lastError: undefined,
        sendMessage: (_id: string, _msg: unknown, cb: (resp: unknown) => void) => cb({ ok: true, pong: true }),
      },
    });
    const { checkHometaxExtension } = await importFresh();
    await expect(checkHometaxExtension()).resolves.toEqual({ available: true });
  });

  it('chrome.runtime.lastError가 찍히면 not-installed로 실패한다', async () => {
    setMockChrome({
      runtime: {
        lastError: { message: 'Could not establish connection.' },
        sendMessage: (_id: string, _msg: unknown, cb: (resp: unknown) => void) => cb(undefined),
      },
    });
    const { checkHometaxExtension } = await importFresh();
    await expect(checkHometaxExtension()).resolves.toEqual({ available: false, reason: 'not-installed' });
  });

  it('응답이 안 오면 타임아웃으로 실패한다', async () => {
    vi.useFakeTimers();
    setMockChrome({ runtime: { lastError: undefined, sendMessage: () => {} } });
    const { checkHometaxExtension } = await importFresh();
    const promise = checkHometaxExtension();
    await vi.advanceTimersByTimeAsync(900);
    await expect(promise).resolves.toEqual({ available: false, reason: 'timeout' });
  });

  it('startHometaxGuide는 확장이 없으면 PING 실패 이유를 그대로 전달한다', async () => {
    clearMockChrome();
    const { startHometaxGuide } = await importFresh();
    await expect(startHometaxGuide('환급금 조회하고 싶어')).resolves.toEqual({
      ok: false,
      reason: 'no-chrome-api',
    });
  });
});
