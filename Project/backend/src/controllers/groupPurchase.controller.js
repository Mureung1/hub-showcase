const {
  listGroupPurchases,
  getGroupPurchaseById,
  getMyGroupPurchaseActivities,
  createGroupPurchase,
  joinGroupPurchase,
  cancelGroupPurchaseJoin,
  updateGroupPurchaseStatus,
  markGroupPurchasePayment,
  confirmGroupPurchasePayment,
  markGroupPurchaseReceipt,
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
    const data = await getGroupPurchaseById(id, req.user?.id);
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const groupPurchaseId = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isSafeInteger(groupPurchaseId) || groupPurchaseId < 1 || !status) {
      throw new AppError(400, '올바른 공동구매 ID와 상태가 필요합니다.', 'VALIDATION_ERROR');
    }
    const data = await updateGroupPurchaseStatus(groupPurchaseId, req.user.id, status);
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function receive(req, res, next) {
  try {
    const groupPurchaseId = Number(req.params.id);
    if (!Number.isSafeInteger(groupPurchaseId) || groupPurchaseId < 1) {
      throw new AppError(400, '올바른 공동구매 ID가 필요합니다.', 'VALIDATION_ERROR');
    }
    const data = await markGroupPurchaseReceipt(groupPurchaseId, req.user.id);
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function payment(req, res, next) {
  try {
    const groupPurchaseId = Number(req.params.id);
    if (!Number.isSafeInteger(groupPurchaseId) || groupPurchaseId < 1) {
      throw new AppError(400, '올바른 공동구매 ID가 필요합니다.', 'VALIDATION_ERROR');
    }
    const data = await markGroupPurchasePayment(groupPurchaseId, req.user.id);
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function confirmPayment(req, res, next) {
  try {
    const groupPurchaseId = Number(req.params.id);
    const applicationId = Number(req.params.applicationId);
    if (!Number.isSafeInteger(groupPurchaseId) || groupPurchaseId < 1 || !Number.isSafeInteger(applicationId) || applicationId < 1) {
      throw new AppError(400, '올바른 공동구매와 참여 내역 ID가 필요합니다.', 'VALIDATION_ERROR');
    }
    const data = await confirmGroupPurchasePayment(groupPurchaseId, req.user.id, applicationId);
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

async function mine(req, res, next) {
  try {
    const data = await getMyGroupPurchaseActivities(req.user.id);
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
      imageUrl,
      imageUrls,
      totalPrice,
      targetParticipants,
      pickupLatitude,
      pickupLongitude,
      pickupPlace,
      pickupDetailAddress,
      pickupTimeSlot,
      paymentAccount,
      category,
      deadlineAt,
    } = req.body;

    const parsedTotalPrice = Number(totalPrice);
    const parsedTargetParticipants = Number(targetParticipants);
    const normalizedImageUrls = Array.isArray(imageUrls) ? imageUrls : imageUrl ? [imageUrl] : [];

    if (
      !title ||
      !productUrl ||
      normalizedImageUrls.length < 1 ||
      normalizedImageUrls.length > 5 ||
      normalizedImageUrls.some((url) => typeof url !== 'string' || !url) ||
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
      imageUrl: normalizedImageUrls[0],
      imageUrls: normalizedImageUrls,
      totalPrice: parsedTotalPrice,
      targetParticipants: parsedTargetParticipants,
      pickupLatitude,
      pickupLongitude,
      pickupPlace,
      pickupDetailAddress,
      pickupTimeSlot,
      paymentAccount,
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

async function cancelJoin(req, res, next) {
  try {
    const groupPurchaseId = Number(req.params.id);
    if (!Number.isSafeInteger(groupPurchaseId) || groupPurchaseId < 1) {
      throw new AppError(400, '올바른 공동구매 ID가 필요합니다.', 'VALIDATION_ERROR');
    }
    const data = await cancelGroupPurchaseJoin(groupPurchaseId, req.user.id);
    return res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  get,
  mine,
  create,
  join,
  cancelJoin,
  updateStatus,
  payment,
  confirmPayment,
  receive,
};
