/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * 알림(C). 수신자 1명당 1행이고, 어떤 모임에서 벌어진 일인지는 meeting_id로만 가리킨다
 * (제목·문구는 저장하지 않는다 — 모임 제목이 바뀌면 알림도 따라 바뀌는 게 맞다).
 * type은 varchar로 두고 값 목록은 앱(notificationService)에서만 관리한다.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('notifications', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: 'users' },
    type: { type: 'varchar(30)', notNull: true },
    meeting_id: { type: 'bigint', notNull: true, references: 'meetings' },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // 조회는 항상 "내 알림을 최신순으로"라서 이 순서의 복합 인덱스 하나면 된다.
  pgm.createIndex('notifications', ['user_id', 'created_at']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('notifications');
};
