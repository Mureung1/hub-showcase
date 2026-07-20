import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

interface VercelConfig {
  buildCommand?: string;
  outputDirectory?: string;
  rewrites?: Array<{
    source: string;
    destination: string;
  }>;
}

interface TypeScriptProjectConfig {
  compilerOptions?: {
    module?: string;
    moduleResolution?: string;
    types?: string[];
  };
}

describe('Vercel 배포 설정', () => {
  it('웹 빌드 결과와 SPA 폴백을 선언한다', () => {
    const configPath = resolve(process.cwd(), 'vercel.json');

    expect(existsSync(configPath)).toBe(true);

    if (!existsSync(configPath)) {
      return;
    }

    const config = JSON.parse(readFileSync(configPath, 'utf8')) as VercelConfig;

    expect(config.buildCommand).toBe('npm run build:web');
    expect(config.outputDirectory).toBe('dist');
    expect(config.rewrites).toContainEqual({
      source: '/:path((?!api/).*)',
      destination: '/index.html',
    });
  });

  it('로컬 작업 산출물을 배포 업로드에서 제외한다', () => {
    const ignorePath = resolve(process.cwd(), '.vercelignore');

    expect(existsSync(ignorePath)).toBe(true);

    if (!existsSync(ignorePath)) {
      return;
    }

    const ignoredPaths = readFileSync(ignorePath, 'utf8')
      .split(/\r?\n/u)
      .filter(Boolean);

    expect(ignoredPaths).toContain('.codex-tmp/');
    expect(ignoredPaths).toContain('.env*');
    expect(ignoredPaths).toContain('output/');
    expect(ignoredPaths).toContain('.vercel/');
  });

  it('GitHub Packages 토큰을 저장소 npm 설정에 기록하지 않는다', () => {
    const npmConfig = readFileSync(resolve(process.cwd(), '.npmrc'), 'utf8');

    expect(npmConfig).toContain(
      '@wanteddev:registry=https://npm.pkg.github.com/'
    );
    expect(npmConfig).not.toContain('_authToken');
  });

  it('Vercel 함수 빌더가 Node ESM 해석과 Node 타입을 사용한다', () => {
    const typeScriptConfig = JSON.parse(
      readFileSync(resolve(process.cwd(), 'tsconfig.json'), 'utf8')
    ) as TypeScriptProjectConfig;

    expect(typeScriptConfig.compilerOptions).toMatchObject({
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
    });
    expect(typeScriptConfig.compilerOptions?.types).toContain('node');
    expect(typeScriptConfig.compilerOptions?.types).toContain('vite/client');
  });

  it('서버 실행 코드가 Node ESM 상대 경로 확장자를 명시한다', () => {
    const sourceFiles = ['api', 'server'].flatMap((directory) =>
      readdirSync(resolve(process.cwd(), directory))
        .filter(
          (fileName) =>
            fileName.endsWith('.ts') && !fileName.endsWith('.test.ts')
        )
        .map((fileName) => resolve(process.cwd(), directory, fileName))
    );
    const extensionlessImports = sourceFiles.flatMap((sourceFile) => {
      const source = readFileSync(sourceFile, 'utf8');

      return Array.from(
        source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/gu),
        ([, importPath]) => importPath
      ).filter((importPath) => !importPath?.endsWith('.js'));
    });

    expect(extensionlessImports).toEqual([]);
  });
});
