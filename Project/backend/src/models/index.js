const { sequelize } = require('../config/db');
const User = require('./User');
const GroupPurchase = require('./GroupPurchase');
const UserGroupPurchase = require('./UserGroupPurchase');

User.belongsToMany(GroupPurchase, {
  through: UserGroupPurchase,
  foreignKey: 'userId',
  otherKey: 'groupPurchaseId',
});

GroupPurchase.belongsToMany(User, {
  through: UserGroupPurchase,
  foreignKey: 'groupPurchaseId',
  otherKey: 'userId',
});

UserGroupPurchase.belongsTo(User, { foreignKey: 'userId' });
UserGroupPurchase.belongsTo(GroupPurchase, { foreignKey: 'groupPurchaseId' });

GroupPurchase.belongsTo(User, { as: 'host', foreignKey: 'hostId' });
User.hasMany(GroupPurchase, { as: 'hostedGroupPurchases', foreignKey: 'hostId' });

module.exports = {
  sequelize,
  User,
  GroupPurchase,
  UserGroupPurchase,
};

