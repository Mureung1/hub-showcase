// 사용자 입력 공고 원문 정규화와 해시.
// 규칙은 CONTRACT 6.2 이며 파이썬 `agent/scripts/demo_seed/_csv.py` 의
// `normalize_posting_text` 와 **문자 단위로 같은 결과**를 내야 한다.
// 두 구현이 갈라지면 같은 원문의 SHA-256 이 달라져 캐시가 영영 빗나간다.
//
// 적용 순서는 파이썬 구현과 같다. NFC 를 먼저 걸어야 결합 문자로 쓰인 이메일·전화번호가
// 뒤의 패턴 제거에 걸린다. 줄 단위 정리는 개인정보 제거로 생긴 빈 줄까지 함께 접는다.

const crypto = require('node:crypto')

// 개인정보 패턴 — 이메일 · 전화번호 · 주민등록번호 형태
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE_PATTERN = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g
const RRN_PATTERN = /\d{6}[-\s]?[1-4]\d{6}/g

function normalizePostingText(raw) {
  if (typeof raw !== 'string') {
    throw new TypeError('normalizePostingText 는 문자열만 받는다')
  }

  // 7. NFC 정규화 (뒤 단계가 같은 코드포인트를 보도록 먼저 건다)
  let text = raw.normalize('NFC')

  // 2. 줄바꿈 통일
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 6. 개인정보 패턴 제거
  text = text.replace(EMAIL_PATTERN, '')
  text = text.replace(PHONE_PATTERN, '')
  text = text.replace(RRN_PATTERN, '')

  // 3·5. 줄 안의 연속 공백을 하나로 줄이고 줄 앞뒤 공백을 없앤다
  const lines = text.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim())

  // 4. 연속 빈 줄을 하나로
  const collapsed = []
  for (const line of lines) {
    if (line === '' && collapsed.length > 0 && collapsed[collapsed.length - 1] === '') continue
    collapsed.push(line)
  }

  // 1. 앞뒤 공백 제거
  return collapsed.join('\n').trim()
}

// 8. sha256(normalized_text.encode("utf-8")).hexdigest()
function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

// 정규화와 해시를 한 번에. `user_postings` 의 세 컬럼과 같은 이름으로 낸다.
function normalizeAndHash(raw) {
  const normalized_text = normalizePostingText(raw)
  return {
    normalized_text,
    content_hash: sha256Hex(normalized_text),
    char_length: [...normalized_text].length,
  }
}

module.exports = { normalizePostingText, sha256Hex, normalizeAndHash }
