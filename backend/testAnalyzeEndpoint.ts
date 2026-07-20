import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { supabase } from './src/lib/supabaseClient';

// Task 5 완료 조건 검증: "분석 시작"(POST /api/projects → POST /:id/analyze) 호출 한 번으로
// MD 파일 생성 + evidence_tags 적재 + verification_results 적재 + verification_status 갱신이
// 모두 이루어지는지 실제 HTTP 서버(localhost:3000)를 통해 end-to-end로 확인한다.

const API_BASE = 'http://localhost:3000';

async function main() {
  // 이전 curl 테스트로 인코딩이 깨진 채 남은 테스트 프로젝트 정리
  await supabase.from('projects').delete().ilike('title', '[E2E TEST]%');

  const createRes = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '[E2E TEST] Task5 파이프라인 검증',
      problem_definition: '전환율이 낮은 이유를 분석하고 싶다.',
      hypotheses: [
        { cause: '랜딩페이지 메시지가 명확하지 않다.', effect: '사용자가 서비스 가치를 이해하지 못한다.' },
        { cause: 'CTA 버튼이 눈에 잘 띄지 않는다.', effect: '가입 클릭률이 낮아진다.' },
      ],
      interviews: [
        {
          interviewee_name: '지연',
          transcript:
            '지연: 처음 페이지 들어왔을 때 이게 무슨 서비스인지 한번에 이해가 안 됐어요. 설명이 너무 추상적이었어요.\n' +
            '민수: 저는 오히려 버튼 색깔이 배경이랑 비슷해서 어디를 눌러야 할지 못 찾았어요.\n' +
            '지연: 맞아요, 저도 가입 버튼을 찾는 데 좀 헤맸어요.',
        },
      ],
    }),
  });

  if (!createRes.ok) throw new Error(`프로젝트 생성 실패: ${await createRes.text()}`);
  const created = await createRes.json();
  const projectId = created.project_id as string;
  console.log(`--- 프로젝트 생성됨: ${projectId} ---`);

  try {
    const analyzeRes = await fetch(`${API_BASE}/api/projects/${projectId}/analyze`, { method: 'POST' });
    if (!analyzeRes.ok) throw new Error(`분석 요청 실패: ${await analyzeRes.text()}`);
    const analyzeBody = await analyzeRes.json();

    console.log('--- POST /:id/analyze 응답 ---');
    console.log(JSON.stringify(analyzeBody, null, 2));

    // 1. MD 파일 생성 확인
    const mdPath = path.join(__dirname, '..', 'analysis_requests', `project_${projectId}.md`);
    const mdExists = fs.existsSync(mdPath);
    console.log(`\n${mdExists ? '✅' : '❌'} MD 파일 생성: ${mdPath}`);

    // 2. evidence_tags 적재 확인
    const { data: evidenceTags } = await supabase.from('evidence_tags').select('*').eq(
      'hypothesis_id',
      created.hypotheses[0].id,
    );
    const { data: allEvidenceTags } = await supabase
      .from('evidence_tags')
      .select('*')
      .in('hypothesis_id', created.hypotheses.map((h: { id: string }) => h.id));
    console.log(`${(allEvidenceTags?.length ?? 0) > 0 ? '✅' : '❌'} evidence_tags 적재: ${allEvidenceTags?.length ?? 0}건`);

    // 3. verification_results 적재 확인 (가설 2개 모두)
    const { data: verificationResults } = await supabase
      .from('verification_results')
      .select('*')
      .in('hypothesis_id', created.hypotheses.map((h: { id: string }) => h.id));
    const allHypothesesHaveResult = verificationResults?.length === created.hypotheses.length;
    console.log(
      `${allHypothesesHaveResult ? '✅' : '❌'} verification_results 적재: ${verificationResults?.length ?? 0}/${created.hypotheses.length}건`,
    );

    // 4. hypotheses.verification_status 갱신 확인 (더 이상 '검토 전'이 아니어야 함)
    const { data: updatedHypotheses } = await supabase
      .from('hypotheses')
      .select('*')
      .in('id', created.hypotheses.map((h: { id: string }) => h.id));
    const allStatusUpdated = updatedHypotheses?.every((h) => h.verification_status !== '검토 전');
    console.log(`${allStatusUpdated ? '✅' : '❌'} verification_status 갱신:`);
    for (const h of updatedHypotheses ?? []) {
      console.log(`   - ${h.cause} → ${h.verification_status}`);
    }

    void evidenceTags; // 개별 확인용 변수(미사용 경고 방지)

    const allPass = mdExists && (allEvidenceTags?.length ?? 0) > 0 && allHypothesesHaveResult && allStatusUpdated;
    console.log(`\n${allPass ? '✅ Task 5 완료 조건 전체 통과' : '❌ 일부 조건 실패'}`);

    // 정리: MD 파일 삭제 (DB는 project cascade delete로 정리)
    if (mdExists) fs.unlinkSync(mdPath);
  } finally {
    await supabase.from('projects').delete().eq('id', projectId);
    console.log('🧹 테스트 데이터 정리 완료');
  }
}

main().catch((err) => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});
