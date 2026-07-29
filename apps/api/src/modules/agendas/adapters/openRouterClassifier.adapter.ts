import { loadEnv } from "../../../shared/config/env.js";
import {
  ClassifyOutputSchema,
  LeftoverOutputSchema,
  LeftoverTitleOnlyOutputSchema,
  type ClassifyOutput,
  type LeftoverOutput,
} from "../agendas.types.js";
import { renderManagerPrompt } from "../managerPrompts.js";
import {
  buildRequestBody,
  callOpenRouter,
  formatAgendas,
  formatSections,
  parseOutput,
  withOneRetry,
} from "./openRouterCall.js";
import type {
  AgendaClassifier,
  ClassifierCallResult,
  ClassifyInput,
  LeftoverInput,
} from "../ports/agendaClassifier.port.js";

/**
 * OpenRouter 기반 AgendaClassifier 어댑터 (SPEC-AI-002 §15.3·§15.4).
 * 단계 3(섹션 정렬)·단계 4(leftover + 제목 중립화)를 담당한다.
 *
 * HTTP 호출·오류 분류·재시도·응답 파싱은 `openRouterCall.ts`(단계 6 어댑터와 공유)에 있다.
 * 이 파일은 **단계 3·4의 JSON Schema와 프롬프트 조립**만 담는다.
 */

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
              // §5.5.3 결론 2로 "40자 이내" 제한을 롤백했다(T-019.2.1 실측에서 이득 미확인).
              // 이 필드는 §5.4 설계 원리 1 — "생각한 뒤 배정한다"는 사고 순서를 만드는 장치다.
              description:
                "이 섹션이 논하는 주제를 한 구절로. 주장의 방향(찬성/반대)은 쓰지 말 것.",
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
                "agendaIds가 2개일 때만 작성. 두 번째 쟁점에서 이 섹션이 별도로 논하는 내용. 1개면 생략.",
            },
          },
          // 스키마 다이어트(§5.5.2 B-2): secondAgendaReason optional은 실측에서 문제가 없어 유지한다.
          required: ["sectionId", "topicRestated", "agendaIds"],
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
      const body = buildRequestBody({
        model,
        prompt,
        schemaName: "section_assignments",
        schema: classifySchema(
          input.sections.map((s) => s.id),
          input.agendas.map((a) => a.id),
        ),
      });
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
      const body = buildRequestBody({
        model,
        prompt,
        schemaName: "leftover_resolution",
        schema: leftoverSchema(leftoverIds, existingIds, suspiciousIds),
      });
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
