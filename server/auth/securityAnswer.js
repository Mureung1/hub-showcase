// FR-21 — 보안 질문 답변 해시/검증. bcrypt 등 새 의존성을 추가하지 않고 Node 내장 crypto.scrypt를
// 쓴다(package.json에 이미 있는 패키지만으로 충분 — 프로젝트 관례). 호출부는 반드시
// src/lib/securityQuestions.js의 normalizeSecurityAnswer로 정규화(trim+lowercase)한 문자열을
// 넘겨야 한다 — 이 모듈 자체는 정규화를 하지 않는다(client/server 양쪽에서 같은 정규화 규칙을 한
// 곳에서만 관리하기 위함).
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

// 반환: { hash, salt } (둘 다 hex 문자열) — security_questions.answer_hash/answer_salt에 그대로 저장.
export async function hashSecurityAnswer(normalizedAnswer) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(normalizedAnswer, salt, KEY_LENGTH)
  return { hash: derivedKey.toString('hex'), salt }
}

// 저장된 salt/hash(둘 다 hex)와 비교해 답이 맞는지 확인한다. timingSafeEqual로 타이밍 공격을 막는다.
export async function verifySecurityAnswer(normalizedAnswer, saltHex, expectedHashHex) {
  const derivedKey = await scryptAsync(normalizedAnswer, saltHex, KEY_LENGTH)
  const expected = Buffer.from(expectedHashHex, 'hex')
  if (derivedKey.length !== expected.length) return false
  return timingSafeEqual(derivedKey, expected)
}
