import Anthropic from "@anthropic-ai/sdk";
import { ERROR_CODES } from "@decision-log/shared";

import { ProviderCallError, type ProviderClient } from "../ports.js";
import { classifyProviderError } from "./errors.js";
import { withTimeout } from "./withTimeout.js";

/**
 * Claude Provider 어댑터 (SPEC-AI-001 2.3).
 * 호출·타임아웃·에러 분류만 담당한다. 정규화는 AnswerNormalizer, 저장은 Repository.
 * apiKey는 호출 시점에만 쓰고 로그·에러에 남기지 않는다.
 */
export const claudeProvider: ProviderClient = {
  provider: "claude",
  async generate({ model, prompt, apiKey }) {
    try {
      const client = new Anthropic({ apiKey, maxRetries: 0 });
      const message = await withTimeout((signal) =>
        client.messages.create(
          {
            model,
            max_tokens: 8000,
            messages: [{ role: "user", content: prompt }],
          },
          { signal },
        ),
      );

      const rawContent = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      if (rawContent.trim().length === 0) {
        throw new ProviderCallError(
          ERROR_CODES.SCHEMA_VALIDATION_FAILED,
          true,
          "Claude가 빈 응답을 반환했습니다.",
        );
      }

      return {
        rawContent,
        inputTokens: message.usage.input_tokens ?? null,
        outputTokens: message.usage.output_tokens ?? null,
      };
    } catch (error) {
      throw classifyProviderError(error);
    }
  },
};
