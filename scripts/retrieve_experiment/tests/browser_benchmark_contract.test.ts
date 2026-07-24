import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  assertBrowserBenchmarkConfig,
  calculateNearestRankPercentile,
  createWorkerErrorResponse,
  validateEmbeddingVector,
} from '../browser_benchmark/contract';
import { renderBrowserBenchmarkReport } from '../browser_benchmark/report';
import { measureMemoryAtBoundary } from '../browser_benchmark/memory';
import { verifyFixedModelCacheEntries } from '../browser_benchmark/cache_evidence';
import {
  assertCacheHitVerified,
  assertTemporaryProfileDirectory,
  parseCdpMessage,
  runCancellationThenCacheBenchmark,
} from '../browser_benchmark/runner_contract';

describe('브라우저 벤치마크 계약', () => {
  it('nearest-rank 방식으로 p50과 p95를 계산한다', () => {
    const samples = [9, 1, 7, 3, 5];

    expect(calculateNearestRankPercentile(samples, 0.5)).toBe(5);
    expect(calculateNearestRankPercentile(samples, 0.95)).toBe(9);
  });

  it('384차원 유한 벡터만 측정 결과로 허용한다', () => {
    expect(validateEmbeddingVector(new Array(384).fill(0.25))).toHaveLength(
      384
    );
    expect(() => validateEmbeddingVector([Number.NaN])).toThrow('384차원');
    expect(() =>
      validateEmbeddingVector(new Array(384).fill(Infinity))
    ).toThrow('유한');
  });

  it('고정 모델·리비전·q8 WASM 외 설정을 거부한다', () => {
    expect(() =>
      assertBrowserBenchmarkConfig({
        backend: 'wasm',
        dimensions: 384,
        dtype: 'q8',
        modelId: 'Xenova/multilingual-e5-small',
        revision: '761b726dd34fb83930e26aab4e9ac3899aa1fa78',
      })
    ).not.toThrow();

    expect(() =>
      assertBrowserBenchmarkConfig({
        backend: 'webgpu',
        dimensions: 384,
        dtype: 'q8',
        modelId: 'Xenova/multilingual-e5-small',
        revision: '761b726dd34fb83930e26aab4e9ac3899aa1fa78',
      })
    ).toThrow('WASM');
  });

  it('관측하지 못한 값은 이유와 함께 보고서에 남긴다', () => {
    const report = renderBrowserBenchmarkReport({
      generatedAt: '2026-07-23T00:00:00.000Z',
      measurementContract: { coldLoadMs: 123.4 },
      platforms: {
        android: { status: 'not measured', reason: 'CDP 연결 실패' },
        desktop: { status: 'measured' },
      },
    });

    expect(report).toContain('CDP 연결 실패');
    expect(report).toContain('123.4');
  });

  it('UA 메모리 측정이 제한 시간을 넘기면 거짓 peak 대신 미측정을 기록한다', async () => {
    const measurement = await measureMemoryAtBoundary({
      measureUserAgentSpecificMemory: () => new Promise(() => undefined),
      timeoutMs: 1,
    });

    expect(measurement).toEqual({
      bytes: null,
      limitation:
        'UA 특정 메모리 측정이 1ms 안에 끝나지 않아 peak를 추정하지 않았습니다.',
      source: 'timed-out',
    });
  });

  it('UA 메모리 측정값을 우선 사용한다', async () => {
    await expect(
      measureMemoryAtBoundary({
        measureUserAgentSpecificMemory: async () => ({ bytes: 1234 }),
        timeoutMs: 100,
      })
    ).resolves.toMatchObject({
      bytes: 1234,
      source: 'measureUserAgentSpecificMemory',
    });
  });

  it('UA 메모리 측정이 거부되면 JS heap 추정값으로 대체한다', async () => {
    const measurement = await measureMemoryAtBoundary({
      heapBytes: 4321,
      measureUserAgentSpecificMemory: async () => {
        throw new Error('측정 거부');
      },
      timeoutMs: 100,
    });

    expect(measurement).toMatchObject({
      bytes: 4321,
      source: 'performance.memory',
    });
    expect(measurement.limitation).toContain('UA 특정 메모리 측정 API가 거부');
    expect(measurement.limitation).toContain('JS heap 추정값');
  });

  it('UA 메모리 측정이 시간 초과되면 JS heap 추정값으로 대체한다', async () => {
    const measurement = await measureMemoryAtBoundary({
      heapBytes: 9876,
      measureUserAgentSpecificMemory: () => new Promise(() => undefined),
      timeoutMs: 1,
    });

    expect(measurement).toMatchObject({
      bytes: 9876,
      source: 'performance.memory',
    });
    expect(measurement.limitation).toContain('1ms 안에 끝나지 않아');
    expect(measurement.limitation).toContain('JS heap 추정값');
  });

  it('UA 메모리 거부 사유에서 URL을 제외하고 오류 유형과 안전한 메시지를 남긴다', async () => {
    const measurement = await measureMemoryAtBoundary({
      measureUserAgentSpecificMemory: async () => {
        throw new Error('https://private.example.invalid/memory 접근 실패');
      },
      timeoutMs: 100,
    });

    expect(measurement.limitation).toContain('API');
    expect(measurement.limitation).not.toContain('private.example');
  });

  it('고정 revision의 필수 모델 cache entry를 모두 확인해야 cache hit를 증명한다', () => {
    expect(
      verifyFixedModelCacheEntries([
        { basename: 'config.json', hasFixedRevision: true },
        { basename: 'tokenizer.json', hasFixedRevision: true },
        { basename: 'tokenizer_config.json', hasFixedRevision: true },
        { basename: 'model_quantized.onnx', hasFixedRevision: true },
      ])
    ).toMatchObject({ cacheHitVerified: true, missingRequiredBasenames: [] });

    expect(
      verifyFixedModelCacheEntries([
        { basename: 'config.json', hasFixedRevision: true },
      ])
    ).toMatchObject({
      cacheHitVerified: false,
      missingRequiredBasenames: expect.arrayContaining([
        'model_quantized.onnx',
      ]),
    });
  });

  it('커밋한 보고서는 결과 JSON에서 단일 renderer로 재생성한 문자열과 일치한다', async () => {
    const [resultText, reportText] = await Promise.all([
      readFile(
        'scripts/retrieve_experiment/results/browser_benchmark_result.json',
        'utf8'
      ),
      readFile(
        'scripts/retrieve_experiment/results/browser_benchmark_report.md',
        'utf8'
      ),
    ]);
    const result = JSON.parse(resultText) as Parameters<
      typeof renderBrowserBenchmarkReport
    >[0];

    expect(renderBrowserBenchmarkReport(result)).toBe(
      reportText.replace(/\r\n/gu, '\n')
    );
  });

  it('UA 메모리 API를 원래 receiver로 호출한다', async () => {
    const receiver = {
      bytes: 2468,
      async measureUserAgentSpecificMemory() {
        return { bytes: this.bytes };
      },
    };

    await expect(
      measureMemoryAtBoundary({
        measureUserAgentSpecificMemory: receiver.measureUserAgentSpecificMemory,
        measureUserAgentSpecificMemoryReceiver: receiver,
        timeoutMs: 100,
      })
    ).resolves.toMatchObject({
      bytes: 2468,
      source: 'measureUserAgentSpecificMemory',
    });
  });

  it('취소가 끝난 뒤 새 cache benchmark를 실행한다', async () => {
    const calls: string[] = [];
    const result = await runCancellationThenCacheBenchmark({
      cancelWorker: async () => {
        calls.push('cancel');
        return { cancelled: true };
      },
      measureCache: async () => {
        calls.push('cache');
        return { loadMs: 12 };
      },
    });

    expect(calls).toEqual(['cancel', 'cache']);
    expect(result).toEqual({
      cache: { loadMs: 12 },
      cancellation: { cancelled: true },
    });
  });

  it('캐시 증명 실패를 measured 결과로 확정하지 않는다', () => {
    expect(() =>
      assertCacheHitVerified({
        cacheHitVerified: false,
      })
    ).toThrow('캐시 증명');
    expect(() =>
      assertCacheHitVerified({
        cacheHitVerified: true,
      })
    ).not.toThrow();
  });

  it('Worker query 실패 응답에 요청 ID와 원인을 보존한다', () => {
    expect(
      createWorkerErrorResponse(
        { id: 7, text: '검색어', type: 'query' },
        new Error('임베딩 실패')
      )
    ).toEqual({
      id: 7,
      message: '임베딩 실패',
      type: 'error',
    });
    expect(
      createWorkerErrorResponse({ type: 'initialize' }, '알 수 없는 값')
    ).toEqual({
      message: '알 수 없는 Worker 오류',
      type: 'error',
    });
  });

  it('잘못된 CDP 메시지는 예외 없이 거부한다', () => {
    expect(parseCdpMessage('{')).toBeNull();
    expect(parseCdpMessage('{"id":1,"result":{"ok":true}}')).toEqual({
      id: 1,
      result: { ok: true },
    });
  });

  it('임시 루트 바로 아래의 전용 Chrome 프로필만 삭제 대상으로 허용한다', () => {
    expect(() =>
      assertTemporaryProfileDirectory(
        'C:\\Temp\\hub-retrieve-browser-benchmark-123',
        'C:\\Temp',
        'win32'
      )
    ).not.toThrow();
    expect(() =>
      assertTemporaryProfileDirectory(
        'C:\\Temp\\other-profile',
        'C:\\Temp',
        'win32'
      )
    ).toThrow('삭제 대상');
  });
});
