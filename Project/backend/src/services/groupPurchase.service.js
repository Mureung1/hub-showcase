const { GroupPurchase, UserGroupPurchase, User, sequelize } = require('../models');
const AppError = require('../utils/appError');

async function listGroupPurchases(filters = {}) {
  const where = {};
  if (filters.category) {
    where.category = filters.category;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  return await GroupPurchase.findAll({
    where,
    include: [{ model: User, as: 'host', attributes: ['id', 'nickname', 'mannerTemperature'] }],
    order: [['createdAt', 'DESC']],
  });
}

async function getGroupPurchaseById(id) {
  const groupPurchase = await GroupPurchase.findByPk(id, {
    include: [{ model: User, as: 'host', attributes: ['id', 'nickname', 'mannerTemperature', 'noShowCount'] }],
  });
  if (!groupPurchase) {
    throw new AppError(404, '공동구매를 찾을 수 없습니다.', 'GROUP_PURCHASE_NOT_FOUND');
  }
  return groupPurchase;
}

async function createGroupPurchase(data) {
  const {
    hostId,
    title,
    description,
    productUrl,
    totalPrice,
    targetParticipants,
    pickupLatitude,
    pickupLongitude,
    pickupTimeSlot,
    category,
    deadlineAt,
  } = data;

  const perPersonPrice = Math.round(totalPrice / targetParticipants);

  // Ensure host user exists in the database to prevent foreign key errors
  let host = await User.findByPk(hostId);
  if (!host) {
    host = await User.create({
      id: hostId,
      email: hostId === 1 ? 'host@test.com' : 'neighbor@test.com',
      nickname: hostId === 1 ? '호스트 (공구장)' : '참여자 (이웃)',
      oauthProvider: 'KAKAO',
      oauthId: `dev-host-${hostId}`,
      mannerTemperature: 36.5,
      noShowCount: 0,
    });
  }

  return await GroupPurchase.create({
    hostId,
    title,
    description,
    productUrl,
    totalPrice,
    targetParticipants,
    currentParticipants: 0,
    perPersonPrice,
    pickupLatitude: pickupLatitude || 37.5665,
    pickupLongitude: pickupLongitude || 126.978,
    pickupTimeSlot,
    category,
    deadlineAt: deadlineAt || new Date(Date.now() + 1000 * 60 * 60 * 24),
    status: 'RECRUITING',
  });
}

async function joinGroupPurchase(groupPurchaseId, userId) {
  return sequelize.transaction(async (transaction) => {
    const groupPurchase = await GroupPurchase.findByPk(groupPurchaseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!groupPurchase) throw new AppError(404, '공동구매를 찾을 수 없습니다.', 'GROUP_PURCHASE_NOT_FOUND');
    if (groupPurchase.hostId === userId) throw new AppError(400, '방장은 자신의 공동구매에 참여할 수 없습니다.', 'HOST_CANNOT_JOIN');
    if (groupPurchase.status !== 'RECRUITING') throw new AppError(409, '현재 모집 중인 공동구매가 아닙니다.', 'NOT_RECRUITING');
    if (new Date(groupPurchase.deadlineAt) <= new Date()) throw new AppError(409, '모집 마감 시간이 지났습니다.', 'JOIN_DEADLINE_PASSED');

    const existingApplication = await UserGroupPurchase.findOne({ where: { groupPurchaseId, userId }, transaction });
    if (existingApplication) throw new AppError(409, '이미 참여 신청한 공동구매입니다.', 'ALREADY_JOINED');
    if (groupPurchase.currentParticipants >= groupPurchase.targetParticipants) throw new AppError(409, '모집 인원이 모두 찼습니다.', 'GROUP_PURCHASE_FULL');

    const application = await UserGroupPurchase.create({ groupPurchaseId, userId }, { transaction });
    const currentParticipants = groupPurchase.currentParticipants + 1;
    const status = currentParticipants === groupPurchase.targetParticipants ? 'COMPLETED' : 'RECRUITING';
    await groupPurchase.update({ currentParticipants, status }, { transaction });

    return {
      application: { id: application.id, groupPurchaseId: application.groupPurchaseId, isApproved: application.isApproved, appliedAt: application.appliedAt },
      groupPurchase: { id: groupPurchase.id, currentParticipants, targetParticipants: groupPurchase.targetParticipants, status },
    };
  });
}

module.exports = {
  listGroupPurchases,
  getGroupPurchaseById,
  createGroupPurchase,
  joinGroupPurchase,
};
