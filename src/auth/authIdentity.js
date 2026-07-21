export const USERNAME_HINT = "영문, 숫자, 점(.), 밑줄(_), 하이픈(-) 3~30자";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function usernameToAuthEmail(value) {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(`아이디는 ${USERNAME_HINT}로 입력해 주세요.`);
  }
  return `${username}@uniradar-login.app`;
}

export function getUsernameFromUser(user) {
  const username = normalizeUsername(user?.user_metadata?.username);
  return USERNAME_PATTERN.test(username) ? username : "사용자";
}