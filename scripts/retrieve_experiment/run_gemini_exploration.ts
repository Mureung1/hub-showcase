import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  createFileEmbeddingCache,
  type EmbeddingCache,
  type EmbeddingProvider,
} from './embedding_provider';
import type { ExternalExecutionApproval } from './experiment_manifest';
import {
  createGeminiEmbeddingProvider,
  GEMINI_FREE_TIER_EXECUTION_CONFIRMATION,
  type GeminiEmbeddingUsage,
} from './gemini_embedding_provider';
import {
  createGeminiDocumentProjection,
  createGeminiQueryProjection,
  GEMINI_PROJECTION_HASH,
} from './gemini_projection';
import { GEMINI_CANDIDATE_PROFILE } from './report';
import {
  runExploration,
  writeExplorationArtifacts,
  type ExplorationArtifactPaths,
} from './run_exploration';

export const GEMINI_CLI_CONFIRMATION_FLAG =
  '--confirm-external-synthetic-gemini-free-tier';

export const GEMINI_SYNTHETIC_EXTERNAL_APPROVAL = {
  approved: true,
  approvalReference:
    'codex-user-message-2026-07-23-free-tier-product-improvement-consent',
  projectionHash: GEMINI_PROJECTION_HASH,
  maxDocuments: 72,
  maxQueries: 45,
} as const satisfies ExternalExecutionApproval;

type GeminiProviderFactoryOptions = Readonly<{
  apiKey: string;
  onUsage(usage: GeminiEmbeddingUsage): void;
}>;

export type RunGeminiExplorationCommandOptions = Readonly<{
  args: readonly string[];
  environment: Readonly<Record<string, string | undefined>>;
  cache: EmbeddingCache;
  outputDirectory: string;
  now: () => Date;
  providerFactory?(options: GeminiProviderFactoryOptions): EmbeddingProvider;
}>;

export type GeminiExplorationArtifactPaths = ExplorationArtifactPaths &
  Readonly<{
    receiptPath: string;
  }>;

export function resolveGeminiCommandAuthorization(
  args: readonly string[],
  environment: Readonly<Record<string, string | undefined>>
): {
  apiKey: string;
} {
  if (!args.includes(GEMINI_CLI_CONFIRMATION_FLAG)) {
    throw new Error(
      `Gemini 외부 실행 CLI 확인이 필요합니다: ${GEMINI_CLI_CONFIRMATION_FLAG}`
    );
  }

  const apiKey = environment.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경 변수가 필요합니다.');
  }

  if (GEMINI_FREE_TIER_EXECUTION_CONFIRMATION.trim().length === 0) {
    throw new Error('Gemini Free Tier 승인 확인값이 필요합니다.');
  }

  return {
    apiKey,
  };
}

export async function runGeminiExplorationCommand(
  options: RunGeminiExplorationCommandOptions
): Promise<GeminiExplorationArtifactPaths> {
  const authorization = resolveGeminiCommandAuthorization(
    options.args,
    options.environment
  );
  let apiRequestCount = 0;
  let promptTokenCount = 0;
  const onUsage = (usage: GeminiEmbeddingUsage) => {
    apiRequestCount += 1;
    promptTokenCount += usage.promptTokenCount;
  };
  const provider =
    options.providerFactory?.({
      apiKey: authorization.apiKey,
      onUsage,
    }) ??
    createGeminiEmbeddingProvider({
      apiKey: authorization.apiKey,
      executionConfirmation: GEMINI_FREE_TIER_EXECUTION_CONFIRMATION,
      onUsage,
    });
  const data = await runExploration({
    provider,
    cache: options.cache,
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
  const paths = await writeExplorationArtifacts(data, options.outputDirectory, {
    artifactPrefix: 'gemini_exploration',
    candidateProfile: GEMINI_CANDIDATE_PROFILE,
  });
  const receiptPath = join(
    resolve(options.outputDirectory),
    'gemini_execution_receipt.json'
  );
  const receipt = {
    schemaVersion: 1,
    approvalReference: GEMINI_SYNTHETIC_EXTERNAL_APPROVAL.approvalReference,
    tier: 'free',
    modelId: provider.modelId,
    modelRevision: provider.modelRevision,
    projectionHash: GEMINI_PROJECTION_HASH,
    documentCount: GEMINI_SYNTHETIC_EXTERNAL_APPROVAL.maxDocuments,
    queryCount: GEMINI_SYNTHETIC_EXTERNAL_APPROVAL.maxQueries,
    apiRequestCount,
    promptTokenCount,
    estimatedCostUsd: 0,
    contentMayBeUsedToImproveProducts: true,
    completedAt: options.now().toISOString(),
  } as const;

  if (apiRequestCount > 0 || !(await fileExists(receiptPath))) {
    await writeFile(
      receiptPath,
      `${JSON.stringify(receipt, null, 2)}\n`,
      'utf8'
    );
  }

  return {
    ...paths,
    receiptPath,
  };
}

async function runCommandLine(): Promise<void> {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const paths = await runGeminiExplorationCommand({
    args: process.argv.slice(2),
    environment: process.env,
    cache: createFileEmbeddingCache(
      join(scriptDirectory, '.cache', 'embeddings')
    ),
    outputDirectory: join(scriptDirectory, 'results'),
    now: () => new Date(),
  });
  const receipt = JSON.parse(await readFile(paths.receiptPath, 'utf8')) as {
    apiRequestCount?: unknown;
    promptTokenCount?: unknown;
  };

  process.stdout.write(
    `${JSON.stringify({
      resultPath: paths.resultPath,
      reportPath: paths.reportPath,
      receiptPath: paths.receiptPath,
      apiRequestCount: receipt.apiRequestCount,
      promptTokenCount: receipt.promptTokenCount,
    })}\n`
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, 'utf8');

    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return false;
    }

    throw error;
  }
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  void runCommandLine().catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : '알 수 없는 Gemini 실행 오류입니다.';

    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
