import { AgendaRecheckResultSchema } from "@decision-log/shared";

import { loadEnv } from "../../../shared/config/env.js";
import { renderManagerPrompt } from "../managerPrompts.js";
import {
  buildRequestBody,
  callOpenRouter,
  parseOutput,
  withOneRetry,
} from "./openRouterCall.js";
import type {
  AgendaRechecker,
  RecheckCallResult,
  RecheckInput,
} from "../ports/agendaRechecker.port.js";
import type { ComparableSection } from "../ports/conflictComparator.port.js";

/**
 * OpenRouter 기반 AgendaRechecker 어댑터 (SPEC-AI-002 §10·§15.3·§15.4).
 *
 * 타임아웃·reasoning 설정은 단계 6과 같다 — 둘 다 긴 추론을 동반하는 호출이다(§2.4).
 */

/** §16.2 구분 블록. `citations.sectionId` 추적이 가능하도록 식별자를 명시한다. */
function formatSections(sections: ComparableSection[]): string {
  return sections
    .map(
      (s) =>
        `<ai_answer provider="${s.provider}" section="${s.sectionId}" title="${s.title}">\n${s.content}\n</ai_answer>`,
    )
    .join("\n\n");
}

/**
 * §10.3 출력 스키마.
 *
 * `sectionId` enum을 **이 쟁점의 섹션만으로 런타임 생성**한다 — 다른 쟁점의 원문을
 * 인용하지 못하게 하는 구조적 방어다. `revisedType`은 nullable이며, 1차 판정이
 * 타당하면 null을 낸다(§10.4).
 */
function recheckSchema(sectionIds: string[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      response: {
        type: "string",
        description: "사용자의 요청에 대한 답. 반드시 아래 인용에 근거할 것.",
      },
      citations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            sectionId: { enum: sectionIds },
            quote: {
              type: "string",
              description: "원문 그대로 복사. 한 글자도 바꾸지 말 것.",
            },
          },
          required: ["sectionId", "quote"],
        },
      },
      revisedType: {
        // strict 모드에서 null 을 허용하려면 enum 에 null 을 함께 넣는다(§10.3 원문 그대로).
        enum: [
          "paraphrasing",
          "detail_expansion",
          "detail_volume",
          "detail_content",
          "main_answer",
          null,
        ],
        description:
          "재검토 결과 1차 판정과 다르다고 판단되면 수정된 유형. 1차 판정이 타당하면 null. detail_content와 main_answer 사이에서 애매하면 main_answer를 택할 것.",
      },
    },
    required: ["response", "citations", "revisedType"],
  };
}

export function createOpenRouterRechecker(): AgendaRechecker {
  const env = loadEnv();
  const version = env.RECHECKER_PROMPT_VERSION;
  const model = env.MANAGER_MODEL;

  return {
    version,

    async recheck(input: RecheckInput): Promise<RecheckCallResult> {
      const prompt = await renderManagerPrompt("recheck", version, {
        question: input.question,
        agendaTitle: input.agendaTitle,
        disagreementType: input.disagreementType ?? "(판정하지 못함)",
        stances: input.stanceSummary,
        recheckRequest: input.recheckRequest,
        sections: formatSections(input.sections),
      });
      const body = buildRequestBody({
        model,
        prompt,
        schemaName: "agenda_recheck",
        schema: recheckSchema(input.sections.map((s) => s.sectionId)),
        reasoningEffort: env.MANAGER_JUDGE_REASONING_EFFORT,
      });
      return withOneRetry(async () => {
        // §2.4.2 — 단계 6과 같은 이유로 타임아웃은 재시도하지 않는다.
        const { content, outputTokens } = await callOpenRouter(body, {
          timeoutMs: env.MANAGER_JUDGE_TIMEOUT_MS,
          retryOnTimeout: false,
        });
        return {
          output: parseOutput(content, AgendaRecheckResultSchema, "재검토"),
          outputTokens,
        };
      });
    },
  };
}
