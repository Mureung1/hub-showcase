import { describe, it, expect } from 'vitest';
import { buildUserPrompt } from './stage3Refine';

describe('stage3Refine.buildUserPrompt', () => {
  const baseInput = {
    cause: '원인',
    effect: '결과',
    currentSummary: '기존 요약[1].',
    evidence: [
      { evidence_tag_id: 'e1', quote: '인용문', speaker: '화자', badge_label: '지지 근거' },
    ],
    highlightedText: '하이라이트된 부분',
    userMessage: '이 부분은 아닌 것 같아요',
  };

  it('가설을 cause/effect로 JSON 직렬화해 포함해야 한다', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain(JSON.stringify({ cause: baseInput.cause, effect: baseInput.effect }));
  });

  it('현재 요약·근거 목록·하이라이트·사용자 의견을 그대로 포함해야 한다', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain(baseInput.currentSummary);
    expect(prompt).toContain(JSON.stringify(baseInput.evidence, null, 2));
    expect(prompt).toContain(baseInput.highlightedText);
    expect(prompt).toContain(baseInput.userMessage);
  });

  it('하이라이트한 부분이 없으면 "(선택 안 함)"으로 표시해야 한다', () => {
    const prompt = buildUserPrompt({ ...baseInput, highlightedText: '' });
    expect(prompt).toContain('(선택 안 함)');
  });

  it('기존 refineHypothesis.ts의 프롬프트 포맷과 정확히 동일한 문자열을 생성해야 한다(리팩터 전후 회귀 방지)', () => {
    const prompt = buildUserPrompt(baseInput);
    const expected = `## 가설\n${JSON.stringify({ cause: baseInput.cause, effect: baseInput.effect })}\n\n## 현재 검증결과 문단\n${baseInput.currentSummary}\n\n## 근거 목록\n${JSON.stringify(baseInput.evidence, null, 2)}\n\n## 사용자가 하이라이트한 부분\n${baseInput.highlightedText || '(선택 안 함)'}\n\n## 사용자 의견\n${baseInput.userMessage}`;
    expect(prompt).toBe(expected);
  });
});
