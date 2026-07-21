class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

const requireString = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} 값을 확인해 주세요.`, field);
  }
  return value;
};

const requireStringArray = (value, field, { min, max } = {}) => {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    throw new ValidationError(`${field} 값을 확인해 주세요.`, field);
  }
  if (min !== undefined && value.length < min) {
    throw new ValidationError(`${field}는 ${min}개 이상이어야 합니다.`, field);
  }
  if (max !== undefined && value.length > max) {
    throw new ValidationError(`${field}는 ${max}개 이하여야 합니다.`, field);
  }
  return value;
};

module.exports = { ValidationError, requireString, requireStringArray };
