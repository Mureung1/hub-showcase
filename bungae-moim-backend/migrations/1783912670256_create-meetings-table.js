/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('meetings', {
    id: { type: 'bigserial', primaryKey: true },
    host_id: { type: 'bigint', notNull: true, references: 'users' },
    type: { type: 'varchar(10)', notNull: true },
    title: { type: 'varchar(100)', notNull: true },
    category: { type: 'varchar(30)', notNull: true },
    description: { type: 'text' },
    region_sido: { type: 'varchar(20)', notNull: true },
    region_sigungu: { type: 'varchar(20)', notNull: true },
    region_eupmyeondong: { type: 'varchar(20)' },
    start_at: { type: 'timestamp', notNull: true },
    end_at: { type: 'timestamp' },
    capacity: { type: 'int' },
    adult_only: { type: 'boolean', notNull: true, default: false },
    open_chat_url: { type: 'text', notNull: true },
    status: { type: 'varchar(15)', notNull: true, default: 'recruiting' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('meetings', 'meetings_type_capacity_endat_check', {
    check: "(type = 'flash' AND capacity IS NOT NULL AND end_at IS NULL) OR (type = 'small' AND capacity IS NULL)",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('meetings');
};
