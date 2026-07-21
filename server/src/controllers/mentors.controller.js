const mentorProfileService = require('../services/mentorProfile.service');
const mentorsService = require('../services/mentors.service');
const { sendError } = require('../utils/apiError');
const { ValidationError } = require('../utils/validators');

const getMentors = async (req, res) => {
  try {
    const { query, researchField, counselingField, major, academicStatus, lab } = req.query;
    const mentors = await mentorsService.listMentors({
      query,
      researchField,
      counselingField,
      major,
      academicStatus,
      lab,
    });

    return res.json({
      data: mentors,
      meta: { total: mentors.length },
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const getMentorById = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const mentor = await mentorsService.getMentorDetail(mentorId);

    if (!mentor) {
      return sendError(res, 404, 'MENTOR_NOT_FOUND', '멘토 정보를 찾을 수 없습니다.');
    }

    return res.json({ data: mentor });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const getMyMentorProfile = async (req, res) => {
  try {
    const profile = await mentorProfileService.getMyProfile(req.user);
    return res.json({ data: profile });
  } catch (err) {
    return sendError(res, 404, 'MENTOR_PROFILE_NOT_FOUND', '멘토 프로필을 찾을 수 없습니다.');
  }
};

const updateMyMentorProfile = async (req, res) => {
  try {
    const profile = await mentorProfileService.updateMyProfile(req.user, req.body);
    return res.json({ data: profile });
  } catch (err) {
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

module.exports = {
  getMentorById,
  getMentors,
  getMyMentorProfile,
  updateMyMentorProfile,
};
