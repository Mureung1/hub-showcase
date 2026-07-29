const pool = require('../config/db');
const { computeTrustScore } = require('../utils/trustScore');
const { resolveEvaluations } = require('../utils/evaluationMatching');
const withTransaction = require('../utils/withTransaction');
const ApiError = require('../utils/apiError');

// 수정은 제출 후 이 시간 안에 1회만(설계 4.5). 잘못 눌렀을 때의 구제책은 필요하지만,
// 무기한 수정을 허용하면 상대의 평가를 보고 바꾸는 눈치 게임이 생긴다.
const EDIT_WINDOW_HOURS = 24;

// 평가 창은 종료 후 14일(설계 4.1). 오래된 모임의 기억은 부정확하고, 무한정 열어두면
// "언제든 하지" 하고 안 한다.
const EVALUATION_WINDOW_DAYS = 14;

// 종료 판정은 목록·상세와 똑같이 SQL now()로 한다. JS Date로 다시 비교하면 어긋난다.
const IN_WINDOW = `
  m.status <> 'cancelled'
  AND COALESCE(m.end_at, m.start_at) < now()
  AND COALESCE(m.end_at, m.start_at) > now() - interval '${EVALUATION_WINDOW_DAYS} days'
`;

// 내가 평가해야 할 모임 목록(설계 4.1~4.2). 모임장은 확정 참여자 전원을,
// 확정 참여자는 모임장을 평가한다. 이미 제출한 평가 대상은 빠진다.
async function listPendingEvaluations(userId) {
  // 모임장으로서 평가할 것: 확정 참여자 중 내가 아직 평가하지 않은 사람.
  const hostRes = await pool.query(
    `SELECT m.id, m.title, m.type, m.start_at, m.end_at,
            p.user_id AS target_id, u.nickname AS target_nickname
       FROM meetings m
       JOIN meeting_participants p ON p.meeting_id = m.id
       JOIN users u ON u.id = p.user_id
      WHERE m.host_id = $1
        AND p.status IN ('confirmed','approved')
        AND ${IN_WINDOW}
        AND NOT EXISTS (
          SELECT 1 FROM meeting_evaluations e
           WHERE e.meeting_id = m.id AND e.rater_id = $1 AND e.ratee_id = p.user_id
        )
      ORDER BY COALESCE(m.end_at, m.start_at) DESC, m.id DESC, p.user_id ASC`,
    [userId]
  );

  // 참여자로서 평가할 것: 내가 확정이었던 모임의 모임장.
  const participantRes = await pool.query(
    `SELECT m.id, m.title, m.type, m.start_at, m.end_at,
            m.host_id AS target_id, u.nickname AS target_nickname
       FROM meeting_participants p
       JOIN meetings m ON m.id = p.meeting_id
       JOIN users u ON u.id = m.host_id
      WHERE p.user_id = $1
        AND p.status IN ('confirmed','approved')
        AND ${IN_WINDOW}
        AND NOT EXISTS (
          SELECT 1 FROM meeting_evaluations e
           WHERE e.meeting_id = m.id AND e.rater_id = $1 AND e.ratee_id = m.host_id
        )
      ORDER BY COALESCE(m.end_at, m.start_at) DESC, m.id DESC`,
    [userId]
  );

  const byMeeting = new Map();
  const collect = (rows, role) => {
    for (const row of rows) {
      const id = Number(row.id);
      if (!byMeeting.has(id)) {
        byMeeting.set(id, {
          meeting: {
            id,
            title: row.title,
            type: row.type,
            startAt: row.start_at,
            endAt: row.end_at,
          },
          role,
          targets: [],
        });
      }
      byMeeting.get(id).targets.push({
        userId: Number(row.target_id),
        nickname: row.target_nickname,
      });
    }
  };

  collect(hostRes.rows, 'host');
  collect(participantRes.rows, 'participant');

  const items = [...byMeeting.values()];
  return { items, count: items.length };
}

