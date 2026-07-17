import { access, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import AdmZip from 'adm-zip';

type PackageChromeExtensionOptions = {
  inputDirectory: string;
  outputFile: string;
};

export async function packageChromeExtension({
  inputDirectory,
  outputFile,
}: PackageChromeExtensionOptions) {
  const manifestPath = join(inputDirectory, 'manifest.json');

  try {
    await access(manifestPath);
  } catch {
    throw new Error(`확장 빌드에 manifest.json이 없습니다: ${manifestPath}`);
  }

  await mkdir(dirname(outputFile), { recursive: true });
  const archive = new AdmZip();
  archive.addLocalFolder(inputDirectory);
  archive.writeZip(outputFile);
}

async function main() {
  const inputDirectory = resolve('dist/chrome-extension');
  const outputFile = resolve('release/amadda-chrome-extension.zip');
  await packageChromeExtension({ inputDirectory, outputFile });
  console.log(`Chrome 확장 ZIP 생성: ${outputFile}`);
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : null;

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'ZIP 생성 실패');
    process.exitCode = 1;
  });
}
