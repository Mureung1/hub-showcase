import { Type } from '@google/genai';
import { generateStructuredJson } from './geminiClient';
import { supabase } from './supabaseClient';

// README/AI_Pipeline_Design.md의 2단계(검증결과 생성) 설계를 그대로 옮긴 구현체.
// 이 결과는 AI의 초안 제안일 뿐이며 최종 판단(유지/수정/폐기)은 항상 사용자가 한다.

const STAGE2_SYSTEM_INSTRUCTION = `당신은 PM의 가설 검증 인터뷰 분석을 돕는 초안 작성 보조자입니다.

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

const STAGE2_RESPONSE_SCHEMA = {
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
export async function generateVerificationResult(params: {
  hypothesisId: string;
  cause: string;
  effect: string;
  evidence: EvidenceRef[];
}): Promise<VerificationResultRecord> {
  const { hypothesisId, cause, effect, evidence } = params;

  // 근거가 없으면 API를 호출하지 않고 고정 폴백값을 사용한다(근거 없이 초안을 지어내는 환각 원천 차단).
  const output: Stage2Output =
    evidence.length === 0
      ? NO_EVIDENCE_FALLBACK
      : await callStage2({ hypothesisId, cause, effect, evidence });

  const verifiedOutput = verifyCitations(output, evidence);

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

  const prompt = `## 가설\n${JSON.stringify({ hypothesis_id: hypothesisId, cause, effect })}\n\n## 근거 목록\n${JSON.stringify(evidence, null, 2)}`;

  return generateStructuredJson<Stage2Output>({
    systemInstruction: STAGE2_SYSTEM_INSTRUCTION,
    prompt,
    responseSchema: STAGE2_RESPONSE_SCHEMA as never,
    temperature: 0.2,
  });
}

// 환각 방어: summary의 [n] 마커 집합과 citations.marker가 정확히 일대일 대응하지 않거나,
// citations가 입력에 없는 evidence_tag_id를 참조하면 해당 citation을 제거하고
// summary에서 대응 마커를 링크 취급하지 않도록 정리한다.
function verifyCitations(output: Stage2Output, evidence: EvidenceRef[]): Stage2Output {
  const validEvidenceIds = new Set(evidence.map((e) => e.evidence_tag_id));
  const markersInSummary = new Set(
    Array.from(output.summary.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1])),
  );

  const verifiedCitations = output.citations.filter(
    (c) => validEvidenceIds.has(c.evidence_tag_id) && markersInSummary.has(c.marker),
  );

  return { ...output, citations: verifiedCitations };
}
