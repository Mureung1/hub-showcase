/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('meeting_participants', {
    id: { type: 'bigserial', primaryKey: true },
    meeting_id: { type: 'bigint', notNull: true, references: 'meetings' },
    user_id: { type: 'bigint', notNull: true, references: 'users' },
    status: { type: 'varchar(15)', notNull: true },
    applied_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    responded_at: { type: 'timestamp' },
  });

  pgm.addConstraint('meeting_participants', 'meeting_participants_meeting_user_unique', {
    unique: ['meeting_id', 'user_id'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('meeting_participants');
};
