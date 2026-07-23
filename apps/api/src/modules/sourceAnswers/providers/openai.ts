import OpenAI from "openai";
import { ERROR_CODES } from "@decision-log/shared";

import { ProviderCallError, type ProviderClient } from "../ports.js";
import { classifyProviderError } from "./errors.js";
import { withTimeout } from "./withTimeout.js";

/**
 * OpenAI Provider 어댑터 (SPEC-AI-001 2.3).
 * JSON 강제는 provider별 차이라 어댑터에서 흡수한다(response_format).
 */
export const openaiProvider: ProviderClient = {
  provider: "openai",
  async generate({ model, prompt, apiKey }) {
    try {
      const client = new OpenAI({ apiKey, maxRetries: 0 });
      const completion = await withTimeout((signal) =>
        client.chat.completions.create(
          {
            model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          },
          { signal },
        ),
      );

      const rawContent = completion.choices[0]?.message?.content ?? "";
      if (rawContent.trim().length === 0) {
        throw new ProviderCallError(
          ERROR_CODES.SCHEMA_VALIDATION_FAILED,
          true,
          "OpenAI가 빈 응답을 반환했습니다.",
        );
      }

      return {
        rawContent,
        inputTokens: completion.usage?.prompt_tokens ?? null,
        outputTokens: completion.usage?.completion_tokens ?? null,
      };
    } catch (error) {
      throw classifyProviderError(error);
    }
  },
};
