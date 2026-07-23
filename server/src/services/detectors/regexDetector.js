// 국번(앞자리)은 실제 사용되는 대역만 허용한다. \d{2,3}으로 열어두면 카드번호·주민번호
// 같은 숫자열이 전화번호로 잡힌다.
// 휴대폰 01x / 서울 02 / 지역 031~064 / 인터넷전화 070 / 수신자부담 080
const PHONE_PREFIX = '1[0-9]|2|3[1-3]|4[1-4]|5[0-5]|6[1-4]|70|80';

// 국가번호(+82)를 쓰면 뒤의 0이 빠지므로 두 형태를 모두 받는다.
// 앞뒤 (?<!\d)(?!\d)는 더 긴 숫자열 중간이 잘려 매치되는 것을 막는다.
const PHONE_RE = new RegExp(
  `(?<!\\d)((?:\\+82[- ]?0?|0)(?:${PHONE_PREFIX}))([- ]?)(\\d{3,4})([- ]?)(\\d{4})(?!\\d)`,
  'g'
);

// 패턴 하나당 { type, pattern, mask }. 패턴 확장은 이 배열에 항목만 추가한다.
const PATTERNS = [
  { type: '전화번호', pattern: PHONE_RE, mask: maskPhone },
  { type: '이메일', pattern: /[\w.-]+@[\w.-]+\.\w+/g, mask: maskEmail },
];

// 국번은 자릿수가 2~3자리로 달라서(02 vs 031) 앞에서 잘라내면 안 되고,
// 매치에서 캡처한 국번·구분자를 그대로 두고 가운데 블록만 가린다.
function maskPhone(match, prefix, sep1, mid, sep2, last) {
  return `${prefix}${sep1 || '-'}****${sep2 || '-'}${last}`;
}

function maskEmail(match) {
  const [local, domain] = match.split('@');
  return `${local[0]}***@${domain}`;
}

export function detectWithRegex(text) {
  const detections = [];
  let maskedText = text;

  for (const { type, pattern, mask } of PATTERNS) {
    // 캡처 그룹까지 그대로 넘겨서 mask가 매치를 다시 파싱하지 않게 한다.
    maskedText = maskedText.replace(pattern, (...args) => {
      detections.push({ type, value: args[0], source: 'regex' });
      return mask(...args);
    });
  }

  return { detections, maskedText };
}
