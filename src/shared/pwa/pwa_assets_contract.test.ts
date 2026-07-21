import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

const appOrigin = 'https://app.example';
const publicDirectory = new URL('../../../public/', import.meta.url);

describe('PWA 공개 자산 계약', () => {
  it('매니페스트가 설치 정보와 POST 공유 대상을 선언한다', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('manifest.webmanifest', publicDirectory), 'utf8')
    );

    expect(manifest).toMatchObject({
      name: '아맞다',
      short_name: '아맞다',
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#FFFFFF',
      theme_color: '#0560FD',
      icons: [
        {
          src: '/icons/amadda-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/amadda-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ],
      share_target: {
        action: '/share-target',
        method: 'POST',
        enctype: 'application/x-www-form-urlencoded',
        params: {
          title: 'shared_title',
          text: 'shared_text',
          url: 'shared_url',
        },
      },
    });
  });

  it.each([
    { expectedSize: 192, fileName: 'amadda-192.png' },
    { expectedSize: 512, fileName: 'amadda-512.png' },
  ])(
    '$fileName가 실제 $expectedSize×$expectedSize PNG다',
    ({ expectedSize, fileName }) => {
      const image = readFileSync(new URL(`icons/${fileName}`, publicDirectory));

      expect([...image.subarray(0, 8)]).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      expect(image.subarray(12, 16).toString('ascii')).toBe('IHDR');
      expect(image.readUInt32BE(16)).toBe(expectedSize);
      expect(image.readUInt32BE(20)).toBe(expectedSize);
    }
  );

  it('HTML이 매니페스트, 브랜드 아이콘과 개인정보 보호 메타를 연결한다', () => {
    const html = readFileSync(
      new URL('../../../index.html', import.meta.url),
      'utf8'
    );

    expect(html).toMatch(
      /<link(?=[^>]*\brel=["']manifest["'])(?=[^>]*\bhref=["']\/manifest\.webmanifest["'])[^>]*>/i
    );
    expect(html).toMatch(
      /<link(?=[^>]*\brel=["']icon["'])(?=[^>]*\bhref=["']\/icons\/amadda-192\.png["'])[^>]*>/i
    );
    expect(html).toMatch(
      /<meta(?=[^>]*\bname=["']theme-color["'])(?=[^>]*\bcontent=["']#0560FD["'])[^>]*>/i
    );
    expect(html).toMatch(
      /<meta(?=[^>]*\bname=["']referrer["'])(?=[^>]*\bcontent=["']no-referrer["'])[^>]*>/i
    );
  });

  it('부트스트랩이 React보다 먼저 설치 이벤트를 받고 렌더 뒤 워커를 등록한다', () => {
    const mainSource = readFileSync(
      new URL('../../main.tsx', import.meta.url),
      'utf8'
    );

    expect(mainSource).toMatch(
      /pwaInstallPromptEvents\.start\(window\);\s*applyDesignTokens\(\);[\s\S]*createRoot\([\s\S]*\.render\([\s\S]*\);\s*void registerServiceWorker\(\);/
    );
  });
});

describe('PWA 서비스 워커 계약', () => {
  it('install과 activate에서 즉시 활성화하고 현재 클라이언트를 제어한다', async () => {
    const worker = loadServiceWorker();

    await dispatchLifetimeEvent(worker, 'install');
    await dispatchLifetimeEvent(worker, 'activate');

    expect(worker.skipWaiting).toHaveBeenCalledOnce();
    expect(worker.claim).toHaveBeenCalledOnce();
  });

  it('정확한 same-origin POST 공유 대상만 가로챈다', async () => {
    const worker = loadServiceWorker();
    const response = await dispatchInterceptedRequest(
      worker,
      createUrlEncodedShareRequest({ shared_url: 'https://example.com' })
    );

    expect(response.status).toBe(303);
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['GET 요청', new Request(`${appOrigin}/share-target`)],
    [
      '다른 경로',
      new Request(`${appOrigin}/other`, {
        method: 'POST',
        body: new URLSearchParams(),
      }),
    ],
    [
      '다른 출처',
      new Request('https://other.example/share-target', {
        method: 'POST',
        body: new URLSearchParams(),
      }),
    ],
    [
      '후행 슬래시 경로',
      new Request(`${appOrigin}/share-target/`, {
        method: 'POST',
        body: new URLSearchParams(),
      }),
    ],
  ])('%s은 가로채지 않는다', (_label, request) => {
    const worker = loadServiceWorker();
    const respondWith = vi.fn();

    worker.dispatch('fetch', { request, respondWith });

    expect(respondWith).not.toHaveBeenCalled();
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it('한글과 URL 특수 문자를 손실 없이 fragment에 인코딩한다', async () => {
    const worker = loadServiceWorker();
    const sharedFields = {
      shared_title: ' 한글 제목 + #기억 ',
      shared_text: '설명 공백 + #태그',
      shared_url:
        'https://example.com/path?q=%ED%95%9C%EA%B8%80+plus&next=%23hash#fragment',
    };

    const response = await dispatchInterceptedRequest(
      worker,
      createUrlEncodedShareRequest(sharedFields)
    );
    const expectedQuery = new URLSearchParams(Object.entries(sharedFields));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${appOrigin}/#share-target?${expectedQuery.toString()}`
    );
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it('알려진 문자열은 필드마다 8192자까지 보존한다', async () => {
    const worker = loadServiceWorker();
    const maximumText = '가'.repeat(8192);
    const response = await dispatchInterceptedRequest(
      worker,
      createUrlEncodedShareRequest({ shared_text: maximumText })
    );

    expect(readShareTargetParams(response).get('shared_text')).toBe(
      maximumText
    );
  });

  it('초과 문자열, File과 알 수 없는 필드는 fragment에서 제외한다', async () => {
    const worker = loadServiceWorker();
    const formData = new FormData();
    formData.set('shared_title', new File(['내용'], 'title.txt'));
    formData.set('shared_text', '가'.repeat(8193));
    formData.set('shared_url', 'https://example.com/kept');
    formData.set('unexpected', '외부로 전달하면 안 되는 값');
    const request = new Request(`${appOrigin}/share-target`, {
      method: 'POST',
      body: formData,
    });

    const response = await dispatchInterceptedRequest(worker, request);
    const params = readShareTargetParams(response);

    expect([...params.entries()]).toEqual([
      ['shared_url', 'https://example.com/kept'],
    ]);
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it('폼 파싱 실패는 네트워크 없이 루트 303으로 종료한다', async () => {
    const worker = loadServiceWorker();
    const request = {
      method: 'POST',
      url: `${appOrigin}/share-target`,
      formData: vi.fn().mockRejectedValue(new Error('파싱 실패')),
    } as unknown as Request;

    const response = await dispatchInterceptedRequest(worker, request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`${appOrigin}/`);
    expect(worker.fetch).not.toHaveBeenCalled();
  });
});

function loadServiceWorker() {
  const listeners = new Map<
    string,
    Array<(event: Record<string, unknown>) => void>
  >();
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const claim = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn(() => {
    throw new Error('서비스 워커가 네트워크를 호출했습니다.');
  });
  const self = {
    location: new URL(`${appOrigin}/`),
    clients: { claim },
    skipWaiting,
    addEventListener(
      type: string,
      listener: (event: Record<string, unknown>) => void
    ) {
      const registered = listeners.get(type) ?? [];
      registered.push(listener);
      listeners.set(type, registered);
    },
  };

  vm.runInNewContext(
    readFileSync(new URL('service_worker.js', publicDirectory), 'utf8'),
    {
      self,
      File,
      FormData,
      Promise,
      Response,
      URL,
      URLSearchParams,
      fetch,
    }
  );

  return {
    claim,
    fetch,
    skipWaiting,
    dispatch(type: string, event: Record<string, unknown>) {
      listeners.get(type)?.forEach((listener) => listener(event));
    },
  };
}

async function dispatchLifetimeEvent(
  worker: ReturnType<typeof loadServiceWorker>,
  type: 'activate' | 'install'
): Promise<void> {
  let lifetime: Promise<unknown> | undefined;
  const waitUntil = vi.fn((promise: Promise<unknown>) => {
    lifetime = promise;
  });

  worker.dispatch(type, { waitUntil });

  expect(waitUntil).toHaveBeenCalledOnce();
  await lifetime;
}

async function dispatchInterceptedRequest(
  worker: ReturnType<typeof loadServiceWorker>,
  request: Request
): Promise<Response> {
  const respondWith = vi.fn();
  worker.dispatch('fetch', { request, respondWith });
  expect(respondWith).toHaveBeenCalledOnce();

  return await (respondWith.mock.calls[0]?.[0] as Promise<Response> | Response);
}

function createUrlEncodedShareRequest(fields: Record<string, string>): Request {
  return new Request(`${appOrigin}/share-target`, {
    method: 'POST',
    body: new URLSearchParams(Object.entries(fields)),
  });
}

function readShareTargetParams(response: Response): URLSearchParams {
  const location = response.headers.get('location');
  expect(location).not.toBeNull();
  const hash = new URL(location!).hash;
  expect(hash).toMatch(/^#share-target(?:\?|$)/);

  return new URLSearchParams(hash.split('?', 2)[1] ?? '');
}
