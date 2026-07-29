import { z } from "zod";
import { ERROR_CODES } from "@decision-log/shared";

import { loadEnv } from "../../../shared/config/env.js";
import {
  ClassifyOutputSchema,
  LeftoverOutputSchema,
  LeftoverTitleOnlyOutputSchema,
  ManagerCallError,
  type ClassifyOutput,
  type LeftoverOutput,
} from "../agendas.types.js";
import { renderManagerPrompt } from "../managerPrompts.js";
import type {
  AgendaClassifier,
  AgendaRef,
  ClassifiableSection,
  ClassifierCallResult,
  ClassifyInput,
  LeftoverInput,
} from "../ports/agendaClassifier.port.js";

/**
 * OpenRouter 기반 AgendaClassifier 어댑터 (SPEC-AI-002 §15.3·§15.4).
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
interface OpenRouterRequestBody {
  model: string;
  messages: { role: "user"; content: string }[];
  response_format: JsonSchemaResponseFormat;
  provider: { require_parameters: true };
  // max_tokens는 넣지 않는다(Qwen JSON 잘림 방지, §15.3).
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

/** 구조화 출력 미지원으로 보이는 오류 문구. 이 경우 우회하지 않고 보고한다(§B). */
function looksLikeStructuredOutputRejection(message: string): boolean {
  return /json_schema|response_format|structured output|require_parameters|no (allowed )?providers?|no endpoints|does(n't| not) support|not supported/i.test(
    message,
  );
}

/** §16.2 구분 블록으로 감싼 섹션 목록. 비신뢰 입력을 데이터로 선언한다. */
function formatSections(sections: ClassifiableSection[]): string {
  return sections
    .map(
      (s) =>
        `<ai_answer provider="${s.provider}" section="${s.id}" title="${s.title}">\n${s.content}\n</ai_answer>`,
    )
    .join("\n\n");
}

/** 쟁점 앵커 목록 (라벨 + 제목). */
function formatAgendas(agendas: AgendaRef[]): string {
  if (agendas.length === 0) return "(없음)";
  return agendas.map((a) => `- ${a.id}: ${a.title}`).join("\n");
}

/**
 * OpenRouter 호출 1회. 타임아웃·상태코드를 errorCode 5종으로 분류한다(§2.4).
 * 구조화 출력 거부는 비재시도(재시도해도 소용없다)로 명확히 드러낸다.
 */
async function callOpenRouter(
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
async function withOneRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ManagerCallError && error.retryable) {
      return await fn();
    }
    throw error;
  }
}

// --- JSON Schema 빌더 (쟁점/섹션 ID enum은 런타임에 실제 값으로 채운다, 결정 2) ---

function classifySchema(
  sectionIds: string[],
  agendaIds: string[],
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      assignments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            sectionId: { enum: sectionIds },
            topicRestated: {
              type: "string",
              description:
                "이 섹션이 논하는 주제를 한 문장으로. 주장의 방향(찬성/반대)은 쓰지 말 것.",
            },
            agendaIds: {
              type: "array",
              maxItems: 2,
              items: { enum: agendaIds },
              description:
                "같은 주제를 다루는 쟁점. 결론이 정반대여도 주제가 같으면 배정. 해당 없으면 빈 배열. 기본은 1개.",
            },
            secondAgendaReason: {
              type: "string",
              description:
                "agendaIds가 2개일 때만 작성. 두 번째 쟁점에서 이 섹션이 별도로 논하는 내용. 1개면 빈 문자열.",
            },
          },
          required: ["sectionId", "topicRestated", "agendaIds", "secondAgendaReason"],
        },
      },
    },
    required: ["assignments"],
  };
}

/**
 * 단계 4 스키마. enum은 빈 배열이 될 수 없으므로(§6.1) 비어 있는 가지는 제외하고
 * required도 그에 맞춰 조정한다. 셋 중 최소 하나(leftover≥1 또는 의심 제목≥1)는 존재한다.
 */
