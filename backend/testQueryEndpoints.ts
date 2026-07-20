import 'dotenv/config';
import { supabase } from './src/lib/supabaseClient';

// Task 6 완료 조건 검증: 프로젝트 생성 + 분석 후,
// GET /api/projects/:id (대시보드용)와 GET /api/projects/:id/hypotheses/:hid (상세용)가
// 화면 렌더에 필요한 데이터를 한 번의 요청으로 모두 반환하는지 확인한다.

const API_BASE = 'http://localhost:3000';

async function main() {
  await supabase.from('projects').delete().ilike('title', '[E2E TEST]%');

  const createRes = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '[E2E TEST] Task6 조회 API 검증',
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
            '민수: 저는 버튼 색깔이 배경이랑 비슷해서 어디를 눌러야 할지 못 찾았어요.\n' +
            '지연: 맞아요, 저도 가입 버튼을 찾는 데 좀 헤맸어요.',
        },
      ],
    }),
  });
  if (!createRes.ok) throw new Error(`프로젝트 생성 실패: ${await createRes.text()}`);
  const created = await createRes.json();
  const projectId = created.project_id as string;

  try {
    const analyzeRes = await fetch(`${API_BASE}/api/projects/${projectId}/analyze`, { method: 'POST' });
    if (!analyzeRes.ok) throw new Error(`분석 실패: ${await analyzeRes.text()}`);
    await analyzeRes.json();

    // 1) 대시보드 조회
    const dashRes = await fetch(`${API_BASE}/api/projects/${projectId}`);
    if (!dashRes.ok) throw new Error(`대시보드 조회 실패: ${await dashRes.text()}`);
    const dash = await dashRes.json();
    console.log('=== GET /api/projects/:id (대시보드) ===');
    console.log(JSON.stringify(dash, null, 2));

    const dashChecks = {
      '프로젝트 포함': Boolean(dash.project?.id === projectId),
      '가설 2개': dash.hypotheses?.length === 2,
      '각 가설에 verification_result 연결': dash.hypotheses?.every(
        (h: { verification_result: unknown }) => h.verification_result !== null,
      ),
      '각 가설에 verification_status 존재': dash.hypotheses?.every(
        (h: { verification_status: string }) => h.verification_status && h.verification_status !== '검토 전',
      ),
    };

    // 2) 상세 조회 (첫 번째 가설)
    const hid = dash.hypotheses[0].id as string;
    const detailRes = await fetch(`${API_BASE}/api/projects/${projectId}/hypotheses/${hid}`);
    if (!detailRes.ok) throw new Error(`상세 조회 실패: ${await detailRes.text()}`);
    const detail = await detailRes.json();
    console.log('\n=== GET /api/projects/:id/hypotheses/:hid (상세) ===');
    console.log(JSON.stringify(detail, null, 2));

    const detailChecks = {
      '가설 포함': Boolean(detail.hypothesis?.id === hid),
      '검증결과(summary) 포함': Boolean(detail.verification_result?.summary),
      'citations 포함': Array.isArray(detail.verification_result?.citations),
      '근거 태그 포함': Array.isArray(detail.evidence_tags) && detail.evidence_tags.length > 0,
      '근거 태그에 전사문 발췌(quote) 존재': detail.evidence_tags?.every(
        (t: { quote: string }) => Boolean(t.quote),
      ),
      '근거 태그에 출처 인터뷰명 조인됨': detail.evidence_tags?.every(
        (t: { interviews: unknown }) => t.interviews !== undefined,
      ),
    };

    console.log('\n--- 검증 결과 ---');
    let allPass = true;
    for (const [k, v] of [...Object.entries(dashChecks), ...Object.entries(detailChecks)]) {
      console.log(`${v ? '✅' : '❌'} ${k}`);
      if (!v) allPass = false;
    }
    console.log(`\n${allPass ? '✅ Task 6 완료 조건 전체 통과' : '❌ 일부 조건 실패'}`);
  } finally {
    await supabase.from('projects').delete().eq('id', projectId);
    console.log('🧹 테스트 데이터 정리 완료');
  }
}

main().catch((err) => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});
