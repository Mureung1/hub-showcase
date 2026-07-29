import { pool } from '../db/pool.js'

/*
 * 시연용 소비자 계정 배정 (로그인 미구현 단계의 임시 장치).
 *
 * 부스에서 여러 방문자가 동시에 들어와도 같은 계정을 받으면 안 된다.
 * 한 문장 안에서 "다음 차례를 고르고 + 배정 시각을 찍는" 것을 원자적으로 처리한다.
 *
 * FOR UPDATE SKIP LOCKED: 다른 트랜잭션이 이미 잡은 행은 건너뛰고 그다음을 집는다.
 * 대기 없이 서로 다른 계정을 받게 되므로 동시 요청에도 중복이 나오지 않는다.
 * (재고 차감과 달리 "선점 후 순서대로 소진"이라 큐 패턴을 쓴다.)
 *
 * 정렬은 미사용(NULL) 우선 → 오래전 배정 순. 40명을 다 쓰면 처음으로 돌아가 순환한다.
 */
export async function claimNext(db = pool) {
  const { rows } = await db.query(
    `UPDATE demo_pool p
     SET assigned_at = now()
     WHERE p.user_id = (
       SELECT user_id FROM demo_pool
       ORDER BY assigned_at NULLS FIRST, user_id
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING p.user_id`,
  )
  if (rows.length === 0) return null

  const { rows: users } = await db.query('SELECT id, nickname FROM users WHERE id = $1', [
    rows[0].user_id,
  ])
  if (users.length === 0) return null

  return { userId: Number(users[0].id), nickname: users[0].nickname }
}

export async function countPool(db = pool) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE assigned_at IS NOT NULL)::int AS assigned
     FROM demo_pool`,
  )
  return rows[0]
}
