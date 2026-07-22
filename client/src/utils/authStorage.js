const accessTokenKey = "mentoring.accessToken";

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
