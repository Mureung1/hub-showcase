import { describe, expect, test } from 'vitest'
import normalize from './normalize.js'

const { normalizePostingText, sha256Hex, normalizeAndHash } = normalize

// 기대값은 파이썬 `agent/scripts/demo_seed/_csv.normalize_posting_text` 를
// 같은 입력으로 돌려 얻은 결과다. 두 구현의 해시가 갈라지면 캐시가 영영 빗나간다.
const PYTHON_PARITY = [
  {
    name: '줄바꿈·공백·개인정보를 한 번에 정리한다',
    raw: '  백엔드 개발자 채용\r\n\r\n\r\n  자격요건\t\t Java   3년\r 문의: hong.gil-dong@example.co.kr / 010-1234-5678\n주민번호 900101-1234567 입니다.  ',
    normalized: '백엔드 개발자 채용\n\n자격요건 Java 3년\n문의: /\n주민번호 9567 입니다.',
    hash: 'd5cac59fca152701857d9857271f7856d5a88a3e730a0e4dc2b9b940820b3642',
  },
  {
    name: '정리할 것이 없으면 원문 그대로다',
    raw: 'Spring Boot',
    normalized: 'Spring Boot',
    hash: '8d9a80fb1dc30a46cbbbcc295a3c782587c4c8a40d31b0d1a7606226b3606c82',
  },
  {
    name: '결합 문자를 NFC 로 합친다',
    raw: '한글 조합',
    normalized: '한글 조합',
    hash: '1a1dcc55f09b0ce7466501f898b066ee439a0a2b8f2a364f91494ff09810fba5',
  },
  {
    name: '연속 빈 줄과 공백만 있는 줄을 하나로 접는다',
    raw: 'a\t\tb  c\n\n\n\nd\n   \ne',
    normalized: 'a b c\n\nd\n\ne',
    hash: '42b5ec65e9daa0eb41d13a9c1fcab99ee00cd75167630fd68023e44adba0d5f7',
  },
]

describe('원문 정규화 (CONTRACT 6.2)', () => {
  for (const parity of PYTHON_PARITY) {
    test(`${parity.name} — 파이썬과 같은 해시`, () => {
      const normalized = normalizePostingText(parity.raw)
      expect(normalized).toBe(parity.normalized)
      expect(sha256Hex(normalized)).toBe(parity.hash)
    })
  }

  test('이메일과 전화번호를 지운다', () => {
    const normalized = normalizePostingText('지원 문의 recruit@example.com 02-123-4567')
    expect(normalized).not.toContain('@')
    expect(normalized).not.toContain('123-4567')
  })

  test('문자열이 아니면 오류를 던진다', () => {
    expect(() => normalizePostingText(null)).toThrow(TypeError)
  })

  test('normalizeAndHash 는 저장 컬럼과 같은 이름으로 낸다', () => {
    const result = normalizeAndHash(' 가나다 \n\n\n 라마바 ')
    expect(result.normalized_text).toBe('가나다\n\n라마바')
    expect(result.char_length).toBe(result.normalized_text.length)
    expect(result.content_hash).toHaveLength(64)
    expect(result.content_hash).toBe(sha256Hex(result.normalized_text))
  })
})
