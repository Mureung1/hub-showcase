const messagesService = require('../services/messages.service');
const { sendError } = require('../utils/apiError');
const { ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { ValidationError } = require('../utils/validators');

const listMessages = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const result = await messagesService.listMessages(req.user.id, req.params.applicationId, {
      cursor,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', err.message);
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

const createMessage = async (req, res) => {
  try {
    const message = await messagesService.createMessage(
      req.user.id,
      req.params.applicationId,
      req.body?.body,
    );
    return res.status(201).json({ data: message });
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
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const result = await messagesService.markMessagesAsRead(req.user.id, req.params.applicationId);
    return res.json({ data: result });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', err.message);
    }
    if (err instanceof ForbiddenError) {
      return sendError(res, 403, 'FORBIDDEN', err.message);
    }

    console.error(err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
};

module.exports = { createMessage, listMessages, markMessagesAsRead };
