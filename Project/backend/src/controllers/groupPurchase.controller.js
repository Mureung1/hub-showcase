const { joinGroupPurchase } = require('../services/groupPurchase.service');
const AppError = require('../utils/appError');

async function join(req, res, next) {
  try {
    const groupPurchaseId = Number(req.params.id);
    if (!Number.isSafeInteger(groupPurchaseId) || groupPurchaseId < 1) throw new AppError(400, '올바른 공동구매 ID가 필요합니다.', 'VALIDATION_ERROR');
    const data = await joinGroupPurchase(groupPurchaseId, req.user.id);
    return res.status(201).json({ success: true, data, error: null });
  } catch (err) { return next(err); }
}

module.exports = { join };
