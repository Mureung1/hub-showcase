// Supabase Auth 에러(영어 원문/코드)를 사용자용 한글 메시지로 바꾼다.
// 화면마다 제각각 원문을 노출하지 않도록 한 곳에 모은다.

const RULES = [
  [/invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않아요.'],
  [/email not confirmed/i, '메일 확인이 필요해요. 받은 편지함의 링크를 눌러 가입을 완료해 주세요.'],
  [
    /user already registered|already been registered/i,
    '이미 가입된 이메일이에요. 로그인해 주세요.',
  ],
  [/password should be at least/i, '비밀번호는 6자 이상이어야 해요.'],
  [/new password should be different/i, '기존 비밀번호와 다른 비밀번호를 입력해 주세요.'],
  [
    /for security purposes|rate limit|too many requests/i,
    '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.',
  ],
  [/unable to validate email|invalid email/i, '이메일 형식을 확인해 주세요.'],
  [/email address .* is invalid/i, '이메일 형식을 확인해 주세요.'],
  [/token has expired|invalid.*token|otp.*expired/i, '링크가 만료됐어요. 다시 요청해 주세요.'],
  [/same.*email|email address is already/i, '이미 사용 중인 이메일이에요.'],
  [/network|failed to fetch/i, '네트워크 문제로 실패했어요. 연결을 확인해 주세요.'],
]

export function toKoAuthError(err, fallback = '문제가 발생했어요. 잠시 후 다시 시도해 주세요.') {
  const msg = typeof err === 'string' ? err : (err?.message ?? '')
  for (const [pattern, ko] of RULES) {
    if (pattern.test(msg)) return ko
  }
  return fallback
}
