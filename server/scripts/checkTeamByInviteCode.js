const pool = require('../src/db');
const { getTeamByInviteCode } = require('../src/models/teamModel');

async function main() {
  console.log('1) 존재하는 코드 "TEAM01" 조회...');
  const found = await getTeamByInviteCode('TEAM01');
  console.log(found);

  console.log('\n2) 존재하지 않는 코드 "NOPE99" 조회...');
  const notFound = await getTeamByInviteCode('NOPE99');
  console.log(notFound);

  const pass = found && found.name && notFound === null;
  console.log(pass ? '\n✅ 통과' : '\n❌ 실패');
}

main()
  .catch((err) => {
    console.error('에러 발생:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
