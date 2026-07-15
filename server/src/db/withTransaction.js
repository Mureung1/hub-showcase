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
