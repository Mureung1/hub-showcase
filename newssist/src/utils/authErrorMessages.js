const KNOWN_MESSAGES = {
  'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다.',
  'User already registered': '이미 가입된 이메일입니다.',
  'Email not confirmed': '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
};

const DEFAULT_MESSAGE = '문제가 발생했습니다. 잠시 후 다시 시도해주세요.';

export function translateAuthError(message) {
  return KNOWN_MESSAGES[message] ?? DEFAULT_MESSAGE;
}
