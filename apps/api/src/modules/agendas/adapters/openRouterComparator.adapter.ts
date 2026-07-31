import type { AiProvider } from "@decision-log/shared";

import { loadEnv } from "../../../shared/config/env.js";
import { CompareOutputSchema } from "../agendas.types.js";
import { renderManagerPrompt } from "../managerPrompts.js";
import {
  buildRequestBody,
  callOpenRouter,
  parseOutput,
  withOneRetry,
} from "./openRouterCall.js";
import type {
  CompareInput,
  ComparableSection,
  ComparatorCallResult,
  ConflictComparator,
} from "../ports/conflictComparator.port.js";

/**
 * OpenRouter 기반 ConflictComparator 어댑터 (SPEC-AI-002 §8·§15.3·§15.4).
 * 단계 6(합의/충돌 판정)을 담당한다. 쟁점 하나가 호출 하나다.
 *
 * HTTP 호출·오류 분류·재시도·응답 파싱은 `openRouterCall.ts`(단계 3·4 어댑터와 공유).
 * 이 파일은 **단계 6의 JSON Schema와 프롬프트 조립**만 담는다.
 */

/** §16.2 구분 블록. 섹션 식별자를 명시해 인용 출처를 추적 가능하게 둔다. */
function formatComparableSections(sections: ComparableSection[]): string {
  return sections
    .map(
      (s) =>
        `<ai_answer provider="${s.provider}" section="${s.sectionId}" title="${s.title}">\n${s.content}\n</ai_answer>`,
    )
    .join("\n\n");
}

/**
 * §8.6 출력 스키마.
 *
 * `provider` enum은 **그 쟁점의 참여자만으로 런타임 생성**한다 — 참여하지 않은 AI의
 * stance를 만들어낼 수 없게 하는 구조적 방어다(§16.2-3).
 *
 * `disagreementType`의 description에 충돌 쪽 편향을 직접 심는다 — 프롬프트 본문보다
 * enum description에 넣는 쪽이 효과적이다(§8.5).
 */
function compareSchema(participants: AiProvider[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      comparisonNote: {
        type: "string",
        description: "각 AI의 결론을 한 줄씩 비교해서 적어라.",
      },
      stances: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            provider: { enum: participants },
            quotes: {
              type: "array",
              description:
                "이 AI의 입장이 드러난 원문 문장을 그대로 복사. 이 AI의 섹션이 여러 개면 섹션마다 하나씩. 한 글자도 바꾸지 말 것.",
              items: { type: "string" },
            },
            text: {
              type: "string",
              description:
                "위 인용들을 25자 이내로 압축. 원문에 없는 강도나 단정을 추가하지 말 것.",
            },
          },
          required: ["provider", "quotes", "text"],
        },
      },
      disagreementType: {
        enum: [
          "paraphrasing",
          "detail_expansion",
          "detail_volume",
          "detail_content",
          "main_answer",
        ],
        description:
          "이 쟁점에서 나타난 차이 중 가장 큰 것 하나. paraphrasing = 표현만 다르고 내용 동일. detail_expansion = 한쪽이 같은 내용을 더 자세히 설명. detail_volume = 근거의 개수가 다름. detail_content = 결론은 같으나 제시한 근거가 다름. main_answer = 핵심 결론 자체가 다름. detail_content와 main_answer 사이에서 애매하면 main_answer를 택할 것.",
      },
      confidence: {
        type: "number",
        description: "이 유형 판정에 대한 확신도. 0.0~1.0.",
      },
    },
    required: ["comparisonNote", "stances", "disagreementType", "confidence"],
  };
}

export function createOpenRouterComparator(): ConflictComparator {
  const env = loadEnv();
  const version = env.COMPARATOR_PROMPT_VERSION;
  const model = env.MANAGER_MODEL;

  return {
    version,

    async compare(input: CompareInput): Promise<ComparatorCallResult> {
      const prompt = await renderManagerPrompt("compare", version, {
        question: input.question,
        agendaTitle: input.agendaTitle,
        sections: formatComparableSections(input.sections),
      });
      const body = buildRequestBody({
        model,
        prompt,
        schemaName: "agenda_comparison",
        schema: compareSchema(input.participants),
        // §15.3 — 단계 6에만. 전형값은 거의 그대로이고 최악 케이스가 잘린다(§14.5).
        reasoningEffort: env.MANAGER_JUDGE_REASONING_EFFORT,
      });
      return withOneRetry(async () => {
        // §2.4 — 판정은 120초. §2.4.2 — **타임아웃은 재시도하지 않는다.**
        // 같은 입력·같은 모델로 다시 불러도 비슷하게 오래 걸리므로 기대값이 낮고,
        // 대신 §2.5의 fallback stance로 가면 사용자가 3열 원문으로 판단해 손실이 없다.
        const { content, outputTokens } = await callOpenRouter(body, {
          timeoutMs: env.MANAGER_JUDGE_TIMEOUT_MS,
          retryOnTimeout: false,
        });
        return {
          output: parseOutput(content, CompareOutputSchema, "단계 6"),
          outputTokens,
        };
      });
    },
  };
}
