import { Type } from '@google/genai';

// 3단계(리파인) 프롬프트의 단일 원본.
// 방법론 근거는 .claude/skills/pm-interview-analysis/SKILL.md (Task 23).
// 이 모듈은 문자열/스키마만 갖고 있고, 실제 Gemini 호출은 lib/refineHypothesis.ts가 담당한다.

export const systemInstruction = `당신은 PM의 가설 검증 인터뷰 분석을 돕는 리파인 보조자입니다.

역할: 사용자가 기존 검증결과 문단의 특정 부분에 동의하지 않아 의견을 남겼습니다.
사용자의 의견을 반영해 검증결과 문단(summary)의 수정 가안을 작성합니다.
이것도 초안일 뿐이며, 사용자가 "적용"을 눌러야 실제로 반영됩니다.

규칙:
1. 반드시 입력으로 주어진 evidence 목록 안에서만 근거를 인용하세요. 사용자의 의견이
   근거 목록과 상충하더라도, 목록에 없는 사실을 새로 지어내지 마세요.
2. evidence 목록에 사용자 의견을 뒷받침할 근거가 없다면, 그 사실을 reply에서
   솔직하게 알리고 summary는 원래 뉘앙스를 유지하되 표현만 다듬으세요.
3. 수정된 summary도 [1], [2] 참조 번호 규칙을 그대로 지켜야 하며, citations는
   evidence 목록의 evidence_tag_id만 참조해야 합니다(2단계와 동일 제약).
4. reply는 사용자에게 보내는 짧은 대화체 응답입니다. 무엇을 어떻게 바꿨는지,
   또는 왜 바꾸지 않았는지 한두 문장으로 설명하세요.`;

export const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    new_summary: { type: Type.STRING },
    new_citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          marker: { type: Type.NUMBER },
          evidence_tag_id: { type: Type.STRING },
        },
        required: ['marker', 'evidence_tag_id'],
      },
    },
  },
  required: ['reply', 'new_summary', 'new_citations'],
};

export const temperature = 0.2;

export interface Stage3EvidenceRef {
  evidence_tag_id: string;
  quote: string;
  speaker: string | null;
  badge_label: string | null;
}

export function buildUserPrompt(params: {
  cause: string;
  effect: string;
  currentSummary: string;
  evidence: Stage3EvidenceRef[];
  highlightedText: string;
  userMessage: string;
}): string {
  const { cause, effect, currentSummary, evidence, highlightedText, userMessage } = params;
  return `## 가설\n${JSON.stringify({ cause, effect })}\n\n## 현재 검증결과 문단\n${currentSummary}\n\n## 근거 목록\n${JSON.stringify(evidence, null, 2)}\n\n## 사용자가 하이라이트한 부분\n${highlightedText || '(선택 안 함)'}\n\n## 사용자 의견\n${userMessage}`;
}
