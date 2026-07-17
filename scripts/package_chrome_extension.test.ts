import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';

import { packageChromeExtension } from './package_chrome_extension';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

describe('packageChromeExtension', () => {
  it('puts build contents at the ZIP root', async () => {
    const root = await createTemporaryDirectory();
    const inputDirectory = join(root, 'dist', 'chrome-extension');
    const outputFile = join(root, 'release', 'amadda-chrome-extension.zip');
    await mkdir(join(inputDirectory, 'icons'), { recursive: true });
    await writeFile(join(inputDirectory, 'manifest.json'), '{}', 'utf8');
    await writeFile(
      join(inputDirectory, 'background.js'),
      'export {};',
      'utf8'
    );
    await writeFile(
      join(inputDirectory, 'icons', 'amadda.png'),
      'image',
      'utf8'
    );

    await packageChromeExtension({ inputDirectory, outputFile });

    const entries = new AdmZip(outputFile)
      .getEntries()
      .map((entry) => entry.entryName);
    expect(entries).toEqual(
      expect.arrayContaining([
        'background.js',
        'icons/amadda.png',
        'manifest.json',
      ])
    );
    expect(entries).not.toContain('chrome-extension/manifest.json');
  });

  it('rejects a build directory without a manifest', async () => {
    const root = await createTemporaryDirectory();
    const inputDirectory = join(root, 'dist', 'chrome-extension');
    await mkdir(inputDirectory, { recursive: true });

    await expect(
      packageChromeExtension({
        inputDirectory,
        outputFile: join(root, 'release', 'extension.zip'),
      })
    ).rejects.toThrow('manifest.json');
  });
});

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'amadda-extension-'));
  temporaryDirectories.push(directory);
  return directory;
}
