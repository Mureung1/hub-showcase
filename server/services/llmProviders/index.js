import * as anthropicProvider from './anthropicProvider.js';
import * as geminiProvider from './geminiProvider.js';
import * as openaiProvider from './openaiProvider.js';

const PROVIDER_PRIORITY = [
  { envKey: 'ANTHROPIC_API_KEY', provider: anthropicProvider },
  { envKey: 'GEMINI_API_KEY', provider: geminiProvider },
  { envKey: 'OPENAI_API_KEY', provider: openaiProvider },
];

/**
 * .env에 설정된 키를 우선순위(Anthropic > Gemini > OpenAI)대로 확인해
 * 처음 발견되는 프로바이더를 반환한다. 설정된 키가 없으면 null.
 */
export function getActiveProvider() {
  for (const { envKey, provider } of PROVIDER_PRIORITY) {
    if (process.env[envKey]) return provider;
  }
  return null;
}
