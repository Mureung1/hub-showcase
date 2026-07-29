/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * 신뢰도 상호 평가(3단계). 평가·취소 이력이 원본이고 users.trust_score는 파생 캐시다.
 * 공식을 바꿔 전체 재계산할 수 있어야 하므로, 점수가 아니라 사실(출석·태그·취소 시점)만 저장한다.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('meeting_evaluations', {
    id: { type: 'bigserial', primaryKey: true },
    meeting_id: { type: 'bigint', notNull: true, references: 'meetings' },
    rater_id: { type: 'bigint', notNull: true, references: 'users' },
    ratee_id: { type: 'bigint', notNull: true, references: 'users' },
    attended: { type: 'boolean', notNull: true },
    tags: { type: 'text[]', notNull: true, default: pgm.func("'{}'") },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // 한 모임에서 같은 사람을 두 번 평가할 수 없다(설계 3.1).
  pgm.addConstraint('meeting_evaluations', 'meeting_evaluations_unique_pair', {
    unique: ['meeting_id', 'rater_id', 'ratee_id'],
  });
  // 재계산은 항상 "이 사람이 받은 평가 전부"를 읽는다.
  pgm.createIndex('meeting_evaluations', ['ratee_id']);
  // 대조 규칙이 상대의 반대편 평가를 찾는다(meeting_id + rater_id).
  pgm.createIndex('meeting_evaluations', ['meeting_id', 'rater_id']);

  // meeting_participants는 (모임,사용자)당 한 행뿐이고 재신청이 그 행을 덮어써서
  // "몇 번 취소했는지"가 남지 않는다. 취소 가중치(D10)를 계산할 데이터가 아예 없으므로
  // append-only 이력을 따로 쌓는다.
  pgm.createTable('participation_cancellations', {
    id: { type: 'bigserial', primaryKey: true },
    meeting_id: { type: 'bigint', notNull: true, references: 'meetings' },
    user_id: { type: 'bigint', notNull: true, references: 'users' },
    cancelled_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    was_confirmed: { type: 'boolean', notNull: true },
    // 모임 시작 시각이 나중에 수정(E4)돼도 취소 당시의 판단이 맞으므로 스냅샷으로 굳힌다.
    hours_before_start: { type: 'numeric', notNull: true },
  });
  pgm.createIndex('participation_cancellations', ['user_id']);

  // trust_score의 의미가 "원본"에서 "계산 결과 캐시"로 바뀐다.
  pgm.addColumn('users', {
    trust_score_updated_at: { type: 'timestamp' },
    // 점수에 실제로 반영된 평가 수만 센다(무효 처리된 평가는 제외 — 설계 3.3).
    evaluation_count: { type: 'integer', notNull: true, default: 0 },
  });

  // 평가 요청 알림은 라우트 이동 때 lazy 생성되므로 같은 모임에 대해 중복 생성될 수 있다.
  // 부분 유니크 인덱스로 DB가 멱등성을 보장하게 한다(다른 타입은 중복이 정상이다).
  pgm.createIndex('notifications', ['user_id', 'meeting_id'], {
    unique: true,
    where: "type = 'evaluation_requested'",
    name: 'notifications_evaluation_requested_unique',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('notifications', ['user_id', 'meeting_id'], {
    name: 'notifications_evaluation_requested_unique',
  });
  pgm.dropColumn('users', ['trust_score_updated_at', 'evaluation_count']);
  pgm.dropTable('participation_cancellations');
  pgm.dropTable('meeting_evaluations');
};
