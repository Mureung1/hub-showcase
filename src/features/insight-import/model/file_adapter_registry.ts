import type { ImportDetection, ImportSourceAdapter } from './import_adapter';
import type { ImportCandidate, ImportInput } from './import_types';
import { ImportFileError } from './read_import_file';

type FileImportInput = Extract<ImportInput, { kind: 'file' }>;
type MappingRequests = Exclude<ImportDetection['mappingRequests'], null>;

export type DetectedFileInput = {
  adapter: ImportSourceAdapter;
  detection: ImportDetection;
  input: FileImportInput;
};

export type FileExtractionResult =
  | {
      adapterKey: ImportDetection['adapterKey'];
      candidates: ImportCandidate[];
      mappingRequests: null;
    }
  | {
      adapterKey: ImportDetection['adapterKey'];
      candidates: null;
      mappingRequests: MappingRequests;
    };

export async function detectFileInput(
  file: File,
  adapters: readonly ImportSourceAdapter[]
): Promise<DetectedFileInput> {
  return detectFileInputWithMappings({ file, kind: 'file' }, adapters);
}

async function detectFileInputWithMappings(
  input: FileImportInput,
  adapters: readonly ImportSourceAdapter[]
) {
  let selected: DetectedFileInput | null = null;

  for (const adapter of adapters) {
    const detection = await adapter.detect(input);

    if (
      detection === null ||
      !Number.isFinite(detection.confidence) ||
      detection.confidence < 0 ||
      detection.confidence > 1
    ) {
      continue;
    }

    if (
      selected === null ||
      detection.confidence > selected.detection.confidence
    ) {
      selected = { adapter, detection, input };
    }
  }

  if (selected === null) {
    throw new ImportFileError('unsupported-structure');
  }

  return selected;
}

export async function extractFileCandidates(
  input: FileImportInput,
  adapters: readonly ImportSourceAdapter[]
): Promise<FileExtractionResult> {
  const selected = await detectFileInputWithMappings(input, adapters);
  const mappingRequests = selected.detection.mappingRequests;

  if (mappingRequests !== null && mappingRequests.length > 0) {
    return {
      adapterKey: selected.detection.adapterKey,
      candidates: null,
      mappingRequests,
    };
  }

  try {
    return {
      adapterKey: selected.detection.adapterKey,
      candidates: await selected.adapter.extract(input),
      mappingRequests: null,
    };
  } catch (error) {
    if (
      !(error instanceof ImportFileError) ||
      error.code !== 'unsupported-structure' ||
      selected.detection.adapterKey === 'generic-text'
    ) {
      throw error;
    }

    return extractWithGenericText(input, adapters);
  }
}

async function extractWithGenericText(
  input: FileImportInput,
  adapters: readonly ImportSourceAdapter[]
): Promise<FileExtractionResult> {
  for (const adapter of adapters) {
    const detection = await adapter.detect(input);

    if (
      detection?.adapterKey !== 'generic-text' ||
      !Number.isFinite(detection.confidence) ||
      detection.confidence < 0 ||
      detection.confidence > 1
    ) {
      continue;
    }

    return {
      adapterKey: 'generic-text',
      candidates: await adapter.extract(input),
      mappingRequests: null,
    };
  }

  throw new ImportFileError('unsupported-structure');
}
