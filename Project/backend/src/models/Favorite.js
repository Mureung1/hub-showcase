const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Favorite = sequelize.define(
  'Favorite',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    groupPurchaseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'group_purchases', key: 'id' },
    },
  },
  {
    tableName: 'favorites',
    indexes: [{ unique: true, fields: ['user_id', 'group_purchase_id'] }],
  }
);

module.exports = Favorite;
