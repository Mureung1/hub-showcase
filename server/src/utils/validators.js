const MIN_PASSWORD_LENGTH = 8;

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

const requireEmail = (value, field = 'email') => {
  requireString(value, field);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ValidationError('올바른 이메일 형식이 아닙니다.', field);
  }
  return value;
};

const SCHOOL_EMAIL_PATTERN = /\.ac\.kr$/i;

const requireSchoolEmail = (value, field = 'email') => {
  requireEmail(value, field);
  if (!SCHOOL_EMAIL_PATTERN.test(value.trim())) {
    throw new ValidationError('대학교 이메일(.ac.kr)로만 가입할 수 있습니다.', field);
  }
  return value;
};

const requirePassword = (value, field = 'password') => {
  requireString(value, field);
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
      field,
    );
  }
  return value;
};

const LAB_NAME_PATTERN = /^[^()]*[가-힣][^()]*\([^()]*[A-Za-z][^()]*\)$/;

const requireLabName = (value, field = 'lab') => {
  requireString(value, field);
  if (!LAB_NAME_PATTERN.test(value.trim())) {
    throw new ValidationError(
      '연구실은 "한글명(영문명)" 형식으로 입력해 주세요. 예: 인공지능 연구실(AI Lab)',
      field,
    );
  }
  return value;
};

module.exports = {
  ValidationError,
  SCHOOL_EMAIL_PATTERN,
  requireEmail,
  requireLabName,
  requirePassword,
  requireSchoolEmail,
  requireString,
  requireStringArray,
};
