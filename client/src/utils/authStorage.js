const currentUserRoleKey = "mentoring.currentUserRole";
const accessTokenKey = "mentoring.accessToken";
const supportedRoles = new Set(["mentee", "mentor"]);

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

export function setAccessToken(token) {
  if (!token) return;
  window.sessionStorage.setItem(accessTokenKey, token);
}

export function getAccessToken() {
  return window.sessionStorage.getItem(accessTokenKey);
}

export function clearAccessToken() {
  window.sessionStorage.removeItem(accessTokenKey);
}
