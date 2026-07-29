import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { GoogleGenAI } from '@google/genai';

import {
  createDocumentEmbeddingText,
  RETRIEVE_EMBEDDING_DIMENSIONS,
  RETRIEVE_EMBEDDING_MODEL,
  RETRIEVE_PROJECTION_VERSION,
} from '../../server/retrieve/retrieve_embedding.js';
import {
  countPendingDocuments,
  createBackfillAdminClient,
  listPendingDocuments,
  MAX_BACKFILL_DOCUMENTS,
  readGeminiApiKey,
  reconcileBatchUsage,
  reserveBatchUsage,
  writeBackfillManifest,
} from './shared.js';

const INLINE_BATCH_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;

type SubmitMode = 'confirm' | 'dry-run';

export function readSubmitMode(args: readonly string[]): SubmitMode {
  const dryRun = args.includes('--dry-run');
  const confirm = args.includes('--confirm');

  if (dryRun === confirm) {
    throw new Error('--dry-run 또는 --confirm 중 하나만 지정해 주세요.');
  }

  return dryRun ? 'dry-run' : 'confirm';
}

export async function runSubmitCommand(
  args: readonly string[],
  environment: Readonly<Record<string, string | undefined>>
) {
  const mode = readSubmitMode(args);
  const adminClient = createBackfillAdminClient(environment);
  const pendingCount = await countPendingDocuments(adminClient);

  process.stdout.write(`꺼내보기 기존 데이터 변환 대상: ${pendingCount}건\n`);

  if (mode === 'dry-run') {
    process.stdout.write('비용이 발생하는 제출은 실행하지 않았습니다.\n');

    return;
  }

  if (pendingCount === 0) {
    process.stdout.write('제출할 기존 인사이트가 없습니다.\n');

    return;
  }

  if (pendingCount > MAX_BACKFILL_DOCUMENTS) {
    throw new Error(
      `한 번에 변환할 수 있는 ${MAX_BACKFILL_DOCUMENTS}건을 넘었습니다. 배치를 나누는 작업이 필요합니다.`
    );
  }

  const documents = await listPendingDocuments(adminClient);

  if (documents.length !== pendingCount) {
    throw new Error(
      '대상 건수가 조회 중 바뀌어 배치를 제출하지 않았습니다. 다시 실행해 주세요.'
    );
  }

  const contents = documents.map(createDocumentEmbeddingText);
  const source = {
    config: {
      outputDimensionality: RETRIEVE_EMBEDDING_DIMENSIONS,
    },
    contents,
  };

  if (
    Buffer.byteLength(JSON.stringify(source), 'utf8') >=
    INLINE_BATCH_SIZE_LIMIT_BYTES
  ) {
    throw new Error(
      '인라인 배치 크기 제한을 넘었습니다. 배치를 나누는 작업이 필요합니다.'
    );
  }

  const gemini = new GoogleGenAI({
    apiKey: readGeminiApiKey(environment),
  });
  const reservationId = await reserveBatchUsage(adminClient, documents.length);
  let createdBatchName: string | null = null;
  let cancellationConfirmed = false;

  try {
    const batch = await gemini.batches.createEmbeddings({
      config: {
        displayName: `retrieve-backfill-${new Date().toISOString()}`,
      },
      model: RETRIEVE_EMBEDDING_MODEL,
      src: {
        inlinedRequests: source,
      },
    });

    if (!batch.name) {
      throw new Error('Gemini가 배치 이름을 반환하지 않았습니다.');
    }

    createdBatchName = batch.name;

    try {
      await writeBackfillManifest({
        batchName: batch.name,
        createdAt: new Date().toISOString(),
        documents: documents.map((document) => ({
          insightId: document.insightId,
          modelId: RETRIEVE_EMBEDDING_MODEL,
          projectionVersion: RETRIEVE_PROJECTION_VERSION,
          sourceHash: document.sourceHash,
          userId: document.userId,
        })),
        reservationId,
        schemaVersion: 1,
      });
    } catch {
      cancellationConfirmed = await gemini.batches
        .cancel({ name: batch.name })
        .then(() => true)
        .catch(() => false);
      throw new Error('배치 제출 기록을 저장하지 못했습니다.');
    }

    process.stdout.write(`Gemini 배치: ${batch.name}\n`);
    process.stdout.write(`제출한 인사이트: ${documents.length}건\n`);
  } catch {
    await reconcileBatchUsage(adminClient, {
      reservationId,
      settlement: 'reserved-maximum',
    });

    if (createdBatchName) {
      throw new Error(
        cancellationConfirmed
          ? '제출 기록을 저장하지 못해 생성된 Gemini 배치를 취소했습니다.'
          : '제출 기록을 저장하지 못했고 생성된 Gemini 배치의 취소 여부를 확인하지 못했습니다.'
      );
    }

    throw new Error(
      'Gemini 배치를 제출하거나 제출 기록을 저장하지 못했습니다.'
    );
  }
}

async function runCommandLine() {
  await runSubmitCommand(process.argv.slice(2), process.env);
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  void runCommandLine().catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : '꺼내보기 기존 데이터 변환 배치를 제출하지 못했습니다.';

    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
