// 로그인 정보 저장·조회·삭제 함수
const TOKEN_KEY = "calme_token";
const USER_KEY = "calme_user";

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const user = localStorage.getItem(USER_KEY);

  return user ? JSON.parse(user) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // 여기서 localStorage는 브라우저를 새로고침해도 값이 남아 있는 저장 공간이야.
}