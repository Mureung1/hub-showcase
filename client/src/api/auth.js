import api from './client.js';

// 실패 시 axios가 던지는 에러의 response.data.error를 그대로 위로 던져서
// 호출하는 쪽(AuthModal)이 { code, message }를 바로 꺼내 쓸 수 있게 한다.
function unwrap(promise) {
  return promise.then((res) => res.data.data).catch((err) => {
    throw err.response?.data?.error || { code: 'NETWORK_ERROR', message: '서버에 연결할 수 없어요.' };
  });
}

export function signup({ username, password, taste }) {
  return unwrap(api.post('/auth/signup', { username, password, taste }));
}

export function login({ username, password }) {
  return unwrap(api.post('/auth/login', { username, password }));
}
