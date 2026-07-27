/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import { IMPORT_LIMITS } from './import_limits';
import { ImportFileError, readTextFile } from './read_import_file';

describe('readTextFile', () => {
  it.each([
    {
      bytes: [0xef, 0xbb, 0xbf, 0xed, 0x95, 0x9c, 0xea, 0xb8, 0x80],
      name: 'utf-8 BOM',
    },
    {
      bytes: [0xed, 0x95, 0x9c, 0xea, 0xb8, 0x80],
      name: 'UTF-8',
    },
    {
      bytes: [0xff, 0xfe, 0x5c, 0xd5, 0x00, 0xae],
      name: 'UTF-16LE BOM',
    },
    {
      bytes: [0xfe, 0xff, 0xd5, 0x5c, 0xae, 0x00],
      name: 'UTF-16BE BOM',
    },
  ])('$name 텍스트를 BOM 없이 읽는다', async ({ bytes }) => {
    const file = createFile(bytes);
    const arrayBuffer = vi.spyOn(file, 'arrayBuffer');

    await expect(readTextFile(file)).resolves.toBe('한글');
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0x68, 0x00, 0x69, 0x00],
    [0xef, 0xbf, 0xbd],
  ])('안전하게 확정할 수 없는 인코딩을 거부한다', async (...bytes) => {
    await expect(readTextFile(createFile(bytes))).rejects.toMatchObject({
      code: 'unsupported-encoding',
    } satisfies Partial<ImportFileError>);
  });

  it('일반 파일과 ZIP에 서로 다른 크기 제한을 적용하고 본문은 읽지 않는다', async () => {
    const textFile = createSizedFile('links.txt', IMPORT_LIMITS.fileBytes + 1);
    const zipFile = createSizedFile(
      'archive.zip',
      IMPORT_LIMITS.zipCompressedBytes + 1,
      'application/zip'
    );

    await expect(readTextFile(textFile)).rejects.toMatchObject({
      code: 'file-too-large',
    });
    await expect(readTextFile(zipFile)).rejects.toMatchObject({
      code: 'file-too-large',
    });
    expect(textFile.arrayBuffer).not.toHaveBeenCalled();
    expect(zipFile.arrayBuffer).not.toHaveBeenCalled();
  });
});

function createFile(bytes: number[]) {
  return new File([new Uint8Array(bytes)], 'links.txt', {
    type: 'text/plain',
  });
}

function createSizedFile(name: string, size: number, type = 'text/plain') {
  return {
    arrayBuffer: vi.fn(),
    name,
    size,
    type,
  } as unknown as File & { arrayBuffer: ReturnType<typeof vi.fn> };
}
