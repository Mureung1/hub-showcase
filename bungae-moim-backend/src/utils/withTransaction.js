const pool = require('../config/db');

// 이 저장소의 트랜잭션 공용 헬퍼. 반드시 커넥션 하나(client)를 잡아 그 위에서만 BEGIN~COMMIT을
// 돌린다. pool.query로 BEGIN/FOR UPDATE/INSERT를 나눠 부르면 매 호출이 다른 커넥션을 집어와
// FOR UPDATE 잠금이 무력화되고(정원 동시 신청 초과가 뚫림) 원자성도 깨진다.
// 정상적인 거절(MEETING_FULL 등 ApiError)도 잠금을 쥔 채 throw되므로 catch에서 ROLLBACK 후
// release해야 커넥션이 오염되지 않는다.
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = withTransaction;
