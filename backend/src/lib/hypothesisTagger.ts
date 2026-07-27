import { generateStructuredJson } from './geminiClient';
import { supabase } from './supabaseClient';
import { filterVerifiedEvidenceItems } from './responseValidation';
import * as stage1Classify from './prompts/stage1Classify';

// README/AI_Pipeline_Design.md의 1단계(분류) 설계를 그대로 옮긴 구현체.
// AI는 분류만 수행하며 해석·판단은 하지 않는다.
// 프롬프트 문자열/스키마는 이 파일이 모른다 — prompts/stage1Classify.ts(Task 24)가 원본이다.

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
// persist:false면 DB에 쓰지 않고 합성 id로 레코드를 반환한다(Task 22 eval의 DB 오염 방지, Task 24에서 도입).
export async function tagHypothesesFromTranscript(params: {
  interviewId: string;
  transcript: string;
  hypotheses: HypothesisRef[];
  persist?: boolean;
}): Promise<EvidenceTagRecord[]> {
  const { interviewId, transcript, hypotheses, persist = true } = params;

  if (!transcript.trim() || hypotheses.length === 0) {
    return [];
  }

  const prompt = stage1Classify.buildUserPrompt({ hypotheses, transcript });

  const rawItems = await generateStructuredJson<Stage1Item[]>({
    systemInstruction: stage1Classify.systemInstruction,
    prompt,
    responseSchema: stage1Classify.responseSchema as never,
    temperature: stage1Classify.temperature,
  });

  // 환각 방어(Task 16): AI가 지어낸 hypothesis_id나 전사문에 없는 quote는 저장 전에 폐기한다.
  const verifiedItems = filterVerifiedEvidenceItems(rawItems, hypotheses, transcript);

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

  if (!persist) {
    return rowsToInsert.map((row, index) => ({
      id: `eval-evidence-${interviewId}-${index}`,
      ...row,
    }));
  }

  const { data, error } = await supabase.from('evidence_tags').insert(rowsToInsert).select();

  if (error) {
    throw new Error(`evidence_tags 저장에 실패했습니다: ${error.message}`);
  }

  return (data ?? []) as EvidenceTagRecord[];
}
