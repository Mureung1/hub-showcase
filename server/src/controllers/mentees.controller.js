const menteeProfileService = require('../services/menteeProfile.service');
const onboardingService = require('../services/onboarding.service');
const { sendError } = require('../utils/apiError');
const { ConflictError } = require('../utils/errors');
const { ValidationError } = require('../utils/validators');

const getMyMenteeProfile = async (req, res) => {
  try {
    const profile = await menteeProfileService.getMyProfile(req.user);
    return res.json({ data: profile });
  } catch (err) {
    return sendError(res, 404, 'MENTEE_PROFILE_NOT_FOUND', '멘티 프로필을 찾을 수 없습니다.');
  }
};

const updateMyMenteeProfile = async (req, res) => {
  try {
    const profile = await menteeProfileService.updateMyProfile(req.user, req.body);
    return res.json({ data: profile });
  } catch (err) {
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
    }
    if (err instanceof ConflictError) {
      return sendError(res, 409, 'EMAIL_ALREADY_EXISTS', err.message, { field: 'email' });
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const completeMyOnboarding = async (req, res) => {
  try {
    const status = await onboardingService.completeOnboarding(req.user, req.body);
    return res.json({ data: status });
  } catch (err) {
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

module.exports = {
  getMyMenteeProfile,
  updateMyMenteeProfile,
  completeMyOnboarding,
};
