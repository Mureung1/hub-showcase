import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pipeline } from '@huggingface/transformers';

import {
  normalizeEmbeddingInput,
  validateEmbeddingVector,
  type EmbeddingProvider,
  type EmbeddingRequest,
} from './embedding_provider';

export const LOCAL_E5_PROVIDER_ID = 'transformers-js@4.2.0:cpu:q8';
export const LOCAL_E5_MODEL_ID = 'Xenova/multilingual-e5-small';
export const LOCAL_E5_MODEL_REVISION =
  '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
export const LOCAL_E5_DIMENSIONS = 384;
export const LOCAL_E5_RUNTIME_OPTIONS = {
  device: 'cpu',
  dtype: 'q8',
  revision: LOCAL_E5_MODEL_REVISION,
} as const;
export const LOCAL_E5_MODEL_CACHE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '.cache',
  'models'
);

export type LocalE5Extractor = (
  input: string,
  options: Readonly<{
    normalize: true;
    pooling: 'mean';
  }>
) => Promise<Readonly<{ data: ArrayLike<number> }>>;

export type LocalE5ExtractorFactory = () => Promise<LocalE5Extractor>;

export type LocalE5EmbeddingProviderOptions = Readonly<{
  dimensions?: number;
  extractorFactory?: LocalE5ExtractorFactory;
  modelCacheDirectory?: string;
}>;

export function createLocalE5EmbeddingProvider(
  options: LocalE5EmbeddingProviderOptions = {}
): EmbeddingProvider {
  const dimensions = options.dimensions ?? LOCAL_E5_DIMENSIONS;
  const extractorFactory =
    options.extractorFactory ??
    createDefaultExtractorFactory(
      options.modelCacheDirectory ?? LOCAL_E5_MODEL_CACHE_DIRECTORY
    );
  let extractorPromise: Promise<LocalE5Extractor> | undefined;

  return {
    providerId: LOCAL_E5_PROVIDER_ID,
    modelId: LOCAL_E5_MODEL_ID,
    modelRevision: LOCAL_E5_MODEL_REVISION,
    dimensions,
    async embed(request: EmbeddingRequest) {
      const extractor = await (extractorPromise ??= extractorFactory());
      const normalizedInput = normalizeEmbeddingInput(request.text);
      const output = await extractor(
        `${request.taskType}: ${normalizedInput}`,
        {
          normalize: true,
          pooling: 'mean',
        }
      );

      return validateEmbeddingVector(Array.from(output.data), dimensions);
    },
  };
}

function createDefaultExtractorFactory(
  modelCacheDirectory: string
): LocalE5ExtractorFactory {
  return async () => {
    const extractor = await pipeline('feature-extraction', LOCAL_E5_MODEL_ID, {
      cache_dir: modelCacheDirectory,
      ...LOCAL_E5_RUNTIME_OPTIONS,
    });

    return async (input, options) => {
      const output = await extractor(input, options);

      return {
        data: Array.from(output.data, Number),
      };
    };
  };
}
