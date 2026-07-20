import { supabase } from './supabaseClient';
import { tagHypothesesFromTranscript, EvidenceTagRecord, HypothesisRef } from './hypothesisTagger';
import { generateVerificationResult, VerificationResultRecord } from './verificationResult';

interface HypothesisRow {
  id: string;
  cause: string;
  effect: string;
}

interface InterviewRow {
  id: string;
  transcript?: string | null;
}

export interface AnalysisPipelineResult {
  evidenceTags: EvidenceTagRecord[];
  verificationResults: VerificationResultRecord[];
}

// 1단계(가설별 발언 분류) → 2단계(검증결과 생성) → hypotheses.verification_status 갱신까지
// 한 프로젝트 분량을 순서대로 실행한다. 라우터는 이 함수를 호출하기만 하고 프롬프트/스키마를
// 직접 다루지 않는다(Task 2 설계 원칙: 프롬프트는 lib/ 모듈에만 존재).
export async function runAnalysisPipeline(params: {
  hypotheses: HypothesisRow[];
  interviews: InterviewRow[];
}): Promise<AnalysisPipelineResult> {
  const { hypotheses, interviews } = params;

  const hypothesisRefs: HypothesisRef[] = hypotheses.map((h) => ({
    hypothesis_id: h.id,
    cause: h.cause,
    effect: h.effect,
  }));

  // 1단계: 인터뷰별로 전사문을 가설에 분류. evidence_tags에는 인터뷰별로 즉시 INSERT됨.
  const evidenceTags: EvidenceTagRecord[] = [];
  for (const interview of interviews) {
    if (!interview.transcript?.trim()) continue;

    const tagged = await tagHypothesesFromTranscript({
      interviewId: interview.id,
      transcript: interview.transcript,
      hypotheses: hypothesisRefs,
    });
    evidenceTags.push(...tagged);
  }

  // 2단계: 가설별로 자신에게 속한 근거만 모아 검증결과 생성 + verification_status 갱신.
  const verificationResults: VerificationResultRecord[] = [];
  for (const hypothesis of hypotheses) {
    const evidenceForHypothesis = evidenceTags
      .filter((tag) => tag.hypothesis_id === hypothesis.id)
      .map((tag) => ({
        evidence_tag_id: tag.id,
        quote: tag.quote,
        speaker: tag.speaker,
        badge_label: tag.badge_label,
      }));

    const result = await generateVerificationResult({
      hypothesisId: hypothesis.id,
      cause: hypothesis.cause,
      effect: hypothesis.effect,
      evidence: evidenceForHypothesis,
    });
    verificationResults.push(result);

    const { error: updateError } = await supabase
      .from('hypotheses')
      .update({ verification_status: result.suggested_status })
      .eq('id', hypothesis.id);

    if (updateError) {
      throw new Error(`hypotheses.verification_status 갱신에 실패했습니다: ${updateError.message}`);
    }
  }

  return { evidenceTags, verificationResults };
}
