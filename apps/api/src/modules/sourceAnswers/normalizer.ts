import {
  ERROR_CODES,
  StructuredContentSchema,
  type StructuredContent,
} from "@decision-log/shared";

import { loadEnv } from "../../shared/config/env.js";
import { ProviderCallError, type AnswerNormalizer } from "./ports.js";

/**
 * v1 AnswerNormalizer (SPEC-AI-001 8.1).
 * 원문 텍스트 → StructuredContent(Zod 검증). 검증 실패는 SCHEMA_VALIDATION_FAILED이며
 * AI 비결정성을 고려해 재시도 대상이다(5장).
 *
 * 여기서 하는 "정규화"는 계약을 느슨하게 푸는 것이 아니라, 값 부재 규칙(data-model 1.6)과
 * 결정적으로 유도 가능한 값만 채우는 수준으로 제한한다.
 * - 코드펜스로 감싸 온 JSON을 벗겨낸다
 * - summary·kind 필드가 아예 없으면 null (부재 = 미상)
 * - order가 없으면 배열 위치로 채운다(표시 순서는 응답 순서에서 결정적으로 유도된다)
 * 그 외 형태 위반은 그대로 검증 실패로 드러낸다.
 */

/** ```json ... ``` 형태로 감싸 온 경우 본문만 꺼낸다. */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
}

function coerceShape(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) return parsed;
  const root = parsed as Record<string, unknown>;
  const sections = Array.isArray(root.sections) ? root.sections : undefined;

  return {
    ...root,
    summary: root.summary ?? null,
    ...(sections
      ? {
          sections: sections.map((section, index) => {
            if (typeof section !== "object" || section === null) return section;
            const item = section as Record<string, unknown>;
            return {
              ...item,
              order: item.order ?? index,
              kind: item.kind ?? null,
            };
          }),
        }
      : {}),
  };
}

export function createJsonNormalizer(): AnswerNormalizer {
  return {
    version: loadEnv().ANSWER_NORMALIZER_VERSION,
    normalize(rawContent: string): StructuredContent {
      let parsed: unknown;
      try {
        parsed = JSON.parse(stripCodeFence(rawContent));
      } catch {
        throw new ProviderCallError(
          ERROR_CODES.SCHEMA_VALIDATION_FAILED,
          true,
          "Provider 응답을 JSON으로 파싱하지 못했습니다.",
        );
      }

      const result = StructuredContentSchema.safeParse(coerceShape(parsed));
      if (!result.success) {
        // 검증 실패 요지는 디버깅 가시성을 위해 남기되 원문 전체는 담지 않는다(원문은 raw_content에).
        const detail = result.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("; ");
        throw new ProviderCallError(
          ERROR_CODES.SCHEMA_VALIDATION_FAILED,
          true,
          `Provider 응답이 StructuredContent 계약을 만족하지 않습니다. [${detail}]`,
        );
      }
      return result.data;
    },
  };
}
