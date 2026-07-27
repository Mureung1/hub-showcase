import { describe, it, expect } from 'vitest';
import { buildUserPrompt } from './stage2Verify';

describe('stage2Verify.buildUserPrompt', () => {
  const baseInput = {
    hypothesisId: 'h1',
    cause: '원인',
    effect: '결과',
    evidence: [
      { evidence_tag_id: 'e1', quote: '인용문', speaker: '화자', badge_label: '지지 근거' },
    ],
  };

  it('가설을 hypothesis_id/cause/effect로 JSON 직렬화해 포함해야 한다', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain(
      JSON.stringify({
        hypothesis_id: baseInput.hypothesisId,
        cause: baseInput.cause,
        effect: baseInput.effect,
      }),
    );
  });

  it('근거 목록을 JSON.stringify(evidence, null, 2) 형태로 포함해야 한다', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain(JSON.stringify(baseInput.evidence, null, 2));
  });

  it('근거 목록이 빈 배열이어도 프롬프트는 생성되어야 한다(호출 자체를 막는 판단은 generateVerificationResult의 책임)', () => {
    const prompt = buildUserPrompt({ ...baseInput, evidence: [] });
    expect(prompt).toContain(JSON.stringify([], null, 2));
  });

  it('기존 verificationResult.ts의 프롬프트 포맷과 정확히 동일한 문자열을 생성해야 한다(리팩터 전후 회귀 방지)', () => {
    const prompt = buildUserPrompt(baseInput);
    const expected = `## 가설\n${JSON.stringify({ hypothesis_id: baseInput.hypothesisId, cause: baseInput.cause, effect: baseInput.effect })}\n\n## 근거 목록\n${JSON.stringify(baseInput.evidence, null, 2)}`;
    expect(prompt).toBe(expected);
  });
});
