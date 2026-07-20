import { Type } from '@google/genai';
import { generateStructuredJson } from './geminiClient';
import { supabase } from './supabaseClient';

// README/AI_Pipeline_Design.md의 1단계(분류) 설계를 그대로 옮긴 구현체.
// AI는 분류만 수행하며 해석·판단은 하지 않는다.

const STAGE1_SYSTEM_INSTRUCTION = `당신은 PM의 가설 검증 인터뷰 분석을 돕는 분류 보조자입니다.

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

const STAGE1_RESPONSE_SCHEMA = {
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

export interface HypothesisRef {
  hypothesis_id: string;
  cause: string;
  effect: string;
}

interface Stage1Item {
  hypothesis_id: string;
  quote: string;
  speaker: string;
  badge_label: string;
}

export interface EvidenceTagRecord {
  id: string;
  hypothesis_id: string;
  interview_id: string;
  quote: string;
  speaker: string | null;
  badge_label: string | null;
}

// 전사문 + 가설 배열을 받아 각 발언을 가설에 분류하고, evidence_tags에 INSERT한 뒤 저장된 행을 반환한다.
export async function tagHypothesesFromTranscript(params: {
  interviewId: string;
  transcript: string;
  hypotheses: HypothesisRef[];
}): Promise<EvidenceTagRecord[]> {
  const { interviewId, transcript, hypotheses } = params;

  if (!transcript.trim() || hypotheses.length === 0) {
    return [];
  }

  const prompt = `## 가설 목록\n${JSON.stringify(hypotheses, null, 2)}\n\n## 전사문\n${transcript}`;

  const rawItems = await generateStructuredJson<Stage1Item[]>({
    systemInstruction: STAGE1_SYSTEM_INSTRUCTION,
    prompt,
    responseSchema: STAGE1_RESPONSE_SCHEMA as never,
    temperature: 0.1,
  });

  // 환각 방어(1차): AI가 지어낸 hypothesis_id나 전사문에 없는 quote는 저장 전에 폐기한다.
  // 참조 번호([n] ↔ citations) 등 2단계 이후의 정밀 검증은 Task 16의 책임 범위로 남긴다.
  const validHypothesisIds = new Set(hypotheses.map((h) => h.hypothesis_id));
  const verifiedItems = rawItems.filter(
    (item) => validHypothesisIds.has(item.hypothesis_id) && transcript.includes(item.quote),
  );

  if (verifiedItems.length === 0) {
    return [];
  }

  const rowsToInsert = verifiedItems.map((item) => ({
    hypothesis_id: item.hypothesis_id,
    interview_id: interviewId,
    quote: item.quote,
    speaker: item.speaker || null,
    badge_label: item.badge_label,
  }));

  const { data, error } = await supabase.from('evidence_tags').insert(rowsToInsert).select();

  if (error) {
    throw new Error(`evidence_tags 저장에 실패했습니다: ${error.message}`);
  }

  return (data ?? []) as EvidenceTagRecord[];
}
