import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, loadEnv, type Plugin } from 'vite';

import { createChromeExtensionManifest } from './manifest';
import { parseExtensionEnv } from './src/config/extension_env';

const extensionRoot = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(extensionRoot, '..');
const outputDirectory = resolve(repositoryRoot, 'dist/chrome-extension');

type ExtensionBuildEnvironment = Readonly<Record<string, string | undefined>>;

export function resolveExtensionBuildEnv(
  fileEnvironment: ExtensionBuildEnvironment,
  processEnvironment: ExtensionBuildEnvironment = process.env
) {
  return parseExtensionEnv({
    ...fileEnvironment,
    ...processEnvironment,
  });
}

export default defineConfig(({ mode }) => {
  const env = resolveExtensionBuildEnv(loadEnv(mode, repositoryRoot, ''));

  return {
    build: {
      emptyOutDir: true,
      outDir: outputDirectory,
      rollupOptions: {
        input: {
          background: resolve(extensionRoot, 'src/background.ts'),
          memo: resolve(extensionRoot, 'memo.html'),
        },
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: (chunk) =>
            chunk.name === 'background'
              ? 'background.js'
              : 'assets/[name]-[hash].js',
        },
      },
    },
    plugins: [writeExtensionAssets(env)],
    publicDir: false,
    root: extensionRoot,
  };
});

function writeExtensionAssets(
  env: ReturnType<typeof parseExtensionEnv>
): Plugin {
  return {
    async writeBundle() {
      const iconsDirectory = resolve(outputDirectory, 'icons');
      await mkdir(iconsDirectory, { recursive: true });
      await Promise.all([
        copyFile(
          resolve(repositoryRoot, 'public/icons/amadda-192.png'),
          resolve(iconsDirectory, 'amadda-192.png')
        ),
        copyFile(
          resolve(repositoryRoot, 'public/icons/amadda-512.png'),
          resolve(iconsDirectory, 'amadda-512.png')
        ),
      ]);
      await writeFile(
        resolve(outputDirectory, 'manifest.json'),
        `${JSON.stringify(
          createChromeExtensionManifest({
            apiOrigin: env.apiOrigin,
            supabaseUrl: env.supabaseUrl,
          }),
          null,
          2
        )}\n`,
        'utf8'
      );
    },
    name: 'write-chrome-extension-assets',
  };
}
