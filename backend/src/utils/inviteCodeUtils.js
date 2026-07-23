const INVITE_CODE_LENGTH = 6

// 헷갈리기 쉬운 문자(0, O, 1, I, l) 제외한 영문 대문자 + 숫자
const INVITE_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// 6자리 랜덤 초대 코드를 생성한다 (DB 중복 체크 없이 문자열만 생성)
export function generateInviteCode() {
  let code = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_CHARSET.length)
    code += INVITE_CODE_CHARSET[randomIndex]
  }
  return code
}
