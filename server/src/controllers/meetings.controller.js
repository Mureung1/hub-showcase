const meetingsService = require('../services/meetings.service');
const { sendError } = require('../utils/apiError');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const { ValidationError } = require('../utils/validators');

const updateMeeting = async (req, res) => {
  try {
    const meeting = await meetingsService.updateMeeting(
      req.user.id,
      req.params.meetingId,
      req.body ?? {},
    );
    return res.json({ data: meeting });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return sendError(res, 404, 'MEETING_NOT_FOUND', err.message);
    }
    if (err instanceof ForbiddenError) {
      return sendError(res, 403, 'FORBIDDEN', err.message);
    }
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

module.exports = { updateMeeting };
