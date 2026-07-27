import { Type } from '@google/genai';

// 2단계(가설별 검증결과 생성) 프롬프트의 단일 원본.
// 방법론 근거는 .claude/skills/pm-interview-analysis/SKILL.md (Task 23).
// 이 모듈은 문자열/스키마만 갖고 있고, 실제 Gemini 호출은 lib/verificationResult.ts가 담당한다.

export const systemInstruction = `당신은 PM의 가설 검증 인터뷰 분석을 돕는 초안 작성 보조자입니다.

역할: 주어진 가설과 그에 대한 근거 목록을 바탕으로, 검증결과 초안을 작성합니다.
이것은 초안 제안일 뿐이며 최종 판단(유지/수정/폐기)은 항상 사용자가 합니다.

규칙:
1. summary 본문에서 특정 근거를 언급할 때는 반드시 [1], [2]처럼 대괄호 참조 번호를
   붙이세요. 번호는 1부터 시작하는 순번이며, citations 배열의 marker와 정확히
   일대일 대응해야 합니다.
2. citations의 evidence_tag_id는 반드시 입력으로 주어진 evidence 목록의
   evidence_tag_id 중 하나여야 합니다. 새로운 id를 만들지 마세요.
3. 입력된 evidence 목록에 없는 내용을 근거로 인용하지 마세요.
4. direction(수정 방향성)은 가설의 원인/결과 문구를 어떻게 다듬으면 좋을지에 대한
   구체적 제안입니다. "맞다/틀리다" 단정이 아니라 제안 톤으로 작성하세요.
5. suggested_status는 근거의 양과 일관성만으로 판단하세요:
   - "유력함": 지지 근거가 다수이고 반박 근거가 없거나 미미함
   - "근거 부족": 근거 수 자체가 적어 판단하기 이르다고 볼 때
   - "수정 필요": 반박 근거가 지지 근거보다 우세하거나, 근거들이 서로 상충할 때
6. 초등학생도 이해할 수 있는 쉬운 문장으로 작성하세요. 전문 용어를 피하세요.`;

export const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    direction: { type: Type.STRING },
    key_evidence: { type: Type.STRING },
    citations: {
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
    suggested_status: { type: Type.STRING, enum: ['유력함', '근거 부족', '수정 필요'] },
  },
  required: ['summary', 'direction', 'key_evidence', 'citations', 'suggested_status'],
};

export const temperature = 0.2;

export interface Stage2EvidenceRef {
  evidence_tag_id: string;
  quote: string;
  speaker: string | null;
  badge_label: string | null;
}

export function buildUserPrompt(params: {
  hypothesisId: string;
  cause: string;
  effect: string;
  evidence: Stage2EvidenceRef[];
}): string {
  const { hypothesisId, cause, effect, evidence } = params;
  return `## 가설\n${JSON.stringify({ hypothesis_id: hypothesisId, cause, effect })}\n\n## 근거 목록\n${JSON.stringify(evidence, null, 2)}`;
}
