export const USER_PROFILE_STORAGE_KEY = "uniradar.userProfile";

const PROFILE_LIMITS = Object.freeze({
  availableHoursPerWeek: { min: 0, max: 168 },
  gpa: { min: 0, max: 4.5 },
  grade: { min: 1, max: 8 },
  incomeBracket: { min: 1, max: 10 },
});

function getBrowserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(",");
  return Array.from(new Set(values.map(asString).filter(Boolean)));
}

function asNullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function asNullableBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function normalizeLanguageScores(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const score = asObject(entry);
    const type = asString(score.type);
    const valueText = asString(score.score);
    return type && valueText ? [{ type, score: valueText }] : [];
  });
}

function createProfileId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId
    ? `profile-${randomId}`
    : `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeUpdatedAt(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? new Date(value).toISOString()
    : new Date().toISOString();
}

export function createEmptyProfileDraft() {
  return {
    school: "",
    grade: "",
    majors: "",
    interests: "",
    regions: "",
    canJoinTeam: null,
    availableHoursPerWeek: "",
    gpa: "",
    incomeBracket: "",
    languageScores: [{ type: "", score: "" }],
  };
}

export function profileToDraft(profile) {
  if (!profile) {
    return createEmptyProfileDraft();
  }

  return {
    school: profile.school || "",
    grade: profile.grade ?? "",
    majors: (profile.majors || []).join(", "),
    interests: (profile.interests || []).join(", "),
    regions: (profile.regions || []).join(", "),
    canJoinTeam: asNullableBoolean(profile.canJoinTeam),
    availableHoursPerWeek: profile.availableHoursPerWeek ?? "",
    gpa: profile.gpa ?? "",
    incomeBracket: profile.incomeBracket ?? "",
    languageScores: profile.languageScores?.length
      ? profile.languageScores.map((score) => ({ ...score }))
      : [{ type: "", score: "" }],
  };
}

export function createUserProfileFromDraft(draft, existingProfile = null) {
  const input = asObject(draft);

  return {
    id: asString(existingProfile?.id) || createProfileId(),
    updatedAt: new Date().toISOString(),
    school: asString(input.school),
    grade: asNullableNumber(input.grade),
    majors: asStringArray(input.majors),
    interests: asStringArray(input.interests),
    regions: asStringArray(input.regions),
    canJoinTeam: asNullableBoolean(input.canJoinTeam),
    availableHoursPerWeek: asNullableNumber(input.availableHoursPerWeek),
    gpa: asNullableNumber(input.gpa),
    incomeBracket: asNullableNumber(input.incomeBracket),
    languageScores: normalizeLanguageScores(input.languageScores),
  };
}

export function normalizeUserProfile(value) {
  const input = asObject(value);

  if (!Object.keys(input).length) {
    return null;
  }

  return {
    id: asString(input.id) || createProfileId(),
    updatedAt: normalizeUpdatedAt(input.updatedAt),
    school: asString(input.school),
    grade: asNullableNumber(input.grade),
    majors: asStringArray(input.majors),
    interests: asStringArray(input.interests),
    regions: asStringArray(input.regions),
    canJoinTeam: asNullableBoolean(input.canJoinTeam),
    availableHoursPerWeek: asNullableNumber(input.availableHoursPerWeek),
    gpa: asNullableNumber(input.gpa),
    incomeBracket: asNullableNumber(input.incomeBracket),
    languageScores: normalizeLanguageScores(input.languageScores),
  };
}

function isNumberWithin(value, limits, { integer = false } = {}) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    (!integer || Number.isInteger(value)) &&
    value >= limits.min &&
    value <= limits.max;
}

export function validateUserProfile(profile) {
  const errors = [];

  if (!profile?.school) errors.push("학교를 입력해 주세요.");
  if (!isNumberWithin(profile?.grade, PROFILE_LIMITS.grade, { integer: true })) {
    errors.push("학년은 1~8 사이의 정수로 입력해 주세요.");
  }
  if (!profile?.majors?.length) errors.push("전공을 하나 이상 입력해 주세요.");
  if (!profile?.interests?.length) errors.push("관심 분야를 하나 이상 입력해 주세요.");
  if (!profile?.regions?.length) errors.push("활동 가능 지역을 하나 이상 입력해 주세요.");
  if (typeof profile?.canJoinTeam !== "boolean") {
    errors.push("팀 참여 가능 여부를 선택해 주세요.");
  }

  if (
    profile?.availableHoursPerWeek !== null &&
    !isNumberWithin(profile.availableHoursPerWeek, PROFILE_LIMITS.availableHoursPerWeek)
  ) {
    errors.push("주당 활동 가능 시간은 0~168시간으로 입력해 주세요.");
  }

  if (profile?.gpa !== null && !isNumberWithin(profile.gpa, PROFILE_LIMITS.gpa)) {
    errors.push("학점은 0~4.5 사이로 입력해 주세요.");
  }

  if (
    profile?.incomeBracket !== null &&
    !isNumberWithin(profile.incomeBracket, PROFILE_LIMITS.incomeBracket, { integer: true })
  ) {
    errors.push("소득분위는 1~10 사이의 정수로 입력해 주세요.");
  }

  return { errors, valid: errors.length === 0 };
}

export function readUserProfile(storage = getBrowserStorage()) {
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(USER_PROFILE_STORAGE_KEY);
    const profile = rawValue ? normalizeUserProfile(JSON.parse(rawValue)) : null;
    return profile && validateUserProfile(profile).valid ? profile : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile, storage = getBrowserStorage()) {
  if (!storage) {
    throw new Error("브라우저 저장소를 사용할 수 없습니다.");
  }

  const normalizedProfile = normalizeUserProfile(profile);
  const validation = validateUserProfile(normalizedProfile);

  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  storage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
  return normalizedProfile;
}

export function clearUserProfile(storage = getBrowserStorage()) {
  try {
    storage?.removeItem(USER_PROFILE_STORAGE_KEY);
  } catch {
    // Storage failures should not stop the dashboard.
  }
}
