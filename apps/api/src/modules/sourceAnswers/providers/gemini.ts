import { GoogleGenAI } from "@google/genai";
import { ERROR_CODES } from "@decision-log/shared";

import { ProviderCallError, type ProviderClient } from "../ports.js";
import { classifyProviderError } from "./errors.js";
import { withTimeout } from "./withTimeout.js";

/**
 * Gemini Provider 어댑터 (SPEC-AI-001 2.3).
 * JSON 강제는 responseMimeType으로 흡수한다.
 */
export const geminiProvider: ProviderClient = {
  provider: "gemini",
  async generate({ model, prompt, apiKey }) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await withTimeout((signal) =>
        client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            abortSignal: signal,
          },
        }),
      );

      const rawContent = response.text ?? "";
      if (rawContent.trim().length === 0) {
        throw new ProviderCallError(
          ERROR_CODES.SCHEMA_VALIDATION_FAILED,
          true,
          "Gemini가 빈 응답을 반환했습니다.",
        );
      }

      const usage = response.usageMetadata;
      return {
        rawContent,
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
      };
    } catch (error) {
      throw classifyProviderError(error);
    }
  },
};
