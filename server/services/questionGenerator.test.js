// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateCodeQuestion } from './questionGenerator.js';
import { buildFixedQuestion } from './stubData.js';

vi.mock('./llmProviders/index.js', () => ({
  getActiveProvider: vi.fn(),
}));

import { getActiveProvider } from './llmProviders/index.js';

afterEach(() => {
  vi.clearAllMocks();
});

const file_path = 'src/service/PaymentService.js';
const score_reason = "파일 크기 점수 1.0(120줄) + 'service' 이름 패턴 보너스 0.3";
const chunk = {
  code_snippet: 'async function approvePayment(orderId) { try { await charge(orderId); } catch (e) { throw e; } }',
  pattern: 'try-catch',
};

describe('generateCodeQuestion', () => {
  it('활성 provider가 없으면 stubData 고정 질문으로 폴백한다', async () => {
    getActiveProvider.mockReturnValue(null);

    const result = await generateCodeQuestion({ file_path, score_reason, chunk });

    expect(result).toEqual(buildFixedQuestion(chunk));
  });

  it('provider 호출이 null을 반환하면(실패) 고정 질문으로 폴백한다', async () => {
    getActiveProvider.mockReturnValue({ generateCodeQuestion: vi.fn().mockResolvedValue(null) });

    const result = await generateCodeQuestion({ file_path, score_reason, chunk });

    expect(result).toEqual(buildFixedQuestion(chunk));
  });

  it('provider가 질문을 생성하면 해당 질문 + chunk의 code_snippet을 cited_code로 반환한다', async () => {
    getActiveProvider.mockReturnValue({
      generateCodeQuestion: vi.fn().mockResolvedValue({ question: 'LLM이 생성한 질문' }),
    });

    const result = await generateCodeQuestion({ file_path, score_reason, chunk });

    expect(result).toEqual({ question: 'LLM이 생성한 질문', cited_code: chunk.code_snippet });
  });

  it.each(['try-catch', 'async-await', 'state-management', 'performance', 'none'])(
    'pattern이 %s이면 폴백 결과가 buildFixedQuestion과 동일하다',
    async (pattern) => {
      getActiveProvider.mockReturnValue(null);
      const patternChunk = { code_snippet: 'const x = 1;', pattern };

      const result = await generateCodeQuestion({ file_path, score_reason, chunk: patternChunk });

      expect(result).toEqual(buildFixedQuestion(patternChunk));
    }
  );
});
