import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers';

import { BROWSER_BENCHMARK_CONFIG } from './contract';

type WorkerRequest =
  | Readonly<{ type: 'initialize' }>
  | Readonly<{ type: 'query'; id: number; text: string }>;

type ProgressValue = Readonly<{
  file?: unknown;
  loaded?: unknown;
  status?: unknown;
  total?: unknown;
}>;

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;
env.fetch ??= fetch.bind(self);

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void handleRequest(event.data);
});

async function handleRequest(request: WorkerRequest): Promise<void> {
  try {
    if (request.type === 'initialize') {
      await getExtractor();
      self.postMessage({ type: 'ready' });
      return;
    }

    const extractor = await getExtractor();
    const output = await extractor(`query: ${request.text}`, {
      normalize: true,
      pooling: 'mean',
    });

    self.postMessage({
      id: request.id,
      type: 'embedding',
      vector: Array.from(output.data, Number),
    });
  } catch {
    self.postMessage({ type: 'error' });
  }
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  return (extractorPromise ??= pipeline(
    'feature-extraction',
    BROWSER_BENCHMARK_CONFIG.modelId,
    {
      device: BROWSER_BENCHMARK_CONFIG.backend,
      dtype: BROWSER_BENCHMARK_CONFIG.dtype,
      progress_callback(value: ProgressValue) {
        if (
          value.status === 'progress' &&
          typeof value.file === 'string' &&
          typeof value.total === 'number'
        ) {
          self.postMessage({
            file: sanitizeProgressFile(value.file),
            loaded: typeof value.loaded === 'number' ? value.loaded : null,
            total: value.total,
            type: 'progress',
          });
        }
      },
      revision: BROWSER_BENCHMARK_CONFIG.revision,
    }
  ) as Promise<FeatureExtractionPipeline>);
}

function sanitizeProgressFile(file: string): string {
  try {
    return new URL(file).pathname.split('/').at(-1) ?? 'unknown';
  } catch {
    return file.split('/').at(-1) ?? 'unknown';
  }
}
