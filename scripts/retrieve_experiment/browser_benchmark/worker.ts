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

// 브라우저의 Cache Storage에 고정 모델과 ONNX WASM 자산을 보관한다.
env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;

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
  } catch (error) {
    self.postMessage({
      message: error instanceof Error ? error.message : String(error),
      type: 'error',
    });
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
            file: value.file,
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
