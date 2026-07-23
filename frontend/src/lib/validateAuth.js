// 이메일/비밀번호 형식 검증 — Supabase 호출 전에 프론트에서 미리 걸러 즉시 피드백을 준다
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(password) {
  return password.length >= 6
}
