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

// RFC1918 사설 대역만 잡는다. 공인 IP까지 가리면 일반적인 네트워크 질문이 깨진다.
const PRIVATE_IP_RE =
  /(?<!\d)(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(?!\d)/g;

// 내부용 TLD로 끝나는 호스트만. 뒤에 다시 확장자가 붙으면(settings.local.json) 파일명이므로 제외한다.
const INTERNAL_HOST_RE = /[\w-]+(?:\.[\w-]+)*\.(internal|local|corp|lan|intranet)(?!\.?\w)/g;

// 제공자별 고정 접두사가 있는 키만 잡는다. 접두사 없이 길이만 보면 해시·UUID가 전부 걸린다.
const API_KEY_RE = /\b(sk-|gh[pousr]_|AKIA|AIza|xox[baprs]-)[A-Za-z0-9_-]{16,}/g;

// 패턴 하나당 { type, pattern, mask }. 패턴 확장은 이 배열에 항목만 추가한다.
// 이메일을 내부 호스트보다 먼저 둔다. 순서가 반대면 admin@db.internal에서 도메인이 먼저
// 가려져 이메일 정규식이 매치에 실패하고 로컬 파트(admin)가 그대로 남는다.
const PATTERNS = [
  { type: '전화번호', pattern: PHONE_RE, mask: maskPhone },
  { type: '이메일', pattern: /[\w.-]+@[\w.-]+\.\w+/g, mask: maskEmail },
  { type: 'API 키', pattern: API_KEY_RE, mask: maskApiKey },
  { type: '사설 IP', pattern: PRIVATE_IP_RE, mask: maskPrivateIp },
  { type: '내부 도메인', pattern: INTERNAL_HOST_RE, mask: maskInternalHost },
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

// 접두사는 어느 제공자 키인지 알려줄 뿐 비밀이 아니므로 남기고, 뒤의 값만 통째로 가린다.
function maskApiKey(match, prefix) {
  return `${prefix}****`;
}

// 대역(10/8, 172.16/12, 192.168/16)은 남기고 호스트 부분만 가린다.
// LLM은 "사설 IP"라는 것만 알면 되고 실제 호스트는 알 필요가 없다.
function maskPrivateIp(match) {
  const octets = match.split('.');
  const keep = octets[0] === '10' ? 1 : 2;
  return octets.map((octet, i) => (i < keep ? octet : '*')).join('.');
}

function maskInternalHost(match, tld) {
  return `***.${tld}`;
}

export function detectWithRegex(text) {
  const detections = [];
  let maskedText = text;

  for (const { type, pattern, mask } of PATTERNS) {
    // 캡처 그룹까지 그대로 넘겨서 mask가 매치를 다시 파싱하지 않게 한다.
    maskedText = maskedText.replace(pattern, (...args) => {
      const maskedValue = mask(...args);
      // value(원문)는 화면 표시용, masked는 로그 저장용 (로그에 원문을 남기지 않는다).
      detections.push({ type, value: args[0], masked: maskedValue, source: 'regex' });
      return maskedValue;
    });
  }

  return { detections, maskedText };
}
