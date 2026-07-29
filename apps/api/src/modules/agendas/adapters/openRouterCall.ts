import { z } from "zod";
import { ERROR_CODES } from "@decision-log/shared";

import { loadEnv } from "../../../shared/config/env.js";
import { ManagerCallError } from "../agendas.types.js";
import type { ClassifiableSection } from "../ports/agendaClassifier.port.js";

/**
 * OpenRouter 호출 공통부 (SPEC-AI-002 §15.3).
 *
 * AgendaClassifier(단계 3·4)와 ConflictComparator(단계 6) 두 어댑터가 같은 호출 규약을 쓴다 —
 * 재사용이 실제로 확인된 시점에 분리했다(CLAUDE.md 4장·13장 7).
 *
 * OpenRouter의 `provider` 라우팅·`require_parameters`는 OpenAI SDK 표면이 아니므로
 * fetch로 직접 호출하고 요청 body를 명시적으로 타이핑한다(any 금지). 호출 설정은 §15.3:
 * `response_format: json_schema strict` · `provider.require_parameters` · **max_tokens 미설정**.
 *
 * ⚠️ 구조화 출력이 거부되면 **프롬프트-JSON으로 우회하지 않는다.** 응답 형식 보장이 사라지면
 * §11 검증 체계가 무너지므로, 관련 오류는 비재시도로 즉시 드러낸다. 모델 교체는 사용자 판단.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- 요청 body (OpenRouter 표면을 명시적으로 정의) ---
interface JsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: { name: string; strict: true; schema: Record<string, unknown> };
}
export interface OpenRouterRequestBody {
  model: string;
  messages: { role: "user"; content: string }[];
  response_format: JsonSchemaResponseFormat;
  provider: { require_parameters: true };
  // max_tokens는 넣지 않는다(Qwen JSON 잘림 방지, §15.3).
}

/** 구조화 출력을 요구하는 요청 body를 만든다. 호출부는 스키마와 이름만 정하면 된다. */
export function buildRequestBody(input: {
  model: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): OpenRouterRequestBody {
  return {
    model: input.model,
    messages: [{ role: "user", content: input.prompt }],
    response_format: {
      type: "json_schema",
      json_schema: { name: input.schemaName, strict: true, schema: input.schema },
    },
    provider: { require_parameters: true },
  };
}

// --- 응답 봉투 (외부 데이터 → Zod 검증) ---
const OpenRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullish() }).nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .nullish(),
  usage: z
    .object({
      prompt_tokens: z.number().nullish(),
      completion_tokens: z.number().nullish(),
    })
    .nullish(),
  error: z
    .object({ message: z.string(), code: z.union([z.string(), z.number()]).nullish() })
    .nullish(),
});

/** 구조화 출력 미지원으로 보이는 오류 문구. 이 경우 우회하지 않고 보고한다. */
function looksLikeStructuredOutputRejection(message: string): boolean {
  return /json_schema|response_format|structured output|require_parameters|no (allowed )?providers?|no endpoints|does(n't| not) support|not supported/i.test(
    message,
  );
}

/** §16.2 구분 블록으로 감싼 섹션 목록. 비신뢰 입력을 데이터로 선언한다. */
export function formatSections(sections: ClassifiableSection[]): string {
  return sections
    .map(
      (s) =>
        `<ai_answer provider="${s.provider}" section="${s.id}" title="${s.title}">\n${s.content}\n</ai_answer>`,
    )
    .join("\n\n");
}

/** 쟁점 앵커 목록 (라벨 + 제목). */
export function formatAgendas(
  agendas: { id: string; title: string }[],
): string {
  if (agendas.length === 0) return "(없음)";
  return agendas.map((a) => `- ${a.id}: ${a.title}`).join("\n");
}

/**
 * OpenRouter 호출 1회. 타임아웃·상태코드를 errorCode 5종으로 분류한다(§2.4).
 * 구조화 출력 거부는 비재시도(재시도해도 소용없다)로 명확히 드러낸다.
 */
