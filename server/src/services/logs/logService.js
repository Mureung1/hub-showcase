import pool from '../../data/db.js';

// 요청 1건의 판정 결과를 logs 1행 + detections N행으로 적재한다.
// 원자성을 위해 트랜잭션으로 묶는다(로그만 남고 탐지가 빠지는 상태 방지).
// matched_value에는 원문이 아니라 마스킹본을 저장한다 — 유출 방지 도구가 자기 로그에
// 평문 민감정보를 쌓지 않도록.
export async function recordLog({ userId, action, provider, detections = [] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const logRes = await client.query(
      'INSERT INTO logs (user_id, action, provider) VALUES ($1, $2, $3) RETURNING id',
      [userId, action, provider ?? null]
    );
    const logId = logRes.rows[0].id;

    for (const d of detections) {
      await client.query(
        'INSERT INTO detections (log_id, type, source, matched_value) VALUES ($1, $2, $3, $4)',
        [logId, d.type, d.source ?? 'regex', d.masked ?? null]
      );
    }

    await client.query('COMMIT');
    return logId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 특정 사용자의 로그를 최신순으로. 각 로그의 탐지 항목은 "타입 목록"으로만 집계한다
// (log-viewer는 무엇이 탐지됐는지 종류만 보여주고 실제 값은 노출하지 않는다).
export async function fetchUserLogs(userId, limit = 100) {
  const result = await pool.query(
    `SELECT l.id,
            l.created_at,
            l.action,
            COALESCE(array_agg(d.type) FILTER (WHERE d.type IS NOT NULL), '{}') AS detections
     FROM logs l
     LEFT JOIN detections d ON d.log_id = l.id
     WHERE l.user_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    timestamp: row.created_at,
    detections: row.detections,
    action: row.action,
  }));
}
