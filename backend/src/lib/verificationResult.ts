import { generateStructuredJson } from './geminiClient';
import { supabase } from './supabaseClient';
import { filterVerifiedCitations } from './responseValidation';
import * as stage2Verify from './prompts/stage2Verify';

// README/AI_Pipeline_Design.md의 2단계(검증결과 생성) 설계를 그대로 옮긴 구현체.
// 이 결과는 AI의 초안 제안일 뿐이며 최종 판단(유지/수정/폐기)은 항상 사용자가 한다.
// 프롬프트 문자열/스키마는 이 파일이 모른다 — prompts/stage2Verify.ts(Task 24)가 원본이다.

export interface EvidenceRef {
  evidence_tag_id: string;
  quote: string;
  speaker: string | null;
  badge_label: string | null;
}

interface Stage2Output {
  summary: string;
  direction: string;
  key_evidence: string;
  citations: { marker: number; evidence_tag_id: string }[];
  suggested_status: string;
}

export interface VerificationResultRecord {
  id: string;
  hypothesis_id: string;
  summary: string;
  direction: string;
  key_evidence: string;
  citations: { marker: number; evidence_tag_id: string }[];
  suggested_status: string;
}

const NO_EVIDENCE_FALLBACK: Stage2Output = {
  summary: '관련 근거가 수집되지 않았습니다.',
  direction: '',
  key_evidence: '',
  citations: [],
  suggested_status: '근거 부족',
};

// 가설 1건 + 그 가설의 evidence_tags를 받아 검증결과 초안을 생성하고 verification_results에 upsert한다.
// persist:false면 DB에 쓰지 않고 합성 id로 레코드를 반환한다(Task 22 eval의 DB 오염 방지, Task 24에서 도입).
export async function generateVerificationResult(params: {
  hypothesisId: string;
  cause: string;
  effect: string;
  evidence: EvidenceRef[];
  persist?: boolean;
}): Promise<VerificationResultRecord> {
  const { hypothesisId, cause, effect, evidence, persist = true } = params;

  // 근거가 없으면 API를 호출하지 않고 고정 폴백값을 사용한다(근거 없이 초안을 지어내는 환각 원천 차단).
  const output: Stage2Output =
    evidence.length === 0
      ? NO_EVIDENCE_FALLBACK
      : await callStage2({ hypothesisId, cause, effect, evidence });

  const verifiedOutput = verifyCitations(output, evidence);

  if (!persist) {
    return { id: `eval-verification-${hypothesisId}`, hypothesis_id: hypothesisId, ...verifiedOutput };
  }

  const { data, error } = await supabase
    .from('verification_results')
    .upsert(
      {
        hypothesis_id: hypothesisId,
        summary: verifiedOutput.summary,
        direction: verifiedOutput.direction,
        key_evidence: verifiedOutput.key_evidence,
        citations: verifiedOutput.citations,
        suggested_status: verifiedOutput.suggested_status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'hypothesis_id' },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`verification_results 저장에 실패했습니다: ${error?.message}`);
  }

  return data as VerificationResultRecord;
}

async function callStage2(params: {
  hypothesisId: string;
  cause: string;
  effect: string;
  evidence: EvidenceRef[];
}): Promise<Stage2Output> {
  const { hypothesisId, cause, effect, evidence } = params;

  const prompt = stage2Verify.buildUserPrompt({ hypothesisId, cause, effect, evidence });

  return generateStructuredJson<Stage2Output>({
    systemInstruction: stage2Verify.systemInstruction,
    prompt,
    responseSchema: stage2Verify.responseSchema as never,
    temperature: stage2Verify.temperature,
  });
}

// 환각 방어(Task 16): summary의 [n] 마커 집합과 citations.marker가 정확히 일대일 대응하지 않거나,
// citations가 입력에 없는 evidence_tag_id를 참조하면 해당 citation을 제거한다.
// 대응되지 않는 마커는 FE에서 링크가 아닌 일반 텍스트로 렌더된다(HypothesisDetailPage.tsx).
function verifyCitations(output: Stage2Output, evidence: EvidenceRef[]): Stage2Output {
  return { ...output, citations: filterVerifiedCitations(output.citations, output.summary, evidence) };
}
