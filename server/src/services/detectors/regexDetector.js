// 패턴 하나당 { type, pattern, mask }. 패턴 확장은 이 배열에 항목만 추가한다.
const PATTERNS = [
  { type: '전화번호', pattern: /01[0-9]-?\d{3,4}-?\d{4}/g, mask: maskPhone },
  { type: '이메일', pattern: /[\w.-]+@[\w.-]+\.\w+/g, mask: maskEmail },
];

function maskPhone(match) {
  const digits = match.replace(/-/g, '');
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function maskEmail(match) {
  const [local, domain] = match.split('@');
  return `${local[0]}***@${domain}`;
}

export function detectWithRegex(text) {
  const detections = [];
  let maskedText = text;

  for (const { type, pattern, mask } of PATTERNS) {
    maskedText = maskedText.replace(pattern, (match) => {
      detections.push({ type, value: match, source: 'regex' });
      return mask(match);
    });
  }

  return { detections, maskedText };
}
