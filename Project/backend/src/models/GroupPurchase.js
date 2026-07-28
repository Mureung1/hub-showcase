const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GroupPurchase = sequelize.define(
  'GroupPurchase',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    hostId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    productUrl: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.TEXT('medium'),
      allowNull: true,
    },
    imageUrls: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    totalPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    targetParticipants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 2 },
    },
    currentParticipants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 0 },
    },
    perPersonPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    pickupLatitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    pickupLongitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    pickupPlace: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pickupDetailAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pickupTimeSlot: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    paymentAccount: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('FOOD', 'NECESSITY', 'ETC'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'RECRUITING',
        'COMPLETED',
        'ORDERED',
        'WAITING_PICKUP',
        'FINISHED',
        'FAILED'
      ),
      allowNull: false,
      defaultValue: 'RECRUITING',
    },
    deadlineAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'group_purchases',
    indexes: [
      { fields: ['status'] },
      { fields: ['deadline_at'] },
      { fields: ['host_id'] },
    ],
  }
);

module.exports = GroupPurchase;

