class ConflictError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

class NotFoundError extends Error {}

class ForbiddenError extends Error {}

module.exports = { ConflictError, NotFoundError, ForbiddenError };