// 이 사람이 **받은** 평가와, 각 평가의 대조 상대(같은 모임의 반대 방향 평가)를 함께 읽는다.
// 상대 평가가 없으면 반박이 없다는 뜻이라 그대로 유효하다(설계 6장).
async function loadEvaluationPairs(client, userId) {
  const { rows } = await client.query(
    `SELECT e.meeting_id, e.rater_id, e.ratee_id, e.attended, e.tags, e.created_at,
            o.rater_id  AS o_rater_id,
            o.ratee_id  AS o_ratee_id,
            o.attended  AS o_attended,
            o.tags      AS o_tags,
            o.created_at AS o_created_at
       FROM meeting_evaluations e
       LEFT JOIN meeting_evaluations o
              ON o.meeting_id = e.meeting_id
             AND o.rater_id = e.ratee_id
             AND o.ratee_id = e.rater_id
      WHERE e.ratee_id = $1`,
    [userId]
  );

  return rows.map((row) => ({
    meetingId: Number(row.meeting_id),
    // 이 사람이 받은 평가를 hostSide 자리에 둔다. 대조 규칙은 좌우 대칭이라
    // 어느 쪽을 어디에 두든 결과가 같다(설계 6장 "규칙은 양방향 대칭이다").
    hostSide: {
      meetingId: Number(row.meeting_id),
      raterId: Number(row.rater_id),
      rateeId: Number(row.ratee_id),
      attended: row.attended,
      tags: row.tags ?? [],
      createdAt: row.created_at,
    },
    participantSide:
      row.o_rater_id == null
        ? null
        : {
            meetingId: Number(row.meeting_id),
            raterId: Number(row.o_rater_id),
            rateeId: Number(row.o_ratee_id),
            attended: row.o_attended,
            tags: row.o_tags ?? [],
            createdAt: row.o_created_at,
          },
  }));
}

// 평가·취소가 일어날 때만 재계산한다(설계 5.5). 조회 시점에 계산하면 신청자 10명이 뜨는
// 페이지 한 번에 10명분 이력 스캔과 UPDATE가 일어난다 — 읽기가 쓰기를 유발한다.
async function recalculateTrustScore(client, userId) {
  const pairs = await loadEvaluationPairs(client, userId);
  const { validForRatee } = resolveEvaluations(pairs);

  // 유효 평가 중 "내가 받은 것"만 점수 이벤트가 된다(상대가 받은 것은 상대 계산에 쓰인다).
  const mine = validForRatee.filter((e) => e.rateeId === Number(userId));

  const cancelRes = await client.query(
    `SELECT cancelled_at, was_confirmed, hours_before_start
       FROM participation_cancellations WHERE user_id = $1`,
    [userId]
  );

  const events = [
    ...mine.map((e) => ({
      kind: 'evaluation',
      at: e.createdAt,
      raterId: e.raterId,
      attended: e.attended,
      tags: e.tags,
    })),
    ...cancelRes.rows.map((row) => ({
      kind: 'cancellation',
      at: row.cancelled_at,
      raterId: null,
      wasConfirmed: row.was_confirmed,
      // numeric은 문자열로 온다.
      hoursBeforeStart: Number(row.hours_before_start),
    })),
  ];

  const { score } = computeTrustScore(events, new Date());
  const rounded = Math.round(score * 10) / 10;

  await client.query(
    `UPDATE users
        SET trust_score = $2, trust_score_updated_at = now(), evaluation_count = $3
      WHERE id = $1`,
    [userId, rounded, mine.length]
  );

  return { score: rounded, evaluationCount: mine.length };
}

