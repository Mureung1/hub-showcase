const SCHOOL_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.ac\.kr$/i

// 이메일이 학교 이메일(.ac.kr로 끝나는 정식 형식) 형태인지 확인한다
export function validateSchoolEmail(email) {
  if (typeof email !== 'string') return false
  return SCHOOL_EMAIL_REGEX.test(email)
}
