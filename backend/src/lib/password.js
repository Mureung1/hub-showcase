// 비회원 문서 "수정용 비밀번호" 해시/검증. 신규 의존성 없이 Node 내장 crypto.scrypt 사용.
// 저장 포맷: "scrypt$<salt(hex)>$<hash(hex)>". 평문/해시는 절대 API 응답에 싣지 않는다.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEYLEN = 64

export async function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(plain, salt, KEYLEN)
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false
  const [scheme, salt, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hashHex) return false
  const derived = await scryptAsync(plain, salt, KEYLEN)
  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}
