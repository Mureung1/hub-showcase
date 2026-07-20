import 'dotenv/config';
import { supabase } from './src/lib/supabaseClient';
import { tagHypothesesFromTranscript } from './src/lib/hypothesisTagger';
import { generateVerificationResult } from './src/lib/verificationResult';

// Task 4 완료 조건 검증: 실제 프로젝트/가설/인터뷰 + Task 3 태깅 결과를 입력으로 2단계를 실행해
// verification_results에 저장되고, summary의 [n] 마커와 citations가 일대일 대응하는지 확인한다.

const SAMPLE_TRANSCRIPT = `지연: 처음 페이지 들어왔을 때 이게 무슨 서비스인지 한번에 이해가 안 됐어요. 설명이 너무 추상적이었어요.
민수: 저도 랜딩페이지 문구를 보고 뭘 하는 서비스인지 헷갈렸어요.
지연: 그래도 가입 버튼은 눈에 잘 띄어서 클릭하는 데는 문제 없었어요.`;

async function main() {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ title: '[TEST] Task4 검증결과 생성 검증', problem_definition: '전환율이 낮은 이유를 분석하고 싶다.' })
    .select()
    .single();
  if (projectError || !project) throw new Error(`프로젝트 생성 실패: ${projectError?.message}`);

  try {
    const { data: hypotheses, error: hypothesesError } = await supabase
      .from('hypotheses')
      .insert([
        { project_id: project.id, display_index: 0, cause: '랜딩페이지 메시지가 명확하지 않다.', effect: '사용자가 서비스 가치를 이해하지 못한다.' },
      ])
      .select();
    if (hypothesesError || !hypotheses) throw new Error(`가설 생성 실패: ${hypothesesError?.message}`);
    const hypothesis = hypotheses[0];

    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert({ project_id: project.id, interviewee_name: '테스트 참가자', transcript: SAMPLE_TRANSCRIPT })
      .select()
      .single();
    if (interviewError || !interview) throw new Error(`인터뷰 생성 실패: ${interviewError?.message}`);

    const evidenceTags = await tagHypothesesFromTranscript({
      interviewId: interview.id,
      transcript: SAMPLE_TRANSCRIPT,
      hypotheses: [{ hypothesis_id: hypothesis.id, cause: hypothesis.cause, effect: hypothesis.effect }],
    });
    console.log(`--- Task 3 결과: evidence_tags ${evidenceTags.length}건 ---`);

    if (evidenceTags.length === 0) {
      console.log('❌ 근거가 하나도 태깅되지 않아 Task 4를 검증할 수 없습니다.');
      return;
    }

    const result = await generateVerificationResult({
      hypothesisId: hypothesis.id,
      cause: hypothesis.cause,
      effect: hypothesis.effect,
      evidence: evidenceTags.map((t) => ({
        evidence_tag_id: t.id,
        quote: t.quote,
        speaker: t.speaker,
        badge_label: t.badge_label,
      })),
    });

    console.log('--- generateVerificationResult 반환값 ---');
    console.log(JSON.stringify(result, null, 2));

    const { data: storedRow, error: fetchError } = await supabase
      .from('verification_results')
      .select('*')
      .eq('hypothesis_id', hypothesis.id)
      .single();
    if (fetchError || !storedRow) throw new Error(`verification_results 조회 실패: ${fetchError?.message}`);

    const markersInSummary = new Set(
      Array.from((storedRow.summary as string).matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1])),
    );
    const markersInCitations = new Set((storedRow.citations as { marker: number }[]).map((c) => c.marker));

    const markersMatch =
      markersInSummary.size === markersInCitations.size &&
      [...markersInSummary].every((m) => markersInCitations.has(m));

    const validEvidenceIds = new Set(evidenceTags.map((t) => t.id));
    const citationsRefValid = (storedRow.citations as { evidence_tag_id: string }[]).every((c) =>
      validEvidenceIds.has(c.evidence_tag_id),
    );

    console.log(`\nDB 저장 확인: hypothesis_id=${storedRow.hypothesis_id}, suggested_status=${storedRow.suggested_status}`);
    console.log(`summary 마커: [${[...markersInSummary].join(', ')}] / citations 마커: [${[...markersInCitations].join(', ')}]`);
    console.log(
      markersMatch && citationsRefValid
        ? '✅ [n] 마커와 citations가 일대일 대응하고, citations가 실제 evidence_tag_id만 참조합니다.'
        : '❌ 마커/citations 대응 또는 evidence_tag_id 검증에 실패했습니다.',
    );
  } finally {
    await supabase.from('projects').delete().eq('id', project.id);
    console.log('🧹 테스트 데이터 정리 완료');
  }
}

main().catch((err) => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});
