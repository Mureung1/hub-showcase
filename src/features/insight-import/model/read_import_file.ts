import { IMPORT_LIMITS } from './import_limits';

export type ImportFileErrorCode =
  | 'file-too-large'
  | 'unsupported-encoding'
  | 'unsupported-structure'
  | 'corrupted-file'
  | 'limit-exceeded'
  | 'unsafe-zip';

export class ImportFileError extends Error {
  readonly code: ImportFileErrorCode;

  constructor(code: ImportFileErrorCode) {
    super(code);
    this.code = code;
    this.name = 'ImportFileError';
  }
}

export async function readTextFile(file: File) {
  assertImportFileSize(file);

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (hasPrefix(bytes, [0xef, 0xbb, 0xbf])) {
    return decodeText(bytes.subarray(3), 'utf-8');
  }

  if (hasPrefix(bytes, [0xff, 0xfe])) {
    return decodeText(bytes.subarray(2), 'utf-16le');
  }

  if (hasPrefix(bytes, [0xfe, 0xff])) {
    return decodeText(bytes.subarray(2), 'utf-16be');
  }

  if (looksLikeBomlessUtf16(bytes)) {
    throw new ImportFileError('unsupported-encoding');
  }

  return decodeText(bytes, 'utf-8');
}

export function assertImportFileSize(file: File) {
  const limit = isZipFile(file)
    ? IMPORT_LIMITS.zipCompressedBytes
    : IMPORT_LIMITS.fileBytes;

  if (file.size > limit) {
    throw new ImportFileError('file-too-large');
  }
}

function decodeText(
  bytes: Uint8Array,
  encoding: 'utf-8' | 'utf-16be' | 'utf-16le'
) {
  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);

    if (text.includes('\uFFFD')) {
      throw new ImportFileError('unsupported-encoding');
    }

    return text;
  } catch (error) {
    if (error instanceof ImportFileError) {
      throw error;
    }

    throw new ImportFileError('unsupported-encoding');
  }
}

function looksLikeBomlessUtf16(bytes: Uint8Array) {
  if (bytes.length < 4) {
    return false;
  }

  const sampleLength = Math.min(bytes.length, 512);
  let evenNullCount = 0;
  let oddNullCount = 0;
  let pairCount = 0;

  for (let index = 0; index + 1 < sampleLength; index += 2) {
    evenNullCount += bytes[index] === 0 ? 1 : 0;
    oddNullCount += bytes[index + 1] === 0 ? 1 : 0;
    pairCount += 1;
  }

  return (
    pairCount > 0 &&
    (evenNullCount / pairCount >= 0.5 || oddNullCount / pairCount >= 0.5)
  );
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function isZipFile(file: File) {
  return (
    file.type.toLowerCase() === 'application/zip' ||
    file.name.toLowerCase().endsWith('.zip')
  );
}
