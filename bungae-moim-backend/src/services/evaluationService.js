const { computeTrustScore } = require('../utils/trustScore');
const { resolveEvaluations } = require('../utils/evaluationMatching');

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

module.exports = { recalculateTrustScore };
