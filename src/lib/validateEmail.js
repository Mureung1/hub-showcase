// 로그인/회원가입에서 Supabase Auth 호출 전에 걸러낼 최소한의 형식 검사.
// <input type="email">의 브라우저 네이티브 검증은 최상위도메인(.) 없이도(예: abc@abc) 통과시키므로 보완한다.
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
