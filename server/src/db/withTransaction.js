import { pool } from './pool.js'

/*
 * 트랜잭션 헬퍼 — 연결 대여·BEGIN·COMMIT·ROLLBACK·release를 한 곳에 가둔다.
 * 콜백은 트랜잭션 전용 client를 받아 그 위에서만 쿼리한다 (같은 연결 = 같은 트랜잭션).
 * 콜백이 throw하면 자동 ROLLBACK 후 에러를 다시 던진다.
 *
 *   const result = await withTransaction(async (client) => {
 *     await client.query('UPDATE ...')
 *     return ...
 *   })
 */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/*
 * 세이브포인트 헬퍼 — 트랜잭션 안에서 "실패해도 되는 시도"를 감싼다.
 *
 * 트랜잭션 중 문장이 실패하면 세션이 aborted 상태가 되어 이후 모든 쿼리가 거부된다.
 * 세이브포인트로 되돌리면 그 지점까지만 취소되므로 트랜잭션을 살린 채 재시도할 수 있다.
 * shouldRetry가 true를 반환하는 에러는 삼키고 null을 반환한다(호출부가 재시도).
 */
export async function trySavepoint(client, name, fn, shouldRetry) {
  await client.query(`SAVEPOINT ${name}`)
  try {
    const result = await fn()
    await client.query(`RELEASE SAVEPOINT ${name}`)
    return result
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`)
    if (shouldRetry(err)) return null
    throw err
  }
}
