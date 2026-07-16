const BASE_URL = 'http://localhost:4000/api/basket';

async function run() {
  const results = [];

  // 1. POST 테스트: 과목 추가가 되는가
  const testCourse = {
    course_name: `검증테스트_${Date.now()}`,
    credits: 3,
    is_major: true,
  };

  const postRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCourse),
  });
  const posted = await postRes.json();

  results.push({
    name: 'POST /api/basket → 201 응답 + id 생성',
    pass: postRes.status === 201 && !!posted.id,
    detail: `status=${postRes.status}, id=${posted.id}`,
  });

  // 2. GET 테스트: 방금 넣은 게 실제로 조회되는가
  const getRes = await fetch(BASE_URL);
  const list = await getRes.json();
  const found = list.find((item) => item.id === posted.id);

  results.push({
    name: 'GET /api/basket → 방금 저장한 항목이 목록에 존재',
    pass: !!found && found.course_name === testCourse.course_name,
    detail: found ? `found id=${found.id}` : '목록에서 못 찾음',
  });

  // 3. 필수값 누락 시 에러 처리가 되는가
  const badRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credits: 3 }), // course_name 없음
  });

  results.push({
    name: '필수값 누락 시 500 이상 에러 응답',
    pass: badRes.status >= 400,
    detail: `status=${badRes.status}`,
  });

  // 결과 출력
  console.log('\n=== 검증 결과 ===');
  let allPass = true;
  results.forEach((r) => {
    const mark = r.pass ? '✅' : '❌';
    console.log(`${mark} ${r.name} (${r.detail})`);
    if (!r.pass) allPass = false;
  });
  console.log(allPass ? '\n🎉 전체 통과' : '\n⚠️ 일부 실패');
  process.exit(allPass ? 0 : 1);
}

run().catch((err) => {
  console.error('검증 스크립트 실행 중 에러:', err.message);
  process.exit(1);
});