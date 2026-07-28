const cron = require('node-cron');
const { Op } = require('sequelize');
const { GroupPurchase, UserGroupPurchase, sequelize } = require('../models');
const { notifyParticipantsOfStatus } = require('../services/notification.service');

async function processExpiredGroupPurchases(now = new Date()) {
  const failedIds = await sequelize.transaction(async (transaction) => {
    const purchases = await GroupPurchase.findAll({
      where: { status: 'RECRUITING', deadlineAt: { [Op.lte]: now } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    await Promise.all(purchases.map(async (purchase) => {
      await purchase.update({ status: 'FAILED' }, { transaction });
      await UserGroupPurchase.update({ isApproved: false, isPaid: false }, { where: { groupPurchaseId: purchase.id }, transaction });
    }));
    return purchases.map((purchase) => purchase.id);
  });
  await Promise.all(failedIds.map((id) => notifyParticipantsOfStatus(id, 'FAILED')));
  return failedIds;
}

function startDeadlineScheduler() {
  return cron.schedule('0 * * * *', () => {
    processExpiredGroupPurchases().catch((error) => console.error('[scheduler] deadline processing failed:', error));
  });
}

module.exports = { processExpiredGroupPurchases, startDeadlineScheduler };
