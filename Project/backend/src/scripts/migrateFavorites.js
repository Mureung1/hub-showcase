const { sequelize } = require('../models');
const { assertDbConnection } = require('../config/db');

async function main() {
  await assertDbConnection();
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();

  if (!tables.includes('favorites')) {
    await queryInterface.createTable('favorites', {
      id: { type: require('sequelize').DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: require('sequelize').DataTypes.INTEGER, allowNull: false },
      group_purchase_id: { type: require('sequelize').DataTypes.INTEGER, allowNull: false },
      created_at: { type: require('sequelize').DataTypes.DATE, allowNull: false },
      updated_at: { type: require('sequelize').DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('favorites', ['user_id', 'group_purchase_id'], { unique: true, name: 'favorites_user_group_purchase_unique' });
    console.log('[migration] favorites table created');
  } else {
    console.log('[migration] favorites table already exists');
  }

  await sequelize.close();
}

main().catch(async (error) => {
  console.error('[migration] failed:', error);
  await sequelize.close();
  process.exit(1);
});
