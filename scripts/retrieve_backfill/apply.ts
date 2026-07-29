import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  GoogleGenAI,
  JobState,
  type InlinedEmbedContentResponse,
} from '@google/genai';

import {
  isEmbeddingVector,
  RETRIEVE_EMBEDDING_MODEL,
} from '../../server/retrieve/retrieve_embedding.js';
import {
  assertBatchName,
  completeBackfillDocument,
  createBackfillAdminClient,
  readBackfillManifest,
  readGeminiApiKey,
  reconcileBatchUsage,
  removeBackfillManifest,
} from './shared.js';

type ApplyArguments = {
  batchName: string;
  mode: 'confirm' | 'dry-run';
};

type ParsedBatchResponse =
  | {
      kind: 'failed';
    }
  | {
      kind: 'success';
      promptTokens: number | null;
      vector: number[];
    };

export function readApplyArguments(args: readonly string[]): ApplyArguments {
  const dryRun = args.includes('--dry-run');
  const confirm = args.includes('--confirm');
  const batchIndex = args.indexOf('--batch');
  const batchName = args[batchIndex + 1];

  if (dryRun === confirm) {
    throw new Error('--dry-run 또는 --confirm 중 하나만 지정해 주세요.');
  }

  if (batchIndex < 0 || !batchName || batchName.startsWith('--')) {
    throw new Error('--batch batches/배치-ID를 지정해 주세요.');
  }

  return {
    batchName: assertBatchName(batchName),
    mode: dryRun ? 'dry-run' : 'confirm',
  };
}

export async function runApplyCommand(
  args: readonly string[],
  environment: Readonly<Record<string, string | undefined>>
) {
  const { batchName, mode } = readApplyArguments(args);
  const manifest = await readBackfillManifest(batchName);
  const gemini = new GoogleGenAI({
    apiKey: readGeminiApiKey(environment),
  });
  const batch = await gemini.batches.get({ name: batchName });
  const responses = batch.dest?.inlinedEmbedContentResponses ?? [];
  const parsedResponses = responses.map(parseBatchResponse);
  const succeeded = parsedResponses.filter(
    (response) => response.kind === 'success'
  ).length;
  const terminalFailure =
    batch.state === JobState.JOB_STATE_FAILED ||
    batch.state === JobState.JOB_STATE_CANCELLED ||
    batch.state === JobState.JOB_STATE_EXPIRED;
  const failed = terminalFailure
    ? manifest.documents.length
    : parsedResponses.length - succeeded;

  process.stdout.write(`배치 상태: ${batch.state ?? '알 수 없음'}\n`);
  process.stdout.write(`성공 응답: ${succeeded}건\n`);
  process.stdout.write(`실패 응답: ${failed}건\n`);

  if (mode === 'dry-run') {
    process.stdout.write('Supabase에는 반영하지 않았습니다.\n');

    return;
  }

  if (batch.state !== JobState.JOB_STATE_SUCCEEDED) {
    throw new Error(
      '성공한 배치만 반영할 수 있습니다. 완료된 뒤 다시 실행해 주세요.'
    );
  }

  if (responses.length !== manifest.documents.length) {
    throw new Error(
      '배치 응답 수가 제출 기록과 달라 결과를 반영하지 않았습니다.'
    );
  }

  if (batch.model && !batch.model.endsWith(RETRIEVE_EMBEDDING_MODEL)) {
    throw new Error('제출할 때 사용한 임베딩 모델과 결과 모델이 다릅니다.');
  }

  const adminClient = createBackfillAdminClient(environment);
  let applied = 0;
  let stale = 0;
  let promptTokens = 0;
  let hasCompleteUsage = true;

  for (const [index, response] of parsedResponses.entries()) {
    if (response.kind === 'failed') {
      hasCompleteUsage = false;
      continue;
    }

    if (response.promptTokens === null) {
      hasCompleteUsage = false;
    } else {
      promptTokens += response.promptTokens;
    }

    const document = manifest.documents[index];

    if (!document) {
      throw new Error('배치 제출 기록과 결과 순서가 일치하지 않습니다.');
    }

    const completed = await completeBackfillDocument(adminClient, {
      insightId: document.insightId,
      sourceHash: document.sourceHash,
      userId: document.userId,
      vector: response.vector,
    });

    if (completed) {
      applied += 1;
    } else {
      stale += 1;
    }
  }

  await reconcileBatchUsage(
    adminClient,
    hasCompleteUsage
      ? {
          promptTokens,
          reservationId: manifest.reservationId,
          settlement: 'actual',
        }
      : {
          reservationId: manifest.reservationId,
          settlement: 'reserved-maximum',
        }
  );
  await removeBackfillManifest(batchName);

  process.stdout.write(`Supabase 반영: ${applied}건\n`);
  process.stdout.write(`최신 변경으로 건너뜀: ${stale}건\n`);
}

export function parseBatchResponse(
  value: InlinedEmbedContentResponse
): ParsedBatchResponse {
  if (value.error || !value.response) {
    return { kind: 'failed' };
  }

  const vector = value.response.embedding?.values;

  if (!isEmbeddingVector(vector)) {
    return { kind: 'failed' };
  }

  const tokenCount = value.response.tokenCount;

  if (tokenCount === undefined) {
    return {
      kind: 'success',
      promptTokens: null,
      vector,
    };
  }

  if (!/^\d+$/u.test(tokenCount)) {
    throw new Error(
      '배치 토큰 사용량 형식이 올바르지 않아 결과를 반영하지 않았습니다.'
    );
  }

  const promptTokens = Number(tokenCount);

  if (!Number.isSafeInteger(promptTokens)) {
    throw new Error(
      '배치 토큰 사용량이 안전한 범위를 넘어 결과를 반영하지 않았습니다.'
    );
  }

  return {
    kind: 'success',
    promptTokens,
    vector,
  };
}

async function runCommandLine() {
  await runApplyCommand(process.argv.slice(2), process.env);
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  void runCommandLine().catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : '꺼내보기 기존 데이터 변환 결과를 반영하지 못했습니다.';

    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
