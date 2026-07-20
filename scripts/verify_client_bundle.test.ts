import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { findClientBundleSecrets } from './verify_client_bundle';

describe('클라이언트 번들 비밀값 검사', () => {
  it.each([
    ['const key="sb_secret_private-value";', 'Supabase secret key'],
    [
      'const key="header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";',
      'Supabase service_role JWT',
    ],
  ])('Supabase 비밀값 형식을 찾는다', (source, label) => {
    expect(findClientBundleSecrets(source)).toContain(label);
  });

  it('공개 키와 검증용 문자열은 비밀값으로 판단하지 않는다', () => {
    expect(
      findClientBundleSecrets(
        'const key="sb_publishable_public-value"; const role="service_role";'
      )
    ).toEqual([]);
  });

  it('JWT가 아닌 점 구분 식별자는 디코딩하지 않는다', () => {
    const bufferSpy = vi.spyOn(Buffer, 'from');

    findClientBundleSecrets('Object.defineProperty.value');

    expect(bufferSpy).not.toHaveBeenCalled();
    bufferSpy.mockRestore();
  });

  it('웹과 Chrome 확장 빌드 뒤에 각각 번들 비밀값을 검사한다', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const webBuild = packageJson.scripts?.['build:web'] ?? '';
    const extensionBuild = packageJson.scripts?.['build:extension'] ?? '';

    expect(webBuild).toContain('verify_client_bundle.ts dist');
    expect(extensionBuild).toContain(
      'verify_client_bundle.ts dist/chrome-extension'
    );
    expect(webBuild.indexOf('vite build')).toBeLessThan(
      webBuild.indexOf('verify_client_bundle.ts dist')
    );
    expect(extensionBuild.indexOf('vite build')).toBeLessThan(
      extensionBuild.indexOf('verify_client_bundle.ts dist/chrome-extension')
    );
  });
});
