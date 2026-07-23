const pool = require('../src/db');
const { findByTeamAndWeek, replaceForMemberWeek } = require('../src/models/availabilityModel');

// 시드 데이터 기준 값 (teams.id=1 "테스트 팀", members.id=1 "김우현")
const TEAM_ID = 1;
const MEMBER_ID = 1;
const WEEK_START = '2026-07-13';

const slots = [
  { date: '2026-07-13', hour: 10 },
  { date: '2026-07-13', hour: 11 },
  { date: '2026-07-14', hour: 15 },
];

async function main() {
  console.log('1) replaceForMemberWeek 저장...');
  await replaceForMemberWeek(TEAM_ID, MEMBER_ID, WEEK_START, slots);

  console.log('2) findByTeamAndWeek로 조회...');
  const firstRead = await findByTeamAndWeek(TEAM_ID, WEEK_START);
  console.log(firstRead);
  console.log(`   -> ${firstRead.length}개 행`);

  console.log('3) 같은 요청을 한 번 더 보내서 중복 여부 확인...');
  await replaceForMemberWeek(TEAM_ID, MEMBER_ID, WEEK_START, slots);
  const secondRead = await findByTeamAndWeek(TEAM_ID, WEEK_START);
  console.log(secondRead);
  console.log(`   -> ${secondRead.length}개 행`);

  if (firstRead.length === slots.length && secondRead.length === slots.length) {
    console.log(`\n✅ 통과: 두 번 다 정확히 ${slots.length}개 — 중복 없음`);
  } else {
    console.log('\n❌ 실패: 행 개수가 예상과 다름');
  }
}

main()
  .catch((err) => {
    console.error('에러 발생:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
