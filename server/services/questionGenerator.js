import { getActiveProvider } from './llmProviders/index.js';
import { buildFixedQuestion } from './stubData.js';

/**
 * 04_AI_AGENT_SPEC.md 6장 / 10_PROMPT_SPEC.md 6장 "Question Generator Agent".
 *
 * "입력 하나 → 질문 하나" 계약을 유지한다. 코드 chunk 외에 README 기반 오프닝
 * 질문 등 다른 질문 소스가 추가되어도(향후), 이 오케스트레이터 패턴(provider
 * 호출 + 실패 시 폴백)은 그대로 재사용하고 프롬프트/스키마만 소스별로 갈아끼우면
 * 된다. LLM이 미설정이거나 호출이 실패해도 인터뷰가 막히지 않도록, stubData.js의
 * 고정 질문으로 폴백한다.
 */
export async function generateCodeQuestion({ file_path, score_reason, chunk }) {
  const provider = getActiveProvider();
  const result = provider && (await provider.generateCodeQuestion({ file_path, score_reason, chunk }));

  if (!result?.question) {
    return buildFixedQuestion(chunk);
  }

  return { question: result.question, cited_code: chunk.code_snippet };
}
