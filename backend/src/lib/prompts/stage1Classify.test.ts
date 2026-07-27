import { describe, it, expect } from 'vitest';
import { buildUserPrompt } from './stage1Classify';

describe('stage1Classify.buildUserPrompt', () => {
  const hypotheses = [
    { hypothesis_id: 'h1', cause: '원인1', effect: '결과1' },
    { hypothesis_id: 'h2', cause: '원인2', effect: '결과2' },
  ];
  const transcript = '진행자: 질문입니다.\n사용자: 답변입니다.';

  it('가설 목록을 JSON.stringify(hypotheses, null, 2) 형태로 포함해야 한다', () => {
    const prompt = buildUserPrompt({ hypotheses, transcript });
    expect(prompt).toContain(JSON.stringify(hypotheses, null, 2));
  });

  it('전사문을 한 글자도 변형하지 않고 그대로 포함해야 한다(원문 대조 검증의 전제)', () => {
    const trickyTranscript = '진행자: "인용부호"와 [대괄호], 줄바꿈\n두 번째 줄도 그대로 유지되어야 함.';
    const prompt = buildUserPrompt({ hypotheses, transcript: trickyTranscript });
    expect(prompt).toContain(trickyTranscript);
  });

  it('가설 목록 섹션과 전사문 섹션 헤더를 포함해야 한다', () => {
    const prompt = buildUserPrompt({ hypotheses, transcript });
    expect(prompt).toContain('## 가설 목록');
    expect(prompt).toContain('## 전사문');
  });

  it('기존 hypothesisTagger.ts의 프롬프트 포맷과 정확히 동일한 문자열을 생성해야 한다(리팩터 전후 회귀 방지)', () => {
    const prompt = buildUserPrompt({ hypotheses, transcript });
    const expected = `## 가설 목록\n${JSON.stringify(hypotheses, null, 2)}\n\n## 전사문\n${transcript}`;
    expect(prompt).toBe(expected);
  });
});