function leftoverSchema(
  leftoverSectionIds: string[],
  existingAgendaIds: string[],
  suspiciousAgendaIds: string[],
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  if (suspiciousAgendaIds.length > 0) {
    properties.titleRevisions = {
      type: "array",
      description:
        "제목이 특정 결론을 담고 있는 쟁점만 포함. 이미 중립적이면 넣지 말 것.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          agendaId: { enum: suspiciousAgendaIds },
          issue: {
            type: "string",
            description: "현재 제목의 어느 부분이 한쪽 입장에 치우쳤는지",
          },
          newTitle: {
            type: "string",
            description: "중립 명사구. 숫자·형용사·'왜/해야 한다' 금지.",
          },
        },
        required: ["agendaId", "issue", "newTitle"],
      },
    };
    required.push("titleRevisions");
  }

  if (leftoverSectionIds.length > 0) {
    if (existingAgendaIds.length > 0) {
      properties.reassignments = {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            sectionId: { enum: leftoverSectionIds },
            reassignReason: {
              type: "string",
              description:
                "이 섹션과 해당 쟁점이 같은 주제인 이유. 두 표현이 사실상 같은 것을 가리킨다는 점을 명시할 것.",
            },
            agendaId: { enum: existingAgendaIds },
          },
          required: ["sectionId", "reassignReason", "agendaId"],
        },
      };
      required.push("reassignments");
    }
    properties.newAgendas = {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          topicRestated: {
            type: "string",
            description: "이 묶음이 공통으로 논하는 주제. 주장 방향은 쓰지 말 것.",
          },
          title: {
            type: "string",
            description: "중립 명사구. 숫자·형용사·'왜/해야 한다' 금지.",
          },
          sectionIds: {
            type: "array",
            items: { enum: leftoverSectionIds },
            description:
              "이 쟁점에 속하는 섹션. 결론이 달라도 주제가 같으면 함께 묶을 것.",
          },
        },
        required: ["topicRestated", "title", "sectionIds"],
      },
    };
    required.push("newAgendas");
  }

  return { type: "object", additionalProperties: false, properties, required };
}

function parseOutput<T>(
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

export function createOpenRouterClassifier(): AgendaClassifier {
  const env = loadEnv();
  const version = env.CLASSIFIER_PROMPT_VERSION;
  const model = env.MANAGER_MODEL;

  return {
    version,

    async classifySections(
      input: ClassifyInput,
    ): Promise<ClassifierCallResult<ClassifyOutput>> {
      const prompt = await renderManagerPrompt("classify", version, {
        agendas: formatAgendas(input.agendas),
        sections: formatSections(input.sections),
      });
      const schema = classifySchema(
        input.sections.map((s) => s.id),
        input.agendas.map((a) => a.id),
      );
      const body: OpenRouterRequestBody = {
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "section_assignments", strict: true, schema },
        },
        provider: { require_parameters: true },
      };
      return withOneRetry(async () => {
        const { content, outputTokens } = await callOpenRouter(body);
        return {
          output: parseOutput(content, ClassifyOutputSchema, "단계 3"),
          outputTokens,
        };
      });
    },

    async resolveLeftover(
      input: LeftoverInput,
    ): Promise<ClassifierCallResult<LeftoverOutput>> {
      const leftoverIds = input.leftoverSections.map((s) => s.id);
      const existingIds = input.existingAgendas.map((a) => a.id);
      const suspiciousIds = input.suspiciousAgendas.map((a) => a.id);

      const prompt = await renderManagerPrompt("leftover", version, {
        existingAgendas: formatAgendas(input.existingAgendas),
        suspiciousAgendas: formatAgendas(input.suspiciousAgendas),
        leftoverSections:
          input.leftoverSections.length > 0
            ? formatSections(input.leftoverSections)
            : "(없음)",
      });
      const schema = leftoverSchema(leftoverIds, existingIds, suspiciousIds);
      const body: OpenRouterRequestBody = {
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "leftover_resolution", strict: true, schema },
        },
        provider: { require_parameters: true },
      };
      // leftover=0이면 축소 스키마(titleRevisions만)라 그에 맞춰 검증한 뒤 빈 배열로 채운다.
      const titleOnly = leftoverIds.length === 0;
      return withOneRetry(async () => {
        const { content, outputTokens } = await callOpenRouter(body);
        if (titleOnly) {
          const partial = parseOutput(
            content,
            LeftoverTitleOnlyOutputSchema,
            "단계 4",
          );
          return {
            output: {
              titleRevisions: partial.titleRevisions,
              reassignments: [],
              newAgendas: [],
            },
            outputTokens,
          };
        }
        // 가지별로 존재 여부가 다르므로(의심 제목 0개·기존 쟁점 0개) 전부 optional로 받고 채운다.
        const raw = parseOutput(
          content,
          LeftoverOutputSchema.partial(),
          "단계 4",
        );
        return {
          output: {
            titleRevisions: raw.titleRevisions ?? [],
            reassignments: raw.reassignments ?? [],
            newAgendas: raw.newAgendas ?? [],
          },
          outputTokens,
        };
      });
    },
  };
}
