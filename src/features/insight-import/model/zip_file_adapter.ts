import type { Entry, FileEntry } from '@zip.js/zip.js';

import type {
  ImportFieldMappingRequest,
  ImportSourceAdapter,
} from './import_adapter';
import { bookmarkHtmlAdapter } from './bookmark_html_adapter';
import { extractFileCandidates } from './file_adapter_registry';
import { IMPORT_LIMITS } from './import_limits';
import type {
  ImportCandidate,
  ImportFieldMapping,
  ImportInput,
} from './import_types';
import { assertImportFileSize, ImportFileError } from './read_import_file';
import {
  genericCsvAdapter,
  genericJsonAdapter,
} from './structured_file_adapter';
import {
  genericHtmlAdapter,
  genericMarkdownAdapter,
  genericTextAdapter,
} from './text_file_adapter';

const ALLOWED_EXTENSIONS = new Set([
  '.csv',
  '.htm',
  '.html',
  '.json',
  '.markdown',
  '.md',
  '.txt',
]);
const CHILD_ADAPTERS = [
  bookmarkHtmlAdapter,
  genericCsvAdapter,
  genericJsonAdapter,
  genericHtmlAdapter,
  genericMarkdownAdapter,
  genericTextAdapter,
] as const;

type FileImportInput = Extract<ImportInput, { kind: 'file' }>;

export const zipFileAdapter: ImportSourceAdapter = {
  async detect(input) {
    if (
      input.kind !== 'file' ||
      (!input.file.name.toLowerCase().endsWith('.zip') &&
        input.file.type.toLowerCase() !== 'application/zip')
    ) {
      return null;
    }

    const result = await processZip(input, false);

    return {
      adapterKey: 'zip',
      confidence: 1,
      mappingRequests:
        result.mappingRequests.length > 0 ? result.mappingRequests : null,
    };
  },

  async extract(input) {
    if (input.kind !== 'file') {
      throw new ImportFileError('unsupported-structure');
    }

    const result = await processZip(input, true);

    if (result.mappingRequests.length > 0) {
      throw new ImportFileError('unsupported-structure');
    }

    return result.candidates;
  },
};

export function isUnsafeZipPath(filename: string) {
  const normalized = filename.replaceAll('\\', '/');

  return (
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    /^[a-z]:\//iu.test(normalized) ||
    normalized.split('/').some((segment) => segment === '..')
  );
}

async function processZip(input: FileImportInput, collectCandidates: boolean) {
  assertImportFileSize(input.file);

  const { BlobReader, ZipReader } = await import('@zip.js/zip.js');
  const reader = new ZipReader(new BlobReader(input.file));
  let entries: Entry[];

  try {
    entries = await reader.getEntries();
    const supportedEntries = preflightEntries(entries);
    const candidates: ImportCandidate[] = [];
    const mappingRequests: ImportFieldMappingRequest[] = [];
    let actualUncompressedBytes = 0;

    for (const entry of supportedEntries) {
      const entryFile = await extractEntryFile(entry, (byteCount) => {
        actualUncompressedBytes += byteCount;

        if (actualUncompressedBytes > IMPORT_LIMITS.zipUncompressedBytes) {
          throw new ImportFileError('limit-exceeded');
        }
      });
      const childMappings = getChildMappings(input.mappings, entry.filename);
      const result = await extractFileCandidates(
        { file: entryFile, kind: 'file', mappings: childMappings },
        CHILD_ADAPTERS
      );

      if (result.mappingRequests) {
        mappingRequests.push(
          ...result.mappingRequests.map((request) => ({
            ...request,
            sourceKey: entry.filename,
            suggested: {
              ...request.suggested,
              sourceKey: entry.filename,
            },
          }))
        );
        continue;
      }

      if (!collectCandidates) {
        continue;
      }

      for (const candidate of result.candidates) {
        if (candidates.length >= IMPORT_LIMITS.candidateCount) {
          throw new ImportFileError('limit-exceeded');
        }

        candidates.push({
          ...candidate,
          candidateId: `zip:${entry.filename}:${candidate.candidateId}`,
          sourceLocation: `ZIP ${entry.filename} · ${candidate.sourceLocation}`,
        });
      }
    }

    return { candidates, mappingRequests };
  } catch (error) {
    if (error instanceof ImportFileError) {
      throw error;
    }

    throw new ImportFileError('corrupted-file');
  } finally {
    try {
      await reader.close();
    } catch {
      // reader 정리 실패가 앞서 판별한 ZIP 오류를 덮어쓰지 않게 한다.
    }
  }
}

