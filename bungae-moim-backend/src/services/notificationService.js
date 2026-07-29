const pool = require('../config/db');
const { listPendingEvaluations } = require('./evaluationService');

// 알림 종류. DB에는 varchar로 저장하고 문구는 FE가 고른다.
const NOTIFICATION_TYPES = {
  NEW_APPLICATION: 'new_application',
  APPLICATION_APPROVED: 'application_approved',
  APPLICATION_REJECTED: 'application_rejected',
  MEETING_CANCELLED: 'meeting_cancelled',
  EVALUATION_REQUESTED: 'evaluation_requested',
};

// 드롭다운에 담는 최근 건수. 미읽음 수는 이 상한과 무관하게 전체를 센다.
const LIST_LIMIT = 20;

// 알림 INSERT는 항상 그 알림을 낳은 행위와 같은 트랜잭션 안에서 일어나야 한다.
// (행위는 커밋됐는데 알림만 유실되면 사용자가 승인·거절을 영영 모른다.)
// 그래서 pool이 아니라 호출자가 잡은 client를 첫 인자로 받는다.
async function createNotification(client, { userId, type, meetingId }) {
  await client.query(
    'INSERT INTO notifications (user_id, type, meeting_id) VALUES ($1, $2, $3)',
    [userId, type, meetingId]
  );
}

// 여러 수신자에게 같은 알림을 한 번에(E5 모임 취소). 빈 배열이면 쿼리 자체를 보내지 않는다.
async function createNotifications(client, { userIds, type, meetingId }) {
  if (userIds.length === 0) return;
  await client.query(
    `INSERT INTO notifications (user_id, type, meeting_id)
     SELECT unnest($1::bigint[]), $2, $3`,
    [userIds, type, meetingId]
  );
}

// 이 프로젝트엔 크론·배치가 없어 "모임이 끝났다"를 감지할 수단이 없다. 그래서 알림을
// 조회하는 시점에 본인 것만 만들어 넣는다("모임당 평가할 게 남아 있는가"는 Task 5의
// listPendingEvaluations가 이미 정확히 계산해 두므로 창·자격 로직을 여기서 다시 베끼지
// 않는다). 중복은 부분 유니크 인덱스(user_id, meeting_id) WHERE type='evaluation_requested'
// (마이그레이션 1785283754872)가 막으므로 ON CONFLICT로 조용히 넘긴다.
async function ensureEvaluationNotifications(userId) {
  const { items } = await listPendingEvaluations(userId);
  if (items.length === 0) return;

  const meetingIds = items.map((item) => item.meeting.id);
  await pool.query(
    `INSERT INTO notifications (user_id, type, meeting_id)
     SELECT $1, $2, unnest($3::bigint[])
     ON CONFLICT DO NOTHING`,
    [userId, NOTIFICATION_TYPES.EVALUATION_REQUESTED, meetingIds]
  );
}

// created_at 동률에서 Postgres는 순서를 보장하지 않는다. id tiebreak가 없으면 같은 요청이
// 매번 다른 순서를 줄 수 있다(F3 신청자 목록과 같은 이유).
async function listNotifications(userId) {
  const { rows } = await pool.query(
    `SELECT n.id, n.type, n.meeting_id, n.is_read, n.created_at, m.title AS meeting_title
       FROM notifications n
       JOIN meetings m ON m.id = n.meeting_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT $2`,
    [userId, LIST_LIMIT]
  );

  const countRes = await pool.query(
    'SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );

  return {
    items: rows.map((row) => ({
      // id·meeting_id는 bigint라 pg가 문자열로 준다.
      id: Number(row.id),
      type: row.type,
      meetingId: Number(row.meeting_id),
      meetingTitle: row.meeting_title,
      isRead: row.is_read,
      createdAt: row.created_at,
    })),
    unreadCount: countRes.rows[0].n,
  };
}

// 목록을 열면 그 시점의 미읽음을 전부 읽음 처리한다(개별 읽음은 없다).
async function markAllRead(userId) {
  await pool.query(
    'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return { unreadCount: 0 };
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  createNotifications,
  ensureEvaluationNotifications,
  listNotifications,
  markAllRead,
  LIST_LIMIT,
};
