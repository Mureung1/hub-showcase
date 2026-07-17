import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerServiceWorker } from './register_service_worker';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('registerServiceWorker', () => {
  it('활성화된 지원 환경에서 루트 서비스 워커를 한 번 등록한다', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });

    await expect(
      registerServiceWorker({ enabled: true, serviceWorker: { register } })
    ).resolves.toBeUndefined();

    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith('/service_worker.js', { scope: '/' });
  });

  it('기본값은 프로덕션이 아닌 테스트 환경에서 등록하지 않는다', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });

    await registerServiceWorker({ serviceWorker: { register } });

    expect(register).not.toHaveBeenCalled();
  });

  it('명시적으로 비활성화하면 지원 환경에서도 등록하지 않는다', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });

    await registerServiceWorker({
      enabled: false,
      serviceWorker: { register },
    });

    expect(register).not.toHaveBeenCalled();
  });

  it('서비스 워커 미지원 환경에서는 undefined로 종료한다', async () => {
    await expect(
      registerServiceWorker({ enabled: true, serviceWorker: undefined })
    ).resolves.toBeUndefined();
  });

  it('navigator가 없는 런타임에서도 안전하게 종료한다', async () => {
    vi.stubGlobal('navigator', undefined);

    await expect(
      registerServiceWorker({ enabled: true })
    ).resolves.toBeUndefined();
  });

  it('등록이 거부돼도 일반 웹 실행을 중단하지 않는다', async () => {
    const register = vi.fn().mockRejectedValue(new Error('등록 거부'));

    await expect(
      registerServiceWorker({ enabled: true, serviceWorker: { register } })
    ).resolves.toBeUndefined();
  });
});
