import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  findClientBundleSecrets,
  verifyClientBundle,
} from './verify_client_bundle';

describe('클라이언트 번들 비밀값 검사', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it.each([
    'SUPABASE_SERVICE_ROLE_KEY',
    'NOTION_CLIENT_SECRET',
    'IMPORT_TOKEN_ENCRYPTION_KEY',
    'CRON_SECRET',
  ])('서버 비밀 설정 marker %s를 찾는다', (name) => {
    expect(findClientBundleSecrets(`const marker="${name}"`)).toContain(
      `서버 비밀 설정 ${name}`
    );
  });

  it('VITE 접두사가 없어도 실제 서버 비밀값을 찾는다', () => {
    expect(
      findClientBundleSecrets('const leaked="notion-test-secret"', {
        NOTION_CLIENT_SECRET: 'notion-test-secret',
      })
    ).toContain('환경 변수 NOTION_CLIENT_SECRET');
  });

  it.each([
    ['VITE_google_client_secret', 'oauth-secret-value'],
    ['VITE_CLIENT_SECRET', 'short'],
  ])(
    '이름의 대소문자나 값 길이와 무관하게 비밀 환경 변수 %s를 찾는다',
    (name, value) => {
      expect(findClientBundleSecrets(value, { [name]: value })).toContain(
        `환경 변수 ${name}`
      );
    }
  );

  it('JWT가 아닌 점 구분 식별자는 디코딩하지 않는다', () => {
    const bufferSpy = vi.spyOn(Buffer, 'from');

    findClientBundleSecrets('Object.defineProperty.value');

    expect(bufferSpy).not.toHaveBeenCalled();
  });

  it('중첩된 빌드 파일의 비밀 환경 변수와 파일 경로를 함께 보고한다', () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), 'amadda-bundle-'));
    const chunksDirectory = join(outputDirectory, 'chunks');
    const secretFile = join(chunksDirectory, 'app.js');

    try {
      mkdirSync(chunksDirectory);
      writeFileSync(secretFile, 'const secret="short";', 'utf8');

      expect(() =>
        verifyClientBundle(outputDirectory, {
          VITE_CLIENT_SECRET: 'short',
        })
      ).toThrow(`${secretFile}: 환경 변수 VITE_CLIENT_SECRET`);
    } finally {
      rmSync(outputDirectory, { force: true, recursive: true });
    }
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
