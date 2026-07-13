const STATUS_BY_CODE = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SUSPENDED: 403,
};

class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code] || 500;
  }
}

module.exports = ApiError;
