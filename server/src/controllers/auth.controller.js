const authService = require('../services/auth.service');

const handleError = (res, err) => {
  if (err instanceof authService.ValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: { field: err.field },
      },
    });
  }
  if (err instanceof authService.ConflictError) {
    return res.status(409).json({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: err.message,
        details: {},
      },
    });
  }
  if (err instanceof authService.AuthError) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: err.message,
        details: {},
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
      details: {},
    },
  });
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

module.exports = {
  login,
  logout,
  signupMentee,
  signupMentor,
};
