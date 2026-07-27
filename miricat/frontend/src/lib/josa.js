// 받침 유무로 알맞은 조사를 고른다.
// josa("도담동", "로", "으로") → "으로" (조사만 리턴 — JSX에서 <b>단어</b>{josa(...)} 처럼 이어붙이기 위해)
// withJosa("107번", "와", "과") → "107번과"
// 숫자로 끝나면 읽는 소리(일·이·삼…) 기준. 그 외 문자(영문 등)는 받침 없음으로 취급.
const DIGIT_BATCHIM = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };

function hasBatchim(word) {
  const c = (word || "").trim().slice(-1);
  if (/[0-9]/.test(c)) return DIGIT_BATCHIM[c];
  const code = c.charCodeAt(0) - 0xac00;          // 한글 음절 = 0xAC00부터 초성·중성·종성 조합 순서
  if (code < 0 || code > 11171) return false;      // 한글 아님
  return code % 28 > 0;                            // 28로 나눈 나머지 = 종성 번호 (0이면 받침 없음)
}

export function josa(word, withoutBatchim, withBatchim) {
  return hasBatchim(word) ? withBatchim : withoutBatchim;
}

export function withJosa(word, withoutBatchim, withBatchim) {
  return `${word}${josa(word, withoutBatchim, withBatchim)}`;
}
