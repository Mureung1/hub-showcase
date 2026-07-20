const authService = require('../services/auth.service');
const { sendError } = require('../utils/apiError');

const handleError = (res, err) => {
  if (err instanceof authService.ValidationError) {
    return sendError(res, 400, 'VALIDATION_ERROR', err.message, { field: err.field });
  }
  if (err instanceof authService.ConflictError) {
    return sendError(res, 409, 'EMAIL_ALREADY_EXISTS', err.message);
  }
  if (err instanceof authService.AuthError) {
    return sendError(res, 401, 'INVALID_CREDENTIALS', err.message);
  }

  console.error(err);
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
};

const signupMentee = async (req, res) => {
  try {
    const user = await authService.signupMentee(req.body);
    return res.status(201).json({ data: { user } });
  } catch (err) {
    return handleError(res, err);
  }
};

const signupMentor = async (req, res) => {
  try {
    const user = await authService.signupMentor(req.body);
    return res.status(201).json({ data: { user } });
  } catch (err) {
    return handleError(res, err);
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

const logout = async (req, res) => {
  try {
    await authService.logout(req.token);
    return res.status(204).send();
  } catch (err) {
    return handleError(res, err);
  }
};

const me = (req, res) => {
  return res.status(200).json({ data: req.user });
};

module.exports = {
  login,
  logout,
  me,
  signupMentee,
  signupMentor,
};
