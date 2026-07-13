/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('users', {
    id: { type: 'bigserial', primaryKey: true },
    provider: { type: 'varchar(20)', notNull: true },
    provider_id: { type: 'varchar(100)', notNull: true },
    email: { type: 'varchar(255)', notNull: true },
    nickname: { type: 'varchar(50)', notNull: true },
    birth_date: { type: 'date' },
    trust_score: { type: 'numeric(4,1)', notNull: true, default: 50.0 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    suspended_until: { type: 'timestamp' },
    suspension_count: { type: 'int', notNull: true, default: 0 },
  });

  pgm.addConstraint('users', 'users_provider_provider_id_unique', {
    unique: ['provider', 'provider_id'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('users');
};
