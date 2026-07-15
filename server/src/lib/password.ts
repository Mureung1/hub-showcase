import bcrypt from 'bcryptjs'
 
// study: SALT 는 사람마다 다르다 = 같은 1234 여도 다른 해시 값으로 나오도록 함. (만약 같은 해시 값으로 나온다면, 해커가 그 해시 값을 보고 가역적으로 원본 비밀번호 유추 가능하게 됨.)
// study: 해시값 = 비가역이므로, 해커 입장 = 브루트포스로 시도하는거 말곤 없음 => 2^10 만큼 섞도록 하여 시간 지연시킴
const SALT_ROUNDS = 10

// study: Promise = 영수증. await 로 결과를 받아야 나옴, 그전엔 pending 
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
