const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  groupPurchaseId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'group_purchases', key: 'id' } },
  title: { type: DataTypes.STRING(150), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('EMAIL', 'PUSH'), allowNull: false, defaultValue: 'EMAIL' },
  sentAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'notifications',
  indexes: [{ fields: ['user_id'] }, { fields: ['group_purchase_id'] }, { fields: ['sent_at'] }],
});

module.exports = Notification;
