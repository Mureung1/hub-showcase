const { sequelize } = require('../models');
const { assertDbConnection } = require('../config/db');

async function addColumnIfMissing(table, column, definition) {
  const columns = await sequelize.getQueryInterface().describeTable(table);
  if (!columns[column]) await sequelize.getQueryInterface().addColumn(table, column, definition);
}

async function main() {
  await assertDbConnection();
  const queryInterface = sequelize.getQueryInterface();
  await addColumnIfMissing('group_purchases', 'pickup_place', { type: 'VARCHAR(255)', allowNull: true });
  await addColumnIfMissing('group_purchases', 'pickup_detail_address', { type: 'VARCHAR(255)', allowNull: true });
  await addColumnIfMissing('group_purchases', 'payment_account', { type: 'VARCHAR(150)', allowNull: true });
  await addColumnIfMissing('group_purchases', 'image_url', { type: 'MEDIUMTEXT', allowNull: true });
  await sequelize.query('ALTER TABLE group_purchases MODIFY COLUMN image_url MEDIUMTEXT NULL');
  await addColumnIfMissing('group_purchases', 'image_urls', { type: 'JSON', allowNull: true });
  await addColumnIfMissing('user_group_purchases', 'is_payment_confirmed', { type: 'TINYINT(1)', allowNull: false, defaultValue: false });
  await sequelize.query("UPDATE group_purchases SET current_participants = 1 WHERE current_participants = 0");
  await sequelize.query("ALTER TABLE group_purchases MODIFY COLUMN status ENUM('RECRUITING','COMPLETED','ORDERED','WAITING_PICKUP','FINISHED','FAILED') NOT NULL DEFAULT 'RECRUITING'");
  await queryInterface.createTable('notifications', {
    id: { type: 'INTEGER', primaryKey: true, autoIncrement: true, allowNull: false },
    user_id: { type: 'INTEGER', allowNull: false, references: { model: 'users', key: 'id' } },
    group_purchase_id: { type: 'INTEGER', allowNull: false, references: { model: 'group_purchases', key: 'id' } },
    title: { type: 'VARCHAR(150)', allowNull: false },
    content: { type: 'TEXT', allowNull: false },
    type: { type: "ENUM('EMAIL','PUSH')", allowNull: false, defaultValue: 'EMAIL' },
    sent_at: { type: 'DATETIME', allowNull: true },
    created_at: { type: 'DATETIME', allowNull: false },
    updated_at: { type: 'DATETIME', allowNull: false },
  }).catch((error) => {
    if (!/already exists/i.test(error.message)) throw error;
  });
  console.log('[migrate] notifications, pickup_place, payment_account, and payment confirmation are ready');
  await sequelize.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
