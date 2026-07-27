const applicationsService = require('../services/applications.service');
const { sendError } = require('../utils/apiError');
const { ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { ValidationError } = require('../utils/validators');

const createApplication = async (req, res) => {
  if (req.user.role !== 'mentee') {
    return sendError(res, 403, 'FORBIDDEN', '멘티만 면담을 신청할 수 있습니다.');
  }

  try {
    const application = await applicationsService.createApplication(req.user.id, req.body ?? {});
    return res.status(201).json({ data: application });
  } catch (err) {
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const getApplications = async (req, res) => {
  const { status } = req.query;

  try {
    if (req.user.role === 'mentee') {
      const menteeApplications = await applicationsService.listApplicationsForMentee(
        req.user.id,
        status,
      );

      return res.json({
        data: menteeApplications,
        meta: { total: menteeApplications.length },
      });
    }

    if (req.user.role === 'mentor') {
      const mentorApplications = await applicationsService.listApplicationsForMentor(
        req.user.id,
        status,
      );

      return res.json({
        data: mentorApplications,
        meta: { total: mentorApplications.length },
      });
    }

    return sendError(res, 403, 'FORBIDDEN', '면담 신청 목록을 조회할 권한이 없습니다.');
  } catch (err) {
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const acceptApplication = async (req, res) => {
  if (req.user.role !== 'mentor') {
    return sendError(res, 403, 'FORBIDDEN', '멘토만 면담 신청을 수락할 수 있습니다.');
  }

  try {
    const result = await applicationsService.acceptApplication(
      req.user.id,
      req.params.applicationId,
    );
    return res.json({ data: result });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', err.message);
    }
    if (err instanceof ForbiddenError) {
      return sendError(res, 403, 'FORBIDDEN', err.message);
    }
    if (err instanceof ConflictError) {
      return sendError(res, 409, err.code, err.message);
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const rejectApplication = async (req, res) => {
  if (req.user.role !== 'mentor') {
    return sendError(res, 403, 'FORBIDDEN', '멘토만 면담 신청을 거부할 수 있습니다.');
  }

  try {
    const result = await applicationsService.rejectApplication(
      req.user.id,
      req.params.applicationId,
    );
    return res.json({ data: result });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', err.message);
    }
    if (err instanceof ForbiddenError) {
      return sendError(res, 403, 'FORBIDDEN', err.message);
    }
    if (err instanceof ConflictError) {
      return sendError(res, 409, err.code, err.message);
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const completeApplication = async (req, res) => {
  if (req.user.role !== 'mentee') {
    return sendError(res, 403, 'FORBIDDEN', '멘티만 면담을 완료 처리할 수 있습니다.');
  }

  try {
    const result = await applicationsService.completeApplication(
      req.user.id,
      req.params.applicationId,
    );
    return res.json({ data: result });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', err.message);
    }
    if (err instanceof ForbiddenError) {
      return sendError(res, 403, 'FORBIDDEN', err.message);
    }
    if (err instanceof ConflictError) {
      return sendError(res, 409, err.code, err.message);
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

module.exports = {
  acceptApplication,
  completeApplication,
  createApplication,
  getApplications,
  rejectApplication,
};
