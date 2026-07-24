const ApiError = require('./apiError');

// 카카오 오픈채팅 링크 패턴만 검증한다 (기획서 11번 — 그 이상 유효성은 확인하지 않음).
const OPEN_CHAT_URL_PATTERN = /^https?:\/\/open\.kakao\.com\//;

// 마이그레이션의 varchar 한도와 같은 값을 앱에서도 강제한다. 앱이 먼저 막지 않으면
// Postgres가 거절하면서 500 + DB 에러 원문("character varying(100) 자료형에 너무 긴
// 자료를...")이 그대로 클라이언트까지 나간다. 컬럼 길이를 바꾸면 여기도 같이 바꿔야 한다.
// (open_chat_url·description은 text라 한도가 없으므로 목록에 없다.)
const MAX_LENGTHS = {
  title: 100,
  category: 30,
  regionSido: 20,
  regionSigungu: 20,
  regionEupmyeondong: 20,
};

function checkMaxLength(value, field) {
  const max = MAX_LENGTHS[field];
  // 문자 수로 센다. JS의 .length는 UTF-16 코드유닛 수라서 이모지 같은 서로게이트 페어를
  // 2로 세는데, Postgres varchar(n)은 코드포인트를 1로 센다. .length로 재면 사용자가 보기엔
  // 60자인 제목이 "100자 초과"로 거절된다. 전개 연산자는 코드포인트 단위로 쪼갠다.
  if (max !== undefined && [...value].length > max) {
    throw new ApiError('VALIDATION_ERROR', `${field}는(은) ${max}자를 넘을 수 없습니다`);
  }
  return value;
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('VALIDATION_ERROR', `${field}는(은) 필수입니다`);
  }
  return checkMaxLength(value.trim(), field);
}

// POST /api/meetings 요청 본문을 검증하고, DB에 넣을 정규화된 값으로 변환한다.
// type별 분기(flash/small)는 DB CHECK 제약과 동일한 규칙을 앱 레벨에서도 강제한다.
function validateCreateMeeting(body = {}) {
  const type = body.type;
  if (type !== 'flash' && type !== 'small') {
    throw new ApiError('VALIDATION_ERROR', "type은 'flash' 또는 'small'이어야 합니다");
  }

  const title = requireString(body.title, 'title');
  const category = requireString(body.category, 'category');
  const regionSido = requireString(body.regionSido, 'regionSido');
  const regionSigungu = requireString(body.regionSigungu, 'regionSigungu');
  const openChatUrl = requireString(body.openChatUrl, 'openChatUrl');

  if (!OPEN_CHAT_URL_PATTERN.test(openChatUrl)) {
    throw new ApiError('VALIDATION_ERROR', 'openChatUrl은 카카오 오픈채팅 링크여야 합니다');
  }

  const startAt = body.startAt ? new Date(body.startAt) : null;
  if (!startAt || Number.isNaN(startAt.getTime())) {
    throw new ApiError('VALIDATION_ERROR', 'startAt이 올바른 날짜가 아닙니다');
  }

  let capacity = null;
  let endAt = null;

  if (type === 'flash') {
    // flash: capacity 필수(양의 정수), endAt은 무시하고 null로 저장.
    if (!Number.isInteger(body.capacity) || body.capacity <= 0) {
      throw new ApiError('VALIDATION_ERROR', 'flash 모임은 capacity(양의 정수)가 필요합니다');
    }
    capacity = body.capacity;
    endAt = null;
  } else {
    // small: capacity 무시(null 강제), endAt 필수.
    const parsedEnd = body.endAt ? new Date(body.endAt) : null;
    if (!parsedEnd || Number.isNaN(parsedEnd.getTime())) {
      throw new ApiError('VALIDATION_ERROR', 'small 모임은 endAt(종료 일시)이 필요합니다');
    }
    capacity = null;
    endAt = parsedEnd;
  }

  return {
    type,
    title,
    category,
    description: typeof body.description === 'string' ? body.description : null,
    regionSido,
    regionSigungu,
    regionEupmyeondong:
      typeof body.regionEupmyeondong === 'string' && body.regionEupmyeondong.trim() !== ''
        ? checkMaxLength(body.regionEupmyeondong.trim(), 'regionEupmyeondong')
        : null,
    startAt,
    endAt,
    capacity,
    adultOnly: body.adultOnly === true,
    openChatUrl,
  };
}

// PATCH /api/meetings/:id (E4). type은 불변이므로 기존 type과 다르면 거부하고,
// 그 외에는 등록과 동일한 전체 검증을 재사용한다.
function validateUpdateMeeting(body = {}, existingType) {
  if (body.type !== existingType) {
    throw new ApiError('VALIDATION_ERROR', '모임 유형은 변경할 수 없습니다');
  }
  return validateCreateMeeting(body);
}

// PATCH /api/users/me 의 birthDate 검증. 형식 + 실제 달력 날짜 + 미래 아님.
// 형식만 맞고 존재하지 않는 날짜(2001-02-30 등)를 걸러내려고 UTC로 되짚어 확인한다.
function validateBirthDate(body = {}) {
  const value = body.birthDate;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError('VALIDATION_ERROR', 'birthDate는 YYYY-MM-DD 형식이어야 합니다');
  }

  const [year, month, day] = value.split('-').map(Number);
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  if (
    asUtc.getUTCFullYear() !== year ||
    asUtc.getUTCMonth() !== month - 1 ||
    asUtc.getUTCDate() !== day
  ) {
    throw new ApiError('VALIDATION_ERROR', '올바른 날짜가 아닙니다');
  }

  if (asUtc.getTime() > Date.now()) {
    throw new ApiError('VALIDATION_ERROR', '생년월일은 미래일 수 없습니다');
  }

  return value;
}

// PATCH /api/meetings/:id/participants/:userId 의 본문 검증(F4).
// pending으로 되돌리는 것은 허용하지 않는다 — 승인/거절은 단방향이다(설계서 D5).
const RESPOND_STATUSES = ['approved', 'rejected'];

function validateRespondStatus(body) {
  const status = body && body.status;
  if (!RESPOND_STATUSES.includes(status)) {
    throw new ApiError('VALIDATION_ERROR', 'status는 approved 또는 rejected여야 합니다');
  }
  return status;
}

module.exports = {
  validateCreateMeeting,
  validateUpdateMeeting,
  validateBirthDate,
  validateRespondStatus,
  OPEN_CHAT_URL_PATTERN,
};
