const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');
const { assertDbConnection } = require('../config/db');

async function main() {
  await assertDbConnection();
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('users');
  if (!columns.base_address) {
    await queryInterface.addColumn('users', 'base_address', { type: DataTypes.STRING(255), allowNull: true });
    console.log('[migration] users.base_address added');
  } else {
    console.log('[migration] users.base_address already exists');
  }
  await sequelize.close();
}

main().catch(async (error) => {
  console.error('[migration] failed:', error);
  await sequelize.close();
  process.exit(1);
});
