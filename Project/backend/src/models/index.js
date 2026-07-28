const { sequelize } = require('../config/db');
const User = require('./User');
const GroupPurchase = require('./GroupPurchase');
const UserGroupPurchase = require('./UserGroupPurchase');
const Notification = require('./Notification');
const Favorite = require('./Favorite');

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
Notification.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(GroupPurchase, { foreignKey: 'groupPurchaseId', onDelete: 'CASCADE' });
User.hasMany(Notification, { foreignKey: 'userId' });
GroupPurchase.hasMany(Notification, { foreignKey: 'groupPurchaseId' });
Favorite.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
Favorite.belongsTo(GroupPurchase, { foreignKey: 'groupPurchaseId', onDelete: 'CASCADE' });
User.hasMany(Favorite, { foreignKey: 'userId' });
GroupPurchase.hasMany(Favorite, { foreignKey: 'groupPurchaseId' });

module.exports = {
  sequelize,
  User,
  GroupPurchase,
  UserGroupPurchase,
  Notification,
  Favorite,
};

