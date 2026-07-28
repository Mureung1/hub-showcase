const { User } = require('../models');
const AppError = require('../utils/appError');

async function updateMyLocation(req, res, next) {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const baseAddress = typeof req.body.address === 'string' ? req.body.address.trim().slice(0, 255) : '';
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new AppError(400, '올바른 위도와 경도가 필요합니다.', 'VALIDATION_ERROR');
    }

    const user = await User.findByPk(req.user.id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.', 'USER_NOT_FOUND');
    await user.update({ baseLatitude: latitude, baseLongitude: longitude, baseAddress: baseAddress || null });
    return res.json({ success: true, data: { baseLatitude: user.baseLatitude, baseLongitude: user.baseLongitude, baseAddress: user.baseAddress }, error: null });
  } catch (error) {
    return next(error);
  }
}

module.exports = { updateMyLocation };
