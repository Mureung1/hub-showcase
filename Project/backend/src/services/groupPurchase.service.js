const { GroupPurchase, UserGroupPurchase, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/appError');
const { notifyParticipantsOfStatus } = require('./notification.service');

async function listGroupPurchases(filters = {}) {
  const where = {};
  if (filters.category) {
    where.category = filters.category;
  }
  // Public feeds only show purchases that are still open for recruitment.
  // Closed purchases remain available through the authenticated user's activity page.
  where.status = filters.status || 'RECRUITING';
  if (!filters.status || filters.status === 'RECRUITING') {
    where.deadlineAt = { [Op.gt]: new Date() };
  }
  return await GroupPurchase.findAll({
    where,
    include: [{ model: User, as: 'host', attributes: ['id', 'nickname', 'mannerTemperature'] }],
    order: [['createdAt', 'DESC']],
  });
}

async function getGroupPurchaseById(id, viewerId = null) {
  const groupPurchase = await GroupPurchase.findByPk(id, {
    include: [{ model: User, as: 'host', attributes: ['id', 'nickname', 'mannerTemperature', 'noShowCount'] }],
  });
  if (!groupPurchase) {
    throw new AppError(404, '공동구매를 찾을 수 없습니다.', 'GROUP_PURCHASE_NOT_FOUND');
  }
  const data = groupPurchase.toJSON();
  if (!viewerId) {
    return { ...data, viewer: null };
  }

  const application = await UserGroupPurchase.findOne({ where: { groupPurchaseId: id, userId: viewerId } });
  return {
    ...data,
    viewer: {
      isHost: data.hostId === viewerId,
      application: application
        ? { id: application.id, isReceived: application.isReceived, isPaid: application.isPaid }
        : null,
    },
  };
}

async function getMyGroupPurchaseActivities(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'nickname', 'mannerTemperature', 'noShowCount'],
  });
  if (!user) {
    throw new AppError(404, '사용자를 찾을 수 없습니다.', 'USER_NOT_FOUND');
  }

  const hosted = await GroupPurchase.findAll({
    where: { hostId: userId },
    include: [{ model: User, as: 'host', attributes: ['id', 'nickname', 'mannerTemperature'] }],
    order: [['createdAt', 'DESC']],
  });
  const applications = await UserGroupPurchase.findAll({
    where: { userId },
    include: [{
      model: GroupPurchase,
      include: [{ model: User, as: 'host', attributes: ['id', 'nickname', 'mannerTemperature'] }],
    }],
    order: [['appliedAt', 'DESC']],
  });

  const joined = applications.map((application) => {
    const groupPurchase = application.GroupPurchase.toJSON();
    return {
      ...groupPurchase,
      application: {
        id: application.id,
        isApproved: application.isApproved,
        isPaid: application.isPaid,
        appliedAt: application.appliedAt,
      },
    };
  });

  return { user, hosted, joined };
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
    pickupPlace,
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
    pickupPlace,
    pickupTimeSlot,
    category,
    deadlineAt: deadlineAt || new Date(Date.now() + 1000 * 60 * 60 * 24),
    status: 'RECRUITING',
  });
}

async function joinGroupPurchase(groupPurchaseId, userId) {
  const result = await sequelize.transaction(async (transaction) => {
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
  if (result.groupPurchase.status === 'COMPLETED') {
    await notifyParticipantsOfStatus(groupPurchaseId, 'COMPLETED');
  }
  return result;
}

async function cancelGroupPurchaseJoin(groupPurchaseId, userId) {
  return sequelize.transaction(async (transaction) => {
    const groupPurchase = await GroupPurchase.findByPk(groupPurchaseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!groupPurchase) {
      throw new AppError(404, '공동구매를 찾을 수 없습니다.', 'GROUP_PURCHASE_NOT_FOUND');
    }
    if (groupPurchase.status !== 'RECRUITING') {
      throw new AppError(409, '모집 완료 후에는 참여를 취소할 수 없습니다.', 'CANNOT_CANCEL_COMPLETED');
    }

    const application = await UserGroupPurchase.findOne({
      where: { groupPurchaseId, userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!application) {
      throw new AppError(404, '참여 내역을 찾을 수 없습니다.', 'JOIN_NOT_FOUND');
    }

    await application.destroy({ transaction });
    const currentParticipants = Math.max(groupPurchase.currentParticipants - 1, 0);
    await groupPurchase.update({ currentParticipants, status: 'RECRUITING' }, { transaction });

    return {
      cancelledApplication: { id: application.id, groupPurchaseId, userId },
      groupPurchase: {
        id: groupPurchase.id,
        currentParticipants,
        targetParticipants: groupPurchase.targetParticipants,
        status: 'RECRUITING',
      },
    };
  });
}

const nextStatuses = {
  COMPLETED: 'ORDERED',
  ORDERED: 'WAITING_PICKUP',
  WAITING_PICKUP: 'FINISHED',
};

async function updateGroupPurchaseStatus(groupPurchaseId, hostId, nextStatus) {
  const result = await sequelize.transaction(async (transaction) => {
    const groupPurchase = await GroupPurchase.findByPk(groupPurchaseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!groupPurchase) {
      throw new AppError(404, '공동구매를 찾을 수 없습니다.', 'GROUP_PURCHASE_NOT_FOUND');
    }
    if (groupPurchase.hostId !== hostId) {
      throw new AppError(403, '방장만 공동구매 상태를 변경할 수 있습니다.', 'HOST_ONLY');
    }
    if (nextStatuses[groupPurchase.status] !== nextStatus) {
      throw new AppError(409, '현재 상태에서는 다음 단계로만 변경할 수 있습니다.', 'INVALID_STATUS_TRANSITION');
    }
    if (nextStatus === 'FINISHED') {
      const notReceivedCount = await UserGroupPurchase.count({
        where: { groupPurchaseId, isReceived: false },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (notReceivedCount > 0) {
        throw new AppError(409, '모든 참여자의 수령 완료 후 공구를 마감할 수 있습니다.', 'PARTICIPANTS_NOT_RECEIVED');
      }
    }

    await groupPurchase.update({ status: nextStatus }, { transaction });
    return { id: groupPurchase.id, status: groupPurchase.status };
  });
  await notifyParticipantsOfStatus(groupPurchaseId, nextStatus);
  return result;
}

async function markGroupPurchaseReceipt(groupPurchaseId, userId) {
  return sequelize.transaction(async (transaction) => {
    const groupPurchase = await GroupPurchase.findByPk(groupPurchaseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!groupPurchase) {
      throw new AppError(404, '공동구매를 찾을 수 없습니다.', 'GROUP_PURCHASE_NOT_FOUND');
    }
    if (groupPurchase.status !== 'WAITING_PICKUP') {
      throw new AppError(409, '픽업 대기 상태에서만 수령 완료를 표시할 수 있습니다.', 'NOT_WAITING_PICKUP');
    }
    const application = await UserGroupPurchase.findOne({
      where: { groupPurchaseId, userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!application) {
      throw new AppError(404, '참여 내역을 찾을 수 없습니다.', 'JOIN_NOT_FOUND');
    }

    await application.update({ isReceived: true }, { transaction });
    return { id: application.id, groupPurchaseId, isReceived: application.isReceived };
  });
}

module.exports = {
  listGroupPurchases,
  getGroupPurchaseById,
  getMyGroupPurchaseActivities,
  createGroupPurchase,
  joinGroupPurchase,
  cancelGroupPurchaseJoin,
  updateGroupPurchaseStatus,
  markGroupPurchaseReceipt,
};
