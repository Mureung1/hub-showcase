const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserGroupPurchase = sequelize.define(
  'UserGroupPurchase',
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
    isApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isReceived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isNoShow: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'user_group_purchases',
    indexes: [{ unique: true, fields: ['user_id', 'group_purchase_id'] }],
  }
);

module.exports = UserGroupPurchase;

