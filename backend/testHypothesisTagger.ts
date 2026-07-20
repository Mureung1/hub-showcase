import 'dotenv/config';
import { supabase } from './src/lib/supabaseClient';
import { tagHypothesesFromTranscript } from './src/lib/hypothesisTagger';

// Task 3 완료 조건 검증: 실제 Supabase에 프로젝트/가설/인터뷰를 만든 뒤 태거를 실행해
// evidence_tags에 실제로 적재되는지, quote가 원본 전사문에 존재하는지 end-to-end로 확인한다.

const SAMPLE_TRANSCRIPT = `지연: 처음 페이지 들어왔을 때 이게 무슨 서비스인지 한번에 이해가 안 됐어요. 설명이 너무 추상적이었어요.
민수: 저는 오히려 버튼 색깔이 배경이랑 비슷해서 어디를 눌러야 할지 못 찾았어요.
지연: 맞아요, 저도 가입 버튼을 찾는 데 좀 헤맸어요.
민수: 그거 말고는 로딩 속도는 빠른 편이라 좋았어요.`;

async function main() {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ title: '[TEST] Task3 태거 검증', problem_definition: '전환율이 낮은 이유를 분석하고 싶다.' })
    .select()
    .single();
  if (projectError || !project) throw new Error(`프로젝트 생성 실패: ${projectError?.message}`);

  try {
    const { data: hypotheses, error: hypothesesError } = await supabase
      .from('hypotheses')
      .insert([
        { project_id: project.id, display_index: 0, cause: '랜딩페이지 메시지가 명확하지 않다.', effect: '사용자가 서비스 가치를 이해하지 못한다.' },
        { project_id: project.id, display_index: 1, cause: 'CTA 버튼이 눈에 잘 띄지 않는다.', effect: '가입 클릭률이 낮아진다.' },
      ])
      .select();
    if (hypothesesError || !hypotheses) throw new Error(`가설 생성 실패: ${hypothesesError?.message}`);

    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert({ project_id: project.id, interviewee_name: '테스트 참가자', transcript: SAMPLE_TRANSCRIPT })
      .select()
      .single();
    if (interviewError || !interview) throw new Error(`인터뷰 생성 실패: ${interviewError?.message}`);

    const tagged = await tagHypothesesFromTranscript({
      interviewId: interview.id,
      transcript: SAMPLE_TRANSCRIPT,
      hypotheses: hypotheses.map((h) => ({ hypothesis_id: h.id, cause: h.cause, effect: h.effect })),
    });

    console.log('--- tagHypothesesFromTranscript 반환값 ---');
    console.log(JSON.stringify(tagged, null, 2));

    if (tagged.length === 0) {
      console.log('❌ evidence_tags가 하나도 반환되지 않았습니다.');
      return;
    }

    const { data: storedRows, error: fetchError } = await supabase
      .from('evidence_tags')
      .select('*')
      .eq('interview_id', interview.id);
    if (fetchError) throw new Error(`evidence_tags 조회 실패: ${fetchError.message}`);

    let allPass = true;
    const validHypothesisIds = new Set(hypotheses.map((h) => h.id));
    for (const row of storedRows ?? []) {
      const idOk = validHypothesisIds.has(row.hypothesis_id);
      const quoteOk = SAMPLE_TRANSCRIPT.includes(row.quote);
      if (!idOk) {
        allPass = false;
        console.log(`❌ DB에 저장된 hypothesis_id가 이 프로젝트의 가설이 아님: ${row.hypothesis_id}`);
      }
      if (!quoteOk) {
        allPass = false;
        console.log(`❌ DB에 저장된 quote가 원문에 없음: "${row.quote}"`);
      }
    }

    console.log(`\n${allPass ? '✅' : '❌'} evidence_tags ${storedRows?.length ?? 0}건이 실제 DB에 적재되었고, hypothesis_id/quote 검증 ${allPass ? '통과' : '실패'}.`);
  } finally {
    // 테스트 데이터 정리 (projects 삭제 시 hypotheses/interviews/evidence_tags까지 CASCADE로 함께 삭제됨)
    await supabase.from('projects').delete().eq('id', project.id);
    console.log('🧹 테스트 데이터 정리 완료');
  }
}

main().catch((err) => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});
