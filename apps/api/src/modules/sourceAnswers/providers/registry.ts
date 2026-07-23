import type { AiProvider } from "@decision-log/shared";

import { loadEnv } from "../../../shared/config/env.js";
import type { ProviderClient } from "../ports.js";
import { claudeProvider } from "./claude.js";
import { openaiProvider } from "./openai.js";
import { geminiProvider } from "./gemini.js";

/**
 * ProviderClient 레지스트리 (ADR-005, SPEC-AI-001 2.3).
 * 어댑터 교체는 이 Map만 바꾸면 되고, 사용 모델은 설정(env)으로 골라 저장 레코드에 스탬프한다.
 */
export const providerClients: ReadonlyMap<AiProvider, ProviderClient> = new Map([
  ["claude", claudeProvider],
  ["openai", openaiProvider],
  ["gemini", geminiProvider],
] as const);

/** MVP 대상 Provider 3사 (docs/product.md). */
export const ALL_PROVIDERS: readonly AiProvider[] = [
  "claude",
  "openai",
  "gemini",
];

/** Provider별 활성 모델. 저장 시 source_answers.model에 스탬프된다. */
export function modelFor(provider: AiProvider): string {
  const env = loadEnv();
  switch (provider) {
    case "claude":
      return env.CLAUDE_MODEL;
    case "openai":
      return env.OPENAI_MODEL;
    case "gemini":
      return env.GEMINI_MODEL;
  }
}
