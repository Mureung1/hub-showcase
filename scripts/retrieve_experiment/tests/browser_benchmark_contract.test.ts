import { describe, expect, it } from 'vitest';

import {
  assertBrowserBenchmarkConfig,
  calculateNearestRankPercentile,
  validateEmbeddingVector,
} from '../browser_benchmark/contract';
import { renderBrowserBenchmarkReport } from '../browser_benchmark/report';
import { measureMemoryAtBoundary } from '../browser_benchmark/memory';

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
      android: { status: 'not measured', reason: 'CDP 연결 실패' },
      desktop: { status: 'measured', coldLoadMs: 123.4 },
    });

    expect(report).toContain('CDP 연결 실패');
    expect(report).toContain('123.4 ms');
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
});