export async function callOpenRouter(
  body: OpenRouterRequestBody,
): Promise<{ content: string; outputTokens: number | null }> {
  const env = loadEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.MANAGER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ManagerCallError(
        ERROR_CODES.PROVIDER_TIMEOUT,
        true,
        "Manager가 제한 시간 안에 응답하지 않았습니다.",
      );
    }
    throw new ManagerCallError(
      ERROR_CODES.NETWORK_ERROR,
      true,
      "Manager 호출 중 네트워크 오류가 발생했습니다.",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let parsed: z.infer<typeof OpenRouterResponseSchema>;
  try {
    parsed = OpenRouterResponseSchema.parse(JSON.parse(text));
  } catch {
    // 상태코드로만 분류한다(원문은 남기지 않는다, §16.3).
    if (!response.ok) throw classifyStatus(response.status, "");
    throw new ManagerCallError(
      ERROR_CODES.SCHEMA_VALIDATION_FAILED,
      true,
      "Manager 응답 봉투를 해석하지 못했습니다.",
    );
  }

  const apiErrorMessage = parsed.error?.message ?? "";
  if (parsed.error || !response.ok) {
    if (apiErrorMessage && looksLikeStructuredOutputRejection(apiErrorMessage)) {
      throw new ManagerCallError(
        ERROR_CODES.PROVIDER_ERROR,
        false,
        "Manager 모델이 구조화 출력(json_schema/strict)을 거부했습니다. 우회하지 않고 보고합니다 — 모델 교체가 필요할 수 있습니다.",
        true,
      );
    }
    throw classifyStatus(response.ok ? 502 : response.status, apiErrorMessage);
  }

  const content = parsed.choices?.[0]?.message?.content ?? "";
  if (content.trim().length === 0) {
    throw new ManagerCallError(
      ERROR_CODES.SCHEMA_VALIDATION_FAILED,
      true,
      "Manager가 빈 응답을 반환했습니다.",
    );
  }

  return {
    content,
    outputTokens: parsed.usage?.completion_tokens ?? null,
  };
}

/** HTTP 상태 → errorCode 5종. 5xx·429는 재시도, 그 외 4xx는 즉시 실패(§2.4). */
function classifyStatus(status: number, apiMessage: string): ManagerCallError {
  if (apiMessage && looksLikeStructuredOutputRejection(apiMessage)) {
    return new ManagerCallError(
      ERROR_CODES.PROVIDER_ERROR,
      false,
      "Manager 모델이 구조화 출력을 거부했습니다. 우회하지 않고 보고합니다.",
      true,
    );
  }
  if (status === 429 || status >= 500) {
    return new ManagerCallError(
      ERROR_CODES.PROVIDER_ERROR,
      true,
      `Manager 호출이 실패했습니다(status ${status}).`,
    );
  }
  return new ManagerCallError(
    ERROR_CODES.PROVIDER_ERROR,
    false,
    `Manager 호출이 실패했습니다(status ${status}).`,
  );
}

/** 일시적 오류·스키마 검증 실패면 1회 재시도(§2.4). 비재시도 오류는 그대로 던진다. */
export async function withOneRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ManagerCallError && error.retryable) {
      return await fn();
    }
    throw error;
  }
}

/** 응답 본문 → Zod 검증. 실패는 재시도 대상(§2.4)이며 원문은 남기지 않는다(§16.3). */
export function parseOutput<T>(
  content: string,
  schema: z.ZodType<T>,
  label: string,
): T {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new ManagerCallError(
      ERROR_CODES.SCHEMA_VALIDATION_FAILED,
      true,
      `Manager ${label} 출력이 JSON이 아닙니다.`,
    );
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ManagerCallError(
      ERROR_CODES.SCHEMA_VALIDATION_FAILED,
      true,
      `Manager ${label} 출력이 스키마를 만족하지 않습니다.`,
    );
  }
  return result.data;
}
