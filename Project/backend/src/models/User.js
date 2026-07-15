const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    baseLatitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    baseLongitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    mannerTemperature: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 36.5,
    },
    noShowCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    webPushEndpoint: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    oauthProvider: {
      type: DataTypes.ENUM('KAKAO', 'NAVER'),
      allowNull: false,
    },
    oauthId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    tableName: 'users',
    indexes: [{ unique: true, fields: ['oauth_provider', 'oauth_id'] }],
  }
);

module.exports = User;

