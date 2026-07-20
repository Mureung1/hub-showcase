const {
  listGroupPurchases,
  getGroupPurchaseById,
  createGroupPurchase,
  joinGroupPurchase,
} = require('../services/groupPurchase.service');
const AppError = require('../utils/appError');

async function list(req, res, next) {
  try {
    const { category, status } = req.query;
    const data = await listGroupPurchases({ category, status });
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function get(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new AppError(400, '올바른 공동구매 ID가 필요합니다.', 'VALIDATION_ERROR');
    }
    const data = await getGroupPurchaseById(id);
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
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
    } = req.body;

    const parsedTotalPrice = Number(totalPrice);
    const parsedTargetParticipants = Number(targetParticipants);

    if (
      !title ||
      !productUrl ||
      !category ||
      !Number.isInteger(parsedTotalPrice) ||
      parsedTotalPrice <= 0 ||
      !Number.isInteger(parsedTargetParticipants) ||
      parsedTargetParticipants < 2
    ) {
      throw new AppError(400, '필수 항목이 누락되었습니다.', 'VALIDATION_ERROR');
    }

    const data = await createGroupPurchase({
      hostId: req.user.id,
      title,
      description,
      productUrl,
      totalPrice: parsedTotalPrice,
      targetParticipants: parsedTargetParticipants,
      pickupLatitude,
      pickupLongitude,
      pickupTimeSlot,
      category,
      deadlineAt,
    });

    return res.status(201).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function join(req, res, next) {
  try {
    const groupPurchaseId = Number(req.params.id);
    if (!Number.isSafeInteger(groupPurchaseId) || groupPurchaseId < 1) {
      throw new AppError(400, '올바른 공동구매 ID가 필요합니다.', 'VALIDATION_ERROR');
    }
    const data = await joinGroupPurchase(groupPurchaseId, req.user.id);
    return res.status(201).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  get,
  create,
  join,
};
