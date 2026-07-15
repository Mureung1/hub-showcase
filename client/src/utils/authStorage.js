const accountRolesKey = "mentoring.accountRoles";
const currentUserRoleKey = "mentoring.currentUserRole";
const supportedRoles = new Set(["mentee", "mentor"]);

const normalizeEmail = (email) => email.trim().toLowerCase();

export function registerAccountRole(email, role) {
  if (!email || !supportedRoles.has(role)) return;

  try {
    const savedRoles = JSON.parse(window.localStorage.getItem(accountRolesKey) ?? "{}");
    savedRoles[normalizeEmail(email)] = role;
    window.localStorage.setItem(accountRolesKey, JSON.stringify(savedRoles));
  } catch {
    // 실제 인증 API가 연결되기 전까지 브라우저 저장소를 임시 계정 저장소로 사용합니다.
  }
}

export function getAccountRole(email) {
  if (!email) return null;

  try {
    const savedRoles = JSON.parse(window.localStorage.getItem(accountRolesKey) ?? "{}");
    const role = savedRoles[normalizeEmail(email)];
    return supportedRoles.has(role) ? role : null;
  } catch {
    return null;
  }
}

export function setCurrentUserRole(role) {
  if (!supportedRoles.has(role)) return;
  window.sessionStorage.setItem(currentUserRoleKey, role);
}

export function getCurrentUserRole() {
  const role = window.sessionStorage.getItem(currentUserRoleKey);
  return supportedRoles.has(role) ? role : null;
}

export function clearCurrentUserRole() {
  window.sessionStorage.removeItem(currentUserRoleKey);
}