function preflightEntries(entries: Entry[]) {
  if (entries.length > IMPORT_LIMITS.zipEntryCount) {
    throw new ImportFileError('limit-exceeded');
  }

  let declaredUncompressedBytes = 0;
  const normalizedPaths = new Set<string>();
  const supportedEntries: FileEntry[] = [];

  for (const entry of entries) {
    const normalizedPath = entry.filename.replaceAll('\\', '/');
    const extension = getExtension(normalizedPath);

    if (
      isUnsafeZipPath(entry.filename) ||
      entry.encrypted ||
      isSymbolicLink(entry)
    ) {
      throw new ImportFileError('unsafe-zip');
    }

    if (normalizedPaths.has(normalizedPath)) {
      throw new ImportFileError('unsafe-zip');
    }
    normalizedPaths.add(normalizedPath);

    if (extension === '.zip') {
      throw new ImportFileError('unsafe-zip');
    }

    if (entry.directory || !ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    if (entry.uncompressedSize > IMPORT_LIMITS.zipEntryBytes) {
      throw new ImportFileError('limit-exceeded');
    }

    declaredUncompressedBytes += entry.uncompressedSize;
    if (declaredUncompressedBytes > IMPORT_LIMITS.zipUncompressedBytes) {
      throw new ImportFileError('limit-exceeded');
    }

    supportedEntries.push(entry);
  }

  if (supportedEntries.length === 0) {
    throw new ImportFileError('unsupported-structure');
  }

  return supportedEntries;
}

async function extractEntryFile(
  entry: FileEntry,
  onBytes: (byteCount: number) => void
) {
  const chunks: ArrayBuffer[] = [];
  let entryBytes = 0;
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      entryBytes += chunk.byteLength;
      onBytes(chunk.byteLength);

      if (entryBytes > IMPORT_LIMITS.zipEntryBytes) {
        throw new ImportFileError('limit-exceeded');
      }

      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      chunks.push(copy.buffer);
    },
  });

  await entry.getData(writable);

  return new File(chunks, entry.filename, {
    type: getMimeType(entry.filename),
  });
}

function getChildMappings(
  mappings: ImportFieldMapping[] | undefined,
  filename: string
) {
  const mapping = mappings?.find(({ sourceKey }) => sourceKey === filename);

  return mapping ? [{ ...mapping, sourceKey: 'file' }] : undefined;
}

function getExtension(filename: string) {
  const finalSegment = filename.split('/').at(-1) ?? '';
  const dotIndex = finalSegment.lastIndexOf('.');
  return dotIndex >= 0 ? finalSegment.slice(dotIndex).toLowerCase() : '';
}

function getMimeType(filename: string) {
  const extension = getExtension(filename);

  if (extension === '.csv') {
    return 'text/csv';
  }

  if (extension === '.json') {
    return 'application/json';
  }

  if (extension === '.html' || extension === '.htm') {
    return 'text/html';
  }

  if (extension === '.md' || extension === '.markdown') {
    return 'text/markdown';
  }

  return 'text/plain';
}

function isSymbolicLink(entry: Entry) {
  return (
    entry.unixMode !== undefined && (entry.unixMode & 0o170000) === 0o120000
  );
}
