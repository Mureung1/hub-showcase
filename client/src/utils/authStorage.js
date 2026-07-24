const accessTokenKey = "mentoring.accessToken";
const refreshTokenKey = "mentoring.refreshToken";

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

export function setRefreshToken(token) {
  if (!token) return;
  window.sessionStorage.setItem(refreshTokenKey, token);
}

export function getRefreshToken() {
  return window.sessionStorage.getItem(refreshTokenKey);
}

export function clearRefreshToken() {
  window.sessionStorage.removeItem(refreshTokenKey);
}
