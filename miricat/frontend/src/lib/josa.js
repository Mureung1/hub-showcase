// 받침 유무로 알맞은 조사를 고른다.
// josa("도담동", "로", "으로") → "으로" (조사만 리턴 — JSX에서 <b>단어</b>{josa(...)} 처럼 이어붙이기 위해)
// withJosa("107번", "와", "과") → "107번과"
// 숫자로 끝나면 읽는 소리(일·이·삼…) 기준. 그 외 문자(영문 등)는 받침 없음으로 취급.
const DIGIT_BATCHIM = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };

function jongIndex(word) {
  // 종성 번호를 돌려준다. 0 = 받침 없음, 8 = ㄹ받침, -1 = 한글/숫자 아님
  const c = (word || "").trim().slice(-1);
  if (/[0-9]/.test(c)) return DIGIT_BATCHIM[c] ? 1 : 0;   // 숫자는 받침 유무만 (ㄹ 구분: 1·7·8은 '일·칠·팔'=ㄹ 아님… 1은 ㄹ!)
  const code = c.charCodeAt(0) - 0xac00;          // 한글 음절 = 0xAC00부터 초성·중성·종성 조합 순서
  if (code < 0 || code > 11171) return 0;          // 한글 아님 → 받침 없음 취급
  return code % 28;                                // 28로 나눈 나머지 = 종성 번호
}

const RIEUL_DIGITS = new Set(["1", "7", "8"]);     // 일·칠·팔 = ㄹ받침

export function josa(word, withoutBatchim, withBatchim) {
  const jong = jongIndex(word);
  // "로/으로"만의 예외: ㄹ받침은 받침이 있어도 "로" (예: 출근길로, 서울로)
  if (withoutBatchim === "로") {
    const last = (word || "").trim().slice(-1);
    const isRieul = jong === 8 || RIEUL_DIGITS.has(last);
    return jong === 0 || isRieul ? "로" : "으로";
  }
  return jong > 0 ? withBatchim : withoutBatchim;
}

export function withJosa(word, withoutBatchim, withBatchim) {
  return `${word}${josa(word, withoutBatchim, withBatchim)}`;
}
