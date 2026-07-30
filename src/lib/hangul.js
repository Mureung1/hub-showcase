// 한글 자모 분해 유틸 — 음식명 매칭의 "오탈자·표기 흔들림" 축을 담당한다.
//
// 왜 음절이 아니라 자모인가: 한국어 음식명은 한 음절에 초·중·종성 세 정보가 뭉쳐 있어서, 음절 단위로
// 비교하면 **한 글자만 어긋나도 완전히 다른 글자**로 취급된다. `닭갈비`↔`닥갈비`는 음절 편집거리 1
// (3글자 중 1개 = 33% 손실)이지만 자모로 풀면 `ㄷㅏㄺㄱㅏㄹㅂㅣ`↔`ㄷㅏㄱㄱㅏㄹㅂㅣ`로 8자 중 1자
// 차이(12%)다. 급식표·메뉴판 원문은 오타와 표기 흔들림이 많아서 이 해상도 차이가 실제로 매칭을 가른다.
//
// 이 모듈은 **순수 함수만** 두고 브라우저 의존이 전혀 없다 — 클라이언트의 유사도 게이트
// (src/lib/foodMatch.js)와 서버의 역색인(server/nutrition/nameIndex.js)이 같은 분해 규칙을 써야
// 하기 때문이다. 규칙이 갈리면 "웹에선 잡히는데 급식 분석에선 안 잡힌다"가 또 생긴다.

const HANGUL_BASE = 0xac00
const HANGUL_LAST = 0xd7a3
const MEDIAL_COUNT = 21
const FINAL_COUNT = 28

// prettier-ignore
const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
// prettier-ignore
const MEDIALS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
// prettier-ignore
const FINALS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

// 겹받침은 한 글자가 아니라 자음 둘이 붙은 것이라, 풀어야 `닭`↔`닥`이 "ㄹ 하나 차이"로 보인다.
// 안 풀면 `ㄺ`과 `ㄱ`이 서로 무관한 기호가 되어 자모로 내려온 이득이 사라진다.
const COMPOUND_FINALS = {
  ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ',
  ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
}

// 한글 음절을 초·중·종성 자모 문자열로 편다. 한글이 아닌 문자(숫자·영문·기호)는 그대로 통과시킨다 —
// "LA갈비"·"6쪽마늘" 같은 이름이 있어서 버리면 안 된다.
export function toJamo(text) {
  if (typeof text !== 'string') return ''
  let out = ''
  for (const char of text) {
    const code = char.codePointAt(0)
    if (code < HANGUL_BASE || code > HANGUL_LAST) {
      out += char
      continue
    }
    const offset = code - HANGUL_BASE
    const initial = Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT))
    const medial = Math.floor((offset % (MEDIAL_COUNT * FINAL_COUNT)) / FINAL_COUNT)
    const final = offset % FINAL_COUNT
    const finalJamo = FINALS[final]
    out += INITIALS[initial] + MEDIALS[medial] + (COMPOUND_FINALS[finalJamo] ?? finalJamo)
  }
  return out
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[b.length]
}

// 자모 편집거리 기반 유사도(0~1). 음식명은 길어야 20자(자모 60개)라 O(nm)이 문제되지 않는다.
export function jamoSimilarity(a, b) {
  const ja = toJamo(a)
  const jb = toJamo(b)
  if (!ja || !jb) return 0
  if (ja === jb) return 1
  const longer = Math.max(ja.length, jb.length)
  return Math.max(0, 1 - levenshtein(ja, jb) / longer)
}

// 역색인의 색인 단위. 자모 bi-gram을 쓰는 이유는 recall이다 — 음절 bi-gram은 `꽁치김치조림`에서
// `꽁치`·`치김`·`김치`…를 만들어 `꽁치조림`과 겹치는 게 `꽁치` 하나뿐인데, 자모 bi-gram은 조리법
// 꼬리(`ㅈㅗㄹㅣㅁ`)까지 잘게 겹쳐 후보로 끌어온다. 정밀도는 뒤의 게이트가 책임진다.
export function jamoBigrams(text) {
  const jamo = toJamo(text)
  if (jamo.length < 2) return jamo ? [jamo] : []
  const grams = []
  for (let i = 0; i < jamo.length - 1; i += 1) grams.push(jamo.slice(i, i + 2))
  return grams
}
