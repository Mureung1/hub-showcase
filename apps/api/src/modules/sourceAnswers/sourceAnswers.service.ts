import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider, SourceAnswer } from "@decision-log/shared";

import { AppError } from "../../shared/http/appError.js";
import { getAdminClient } from "../../shared/supabase/adminClient.js";
import { preflightProviderKeys } from "./byok.js";
import { createJsonNormalizer } from "./normalizer.js";
import { ProviderCallError } from "./ports.js";
import { createFilePromptTemplate } from "./promptTemplate.js";
import {
  ALL_PROVIDERS,
  modelFor,
  providerClients,
} from "./providers/registry.js";
import * as repo from "./sourceAnswers.repository.js";

/**
 * SourceAnswer 생성 오케스트레이션 (SPEC-AI-001 3·5·6·7·8장).
 *
 * - Service는 req/res를 받지 않는다(CLAUDE.md 8장). 전달 방식(동기 응답/SSE)과 무관하게
 *   동작하도록 진행 상황은 optional 콜백(onUpdate)으로만 알린다 — T-016.2b에서 SSE로 감싼다.
 * - 소유권은 검증된 JWT userId 기준으로 사용자 클라이언트(RLS)에서 확인하고,
 *   저장·상태 갱신은 Secret Key 클라이언트로 수행한다(ADR-002).
 */

/** 재시도 상한 — 첫 실패 시 1회만(domain-policy 2.3, CHECK(retry_count BETWEEN 0 AND 1)). */
const MAX_RETRY_COUNT = 1;

export interface StartGenerationInput {
  userClient: SupabaseClient;
  userId: string;
  chatId: string;
  questionId: string;
  /** 9장: 이번 슬라이스에서는 web이 실어 보낸다. 프롬프트 재료로만 쓰고 인가에 쓰지 않는다. */
  context: string | null;
  /** provider별 상태 변화 알림(선택). 2b에서 SSE 푸시로 연결한다. */
  onUpdate?: (event: {
    provider: AiProvider;
    status: "processing" | "succeeded" | "failed";
    errorCode?: string;
  }) => void;
}

export async function startGeneration(
  input: StartGenerationInput,
): Promise<SourceAnswer[]> {
  const { userClient, userId, chatId, questionId, context, onUpdate } = input;

  // 1) 소유권 검증 — RLS로 안 보이면 남의 것이거나 없는 것. 정보는 은닉한다.
  const question = await repo.findOwnedQuestion(userClient, chatId, questionId);
  if (!question) {
    throw new AppError(
      404,
      "QUESTION_NOT_FOUND",
      "대상 Question을 찾을 수 없습니다.",
    );
  }

  // 2) 사전 키 점검(7.3) — 하나라도 없으면 어떤 저장도 하지 않고 거절한다.
  const { keys, missing } = await preflightProviderKeys(userClient, userId);
  if (missing.length > 0) {
    throw new AppError(
      400,
      "NO_AVAILABLE_KEYS",
      `사용 가능한 AI 키가 없습니다: ${missing.join(", ")}`,
    );
  }

  const promptTemplate = createFilePromptTemplate();
  const normalizer = createJsonNormalizer();
  const adminClient = getAdminClient();

  // 3) 3행 pending 생성(시스템 쓰기)
  const created = await repo.createPendingRows(
    adminClient,
    questionId,
    ALL_PROVIDERS.map((provider) => ({
      provider,
      model: modelFor(provider),
      promptVersion: promptTemplate.version,
    })),
  );
  const rowIdByProvider = new Map(
    created.map((row) => [row.provider, row.id] as const),
  );

  // 9장: 이번 요청에 쓴 Context를 Question에 스냅샷으로 남긴다(재현성).
  await saveContextSnapshot(adminClient, questionId, context);

  // 4) 3사 병렬 호출 — 각자 완료되는 대로 저장한다(5장).
  await Promise.all(
    ALL_PROVIDERS.map((provider) =>
      runProvider({
        adminClient,
        provider,
        rowId: rowIdByProvider.get(provider),
        apiKey: keys.get(provider),
        question: question.message,
        context,
        promptTemplate,
        normalizer,
        onUpdate,
      }),
    ),
  );

  // 5) 최종 스냅샷은 사용자 클라이언트(RLS)로 다시 읽어 돌려준다.
  return repo.listByQuestion(userClient, questionId);
}

async function saveContextSnapshot(
  adminClient: SupabaseClient,
  questionId: string,
  context: string | null,
): Promise<void> {
  const { error } = await adminClient
    .from("questions")
    .update({
      context_snapshot: context === null ? {} : { text: context },
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);
  if (error) throw new Error(`Context 스냅샷 저장 실패: ${error.message}`);
}

interface RunProviderInput {
  adminClient: SupabaseClient;
  provider: AiProvider;
  rowId: string | undefined;
  apiKey: string | undefined;
  question: string;
  context: string | null;
  promptTemplate: ReturnType<typeof createFilePromptTemplate>;
  normalizer: ReturnType<typeof createJsonNormalizer>;
  onUpdate: StartGenerationInput["onUpdate"];
}

/**
 * 한 Provider의 호출·재시도·저장을 처리한다(5장·8.4).
 * 일시적 오류·스키마 검증 실패는 1회 재시도, 영구 오류는 즉시 제외.
 */
async function runProvider(input: RunProviderInput): Promise<void> {
  const {
    adminClient,
    provider,
    rowId,
    apiKey,
    question,
    context,
    promptTemplate,
    normalizer,
    onUpdate,
  } = input;

  if (!rowId || !apiKey) return;

  const client = providerClients.get(provider);
  if (!client) return;
  const model = modelFor(provider);

  let lastRaw: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRY_COUNT; attempt += 1) {
    await repo.markProcessing(adminClient, rowId, { retryCount: attempt });
    onUpdate?.({ provider, status: "processing" });

    const startedAt = Date.now();
    try {
      const prompt = await promptTemplate.render(provider, { question, context });
      const raw = await client.generate({ model, prompt, apiKey });
      lastRaw = raw.rawContent;

      const structuredContent = normalizer.normalize(raw.rawContent);

      await repo.markSucceeded(adminClient, rowId, {
        rawContent: raw.rawContent,
        structuredContent,
        responseMeta: {
          inputTokens: raw.inputTokens,
          outputTokens: raw.outputTokens,
          latencyMs: Date.now() - startedAt,
        },
      });
      onUpdate?.({ provider, status: "succeeded" });
      return;
    } catch (error) {
      const failure =
        error instanceof ProviderCallError
          ? error
          : new ProviderCallError(
              "UNKNOWN_ERROR",
              false,
              "Provider 처리 중 알 수 없는 오류가 발생했습니다.",
            );

      const canRetry = failure.retryable && attempt < MAX_RETRY_COUNT;
      if (canRetry) continue;

      // 재시도 후에도 실패 or 영구 오류 → failed + 비교에서 제외(5장)
      await repo.markFailed(adminClient, rowId, {
        errorCode: failure.errorCode,
        errorMessage: failure.message,
        rawContent: lastRaw,
        excluded: true,
      });
      onUpdate?.({
        provider,
        status: "failed",
        errorCode: failure.errorCode,
      });
      return;
    }
  }
}
