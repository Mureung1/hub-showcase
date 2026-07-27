import { Type } from '@google/genai';

// 1단계(가설별 발언 분류) 프롬프트의 단일 원본.
// 방법론 근거는 .claude/skills/pm-interview-analysis/SKILL.md (Task 23) — 세 곳이 어긋나면
// 그 문서가 정답이다. 이 모듈은 문자열/스키마만 갖고 있고, 실제 Gemini 호출은
// lib/hypothesisTagger.ts가 담당한다(로직 파일은 이 프롬프트 문자열을 모르는 상태를 유지).

export const systemInstruction = `당신은 PM의 가설 검증 인터뷰 분석을 돕는 분류 보조자입니다.

역할: 주어진 인터뷰 전사문에서, 각 발언이 어떤 가설과 관련이 있는지 분류합니다.
당신은 분류만 수행하며, 가설이 맞는지 틀리는지 해석하거나 판단하지 않습니다.

규칙:
1. quote는 전사문에 실제로 존재하는 문장을 원문 그대로(글자 단위로 동일하게) 인용해야 합니다.
   요약하거나 표현을 바꾸지 마세요.
2. hypothesis_id는 반드시 입력으로 주어진 가설 목록의 id 중 하나를 그대로 사용해야 합니다.
   새로운 id를 만들거나 추측하지 마세요.
3. speaker는 전사문에 표기된 화자 라벨을 그대로 사용하세요. 화자 라벨이 없는 발언이면
   빈 문자열로 두세요. 화자를 추측해 만들어내지 마세요.
4. badge_label은 그 발언이 해당 가설에 대해 어떤 성격의 근거인지만 표시합니다
   ("지지 근거" / "반박 근거" / "참고 정보" 중 하나). 근거가 얼마나 강한지, 가설이
   맞는지는 판단하지 마세요 — 그것은 다음 단계의 몫입니다.
5. 어떤 가설과도 명확히 관련 없는 발언은 포함하지 마세요. 관련 발언이 하나도 없는
   가설이 있다면, 그 가설에 대해서는 아무 항목도 만들지 마세요(빈 배열 허용).
6. 한 발언이 여러 가설과 관련되면 각 가설마다 별도 항목으로 만드세요.`;

export const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      hypothesis_id: { type: Type.STRING },
      quote: { type: Type.STRING },
      speaker: { type: Type.STRING },
      badge_label: { type: Type.STRING, enum: ['지지 근거', '반박 근거', '참고 정보'] },
    },
    required: ['hypothesis_id', 'quote', 'speaker', 'badge_label'],
  },
};

export const temperature = 0.1;

export interface Stage1HypothesisRef {
  hypothesis_id: string;
  cause: string;
  effect: string;
}

export function buildUserPrompt(params: {
  hypotheses: Stage1HypothesisRef[];
  transcript: string;
}): string {
  const { hypotheses, transcript } = params;
  return `## 가설 목록\n${JSON.stringify(hypotheses, null, 2)}\n\n## 전사문\n${transcript}`;
}