// 평가 제출(4.2, 4.5, 6.2). 모임장은 확정 참여자 여러 명을, 참여자는 모임장 한 명을
// 평가한다. INSERT/UPDATE와 재계산이 한 트랜잭션 안에서 일어나야 한쪽만 반영되는 사고가 없다.
//
// 모임 행을 FOR UPDATE로 잠가 같은 모임에 대한 동시 제출을 직렬화한다(applyToMeeting과 동일
// 패턴, meetingService.js:272). 이게 없으면 두 가지가 새는데 — (1) 호스트↔참여자가 동시에
// 서로에 대해 제출하면 둘 다 상대의 미커밋 진술을 못 보고 대조 없이 재계산해, 나중에 커밋되는
// 쪽이 상대 진술을 반영 못 한 낡은 점수로 덮어쓴다(설계 6.2가 막으려는 상황이 그대로 샌다).
// (2) 같은 (meeting_id, rater_id, ratee_id) 쌍의 첫 제출이 동시에 두 번 오면 둘 다
// existing.rows.length===0으로 보고 INSERT를 시도해, 진 쪽이 유니크 제약 위반(23505, 미분류
// pg 에러)으로 500이 난다. 잠금이 두 요청을 순차화하므로 둘 다 해결된다.
async function submitEvaluations(meetingId, raterId, entries) {
  return withTransaction(async (client) => {
    const meetingRes = await client.query(
      `SELECT host_id, status,
              COALESCE(end_at, start_at) < now() AS is_past,
              COALESCE(end_at, start_at) > now() - interval '${EVALUATION_WINDOW_DAYS} days' AS in_window
         FROM meetings WHERE id = $1 FOR UPDATE`,
      [meetingId]
    );
    if (meetingRes.rows.length === 0) {
      throw new ApiError('NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    const meeting = meetingRes.rows[0];
    const hostId = Number(meeting.host_id);

    // 자격 판정을 창 검사보다 먼저 한다 — 남의 모임의 종료 여부가 덜 새어나간다.
    const isHost = hostId === Number(raterId);
    let isConfirmedParticipant = false;
    if (!isHost) {
      const partRes = await client.query(
        `SELECT 1 FROM meeting_participants
          WHERE meeting_id = $1 AND user_id = $2 AND status IN ('confirmed','approved')`,
        [meetingId, raterId]
      );
      isConfirmedParticipant = partRes.rows.length > 0;
    }
    if (!isHost && !isConfirmedParticipant) {
      throw new ApiError('FORBIDDEN', '이 모임을 평가할 수 없습니다');
    }

    if (meeting.status === 'cancelled') {
      throw new ApiError('VALIDATION_ERROR', '취소된 모임은 평가할 수 없습니다');
    }
    if (!meeting.is_past) {
      throw new ApiError('VALIDATION_ERROR', '아직 끝나지 않은 모임입니다');
    }
    if (!meeting.in_window) {
      throw new ApiError('VALIDATION_ERROR', '평가 기간이 지났습니다');
    }

    // 대상 자격: 모임장은 확정 참여자만, 참여자는 모임장만 평가한다(설계 4.2).
    const allowedRes = await client.query(
      isHost
        ? `SELECT user_id AS id FROM meeting_participants
            WHERE meeting_id = $1 AND status IN ('confirmed','approved')`
        : 'SELECT host_id AS id FROM meetings WHERE id = $1',
      [meetingId]
    );
    const allowed = new Set(allowedRes.rows.map((row) => Number(row.id)));
    for (const entry of entries) {
      if (!allowed.has(entry.rateeId)) {
        throw new ApiError('VALIDATION_ERROR', '평가할 수 없는 대상입니다');
      }
    }

    for (const entry of entries) {
      const existing = await client.query(
        `SELECT created_at, updated_at,
                updated_at <> created_at AS already_edited,
                created_at > now() - interval '${EDIT_WINDOW_HOURS} hours' AS editable
           FROM meeting_evaluations
          WHERE meeting_id = $1 AND rater_id = $2 AND ratee_id = $3`,
        [meetingId, raterId, entry.rateeId]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO meeting_evaluations (meeting_id, rater_id, ratee_id, attended, tags)
           VALUES ($1,$2,$3,$4,$5)`,
          [meetingId, raterId, entry.rateeId, entry.attended, entry.tags]
        );
        continue;
      }

      const row = existing.rows[0];
      if (row.already_edited) {
        throw new ApiError('VALIDATION_ERROR', '평가는 한 번만 수정할 수 있습니다');
      }
      if (!row.editable) {
        throw new ApiError('VALIDATION_ERROR', '평가 수정 시간(24시간)이 지났습니다');
      }
      await client.query(
        `UPDATE meeting_evaluations
            SET attended = $4, tags = $5, updated_at = now()
          WHERE meeting_id = $1 AND rater_id = $2 AND ratee_id = $3`,
        [meetingId, raterId, entry.rateeId, entry.attended, entry.tags]
      );
    }

    // 재계산 대상이 한 명이 아니다. 내 제출이 상대의 판정을 뒤집을 수 있으므로
    // rater와 모든 ratee를 함께 갱신한다(설계 6.2). 한쪽만 갱신하면 상대 점수가 낡은 판정에 머문다.
    // 순서는 반드시 고정해야 한다: recalculateTrustScore는 users 행을 UPDATE로 잠근다.
    // 정렬 없이 삽입 순서(rater 먼저)로 돌면, 거울 모임(H가 한쪽 모임장·다른 모임 참여자,
    // A와 짝) 두 건이 동시에 제출될 때 한쪽 트랜잭션은 H→A 순으로, 다른 쪽은 A→H 순으로
    // users 행을 잠가 잠금 순서가 엇갈릴 수 있다 — 교착(40P01)이 나 500이 된다.
    // 오름차순으로 고정하면 모든 트랜잭션이 같은 순서로만 잠그므로 교착이 원천적으로 없다.
    const targets = [...new Set([Number(raterId), ...entries.map((e) => e.rateeId)])].sort((a, b) => a - b);
    for (const userId of targets) {
      await recalculateTrustScore(client, userId);
    }

    return { submitted: entries.length };
  });
}

module.exports = {
  recalculateTrustScore,
  listPendingEvaluations,
  submitEvaluations,
  EVALUATION_WINDOW_DAYS,
};
