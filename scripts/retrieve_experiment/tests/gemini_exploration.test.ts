import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { EmbeddingCache, EmbeddingProvider } from '../embedding_provider';
import {
  createGeminiDocumentProjection,
  createGeminiQueryProjection,
  GEMINI_PROJECTION_HASH,
} from '../gemini_projection';
import {
  GEMINI_CANDIDATE_PROFILE,
  renderCandidateExplorationReport,
} from '../report';
import {
  GEMINI_CLI_CONFIRMATION_FLAG,
  GEMINI_SYNTHETIC_EXTERNAL_APPROVAL,
  resolveGeminiCommandAuthorization,
  runGeminiExplorationCommand,
} from '../run_gemini_exploration';
import { runExploration, writeExplorationArtifacts } from '../run_exploration';

describe('Gemini 합성 탐색 실행 계약', () => {
  it('승인된 projection을 외부 manifest와 Gemini 후보에 연결한다', async () => {
    const embed = vi.fn<EmbeddingProvider['embed']>(async () => [1, 0]);
    const provider = createProvider(embed);
    const result = await runExploration({
      provider,
      cache: createMemoryCache(),
      candidateProfile: GEMINI_CANDIDATE_PROFILE,
      externalExecution: {
        approval: GEMINI_SYNTHETIC_EXTERNAL_APPROVAL,
        projection: {
          hash: GEMINI_PROJECTION_HASH,
          createDocumentText: createGeminiDocumentProjection,
          createQueryText: createGeminiQueryProjection,
        },
      },
    });

    expect(result.manifest.provider.kind).toBe('external');
    expect(result.manifest.externalApproval).toEqual(
      GEMINI_SYNTHETIC_EXTERNAL_APPROVAL
    );
    expect(embed).toHaveBeenCalledTimes(117);
    expect(embed.mock.calls[0]?.[0].text).toBe(
      'title: React 폼 검증 패턴 | text: 메모: 팀 로그인 화면에서 입력 오류를 즉시 안내할 때 | 카테고리: 개발 | 도메인: react.example'
    );
    expect(embed.mock.calls[72]?.[0].text).toBe(
      'task: search result | query: React 폼 검증'
    );
    expect(
      result.queries[0]?.candidates['semantic-gemini-embedding-2']
    ).toBeDefined();
    expect(
      renderCandidateExplorationReport(result, GEMINI_CANDIDATE_PROFILE)
    ).toContain('꺼내보기 Gemini Embedding 2 합성 탐색 결과');
  });

  it('승인 hash와 실행 projection이 다르면 제공자 호출 전에 거부한다', async () => {
    const embed = vi.fn<EmbeddingProvider['embed']>(async () => [1, 0]);

    await expect(
      runExploration({
        provider: createProvider(embed),
        cache: createMemoryCache(),
        candidateProfile: GEMINI_CANDIDATE_PROFILE,
        externalExecution: {
          approval: GEMINI_SYNTHETIC_EXTERNAL_APPROVAL,
          projection: {
            hash: 'a'.repeat(64),
            createDocumentText: createGeminiDocumentProjection,
            createQueryText: createGeminiQueryProjection,
          },
        },
      })
    ).rejects.toThrow(/projection/u);
    expect(embed).not.toHaveBeenCalled();
  });

  it('Gemini JSON과 Markdown을 로컬 E5 결과와 다른 파일에 기록한다', async () => {
    const outputDirectory = await mkdtemp(
      join(tmpdir(), 'hub-gemini-results-')
    );

    try {
      const data = await runExploration({
        provider: createProvider(async () => [1, 0]),
        cache: createMemoryCache(),
        candidateProfile: GEMINI_CANDIDATE_PROFILE,
        externalExecution: {
          approval: GEMINI_SYNTHETIC_EXTERNAL_APPROVAL,
          projection: {
            hash: GEMINI_PROJECTION_HASH,
            createDocumentText: createGeminiDocumentProjection,
            createQueryText: createGeminiQueryProjection,
          },
        },
      });
      const paths = await writeExplorationArtifacts(data, outputDirectory, {
        artifactPrefix: 'gemini_exploration',
        candidateProfile: GEMINI_CANDIDATE_PROFILE,
      });

      expect(paths.resultPath).toBe(
        join(outputDirectory, 'gemini_exploration_result.json')
      );
      expect(paths.reportPath).toBe(
        join(outputDirectory, 'gemini_exploration_report.md')
      );
      await expect(readFile(paths.reportPath, 'utf8')).resolves.toContain(
        'Gemini Embedding 2'
      );
    } finally {
      await rm(outputDirectory, { recursive: true });
    }
  });

  it('명시적 CLI 확인값과 API key를 모두 요구한다', () => {
    expect(() =>
      resolveGeminiCommandAuthorization([], {
        GEMINI_API_KEY: 'test-api-key',
      })
    ).toThrow(/CLI 확인/u);
    expect(() =>
      resolveGeminiCommandAuthorization([GEMINI_CLI_CONFIRMATION_FLAG], {})
    ).toThrow(/GEMINI_API_KEY/u);
    expect(
      resolveGeminiCommandAuthorization([GEMINI_CLI_CONFIRMATION_FLAG], {
        GEMINI_API_KEY: 'test-api-key',
      })
    ).toEqual({
      apiKey: 'test-api-key',
    });
  });

  it('별도 결과와 실제 token 영수증을 남기고 key는 기록하지 않는다', async () => {
    const outputDirectory = await mkdtemp(
      join(tmpdir(), 'hub-gemini-command-')
    );
    const cache = createMemoryCache();

    try {
      const paths = await runGeminiExplorationCommand({
        args: [GEMINI_CLI_CONFIRMATION_FLAG],
        environment: {
          GEMINI_API_KEY: '기록되면-안-되는-key',
        },
        cache,
        outputDirectory,
        now: () => new Date('2026-07-23T06:00:00.000Z'),
        providerFactory(options) {
          return createProvider(async () => {
            options.onUsage({
              promptTokenCount: 11,
            });

            return [1, 0];
          });
        },
      });
      const receipt = await readFile(paths.receiptPath, 'utf8');
      const result = await readFile(paths.resultPath, 'utf8');
      const report = await readFile(paths.reportPath, 'utf8');

      expect(paths.receiptPath).toBe(
        join(outputDirectory, 'gemini_execution_receipt.json')
      );
      expect(JSON.parse(receipt)).toMatchObject({
        schemaVersion: 1,
        approvalReference: GEMINI_SYNTHETIC_EXTERNAL_APPROVAL.approvalReference,
        tier: 'free',
        modelId: 'gemini-embedding-2',
        projectionHash: GEMINI_PROJECTION_HASH,
        documentCount: 72,
        queryCount: 45,
        apiRequestCount: 117,
        promptTokenCount: 1287,
        estimatedCostUsd: 0,
        contentMayBeUsedToImproveProducts: true,
        completedAt: '2026-07-23T06:00:00.000Z',
      });
      expect(`${receipt}\n${result}\n${report}`).not.toContain(
        '기록되면-안-되는-key'
      );
    } finally {
      await rm(outputDirectory, { recursive: true });
    }
  });
});

function createProvider(embed: EmbeddingProvider['embed']): EmbeddingProvider {
  return {
    providerId: 'gemini-test-provider',
    modelId: 'gemini-embedding-2',
    modelRevision: 'test-revision',
    dimensions: 2,
    embed,
  };
}

function createMemoryCache(): EmbeddingCache {
  const values = new Map<string, readonly number[]>();

  return {
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, vector) {
      values.set(key, [...vector]);
    },
  };
}
