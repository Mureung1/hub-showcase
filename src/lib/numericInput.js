// 숫자 입력칸에서 `<input type="number">`를 쓰지 않기 위한 정규화.
//
// 왜 type="number"를 버리는가 — **안드로이드 웹뷰에서 값이 통째로 사라진다.**
// HTML 명세상 type=number 입력의 `value`는 내용이 "유효한 부동소수점 수"가 아니면 **빈 문자열**을
// 돌려준다(value sanitization algorithm). 화면에 보이는 글자는 그대로 남아 있는데 JS가 읽는 값만
// ''가 되므로, 사용자 눈에는 "다 입력했는데 저장 버튼이 안 켜지는" 상태가 된다.
//
// 실측(출시용 APK, 신규 가입 직후 MY 탭 신체정보): 나이·키·몸무게를 입력하면 숫자는 칸에 보이는데
// 저장 버튼이 끝까지 비활성. **같은 폰의 크롬에서는 정상** — 즉 배포된 빌드가 아니라 웹뷰 IME 문제다.
// 같은 앱에서 회원가입(아이디/비밀번호, type=text)은 잘 됐다는 게 교차검증이다. 웹뷰의 문자 입력
// 자체는 멀쩡하고 숫자 칸만 깨진다.
//
// type="text" + inputMode로 바꾸면 **value가 절대 삭제되지 않는다**(보이는 것이 곧 읽히는 값).
// 모바일 숫자 키패드는 inputMode가 그대로 띄워주므로 사용성 손해가 없다. 대신 사용자가 무엇이든
// 칠 수 있게 되므로 여기서 정규화한다.
//
// ⚠️ 완성되지 않은 입력을 지우지 않는 게 중요하다. "65."에서 마침표를 떼면 소수점을 영영 찍을 수
// 없고, 빈 문자열을 0으로 바꾸면 다 지우고 다시 쓰는 게 불가능해진다.

// 전각 숫자(０-９, U+FF10~U+FF19)는 한글 IME에서 실제로 나온다 — ASCII로 되돌린다.
function toAsciiDigits(s) {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

// raw: 입력칸의 원본 문자열. decimal: 소수점 허용 여부(나이는 정수, 키·몸무게·영양소는 소수).
// 반환: 그대로 상태에 넣어도 되는 문자열(항상 문자열, null/undefined 없음).
export function normalizeNumericInput(raw, { decimal = false } = {}) {
  if (raw == null) return ''
  let s = toAsciiDigits(String(raw))
  // 일부 키보드/로케일은 소수 구분자로 쉼표를 낸다. type=number였다면 이것 하나로 값 전체가 ''가 됐다.
  s = s.replace(/,/g, '.')
  s = decimal ? s.replace(/[^0-9.]/g, '') : s.replace(/[^0-9]/g, '')
  if (!decimal) return s

  // 마침표는 하나만 남긴다. 두 번째부터는 버리되 뒤 숫자는 살린다("6.5.5" → "6.55") —
  // 잘못 눌렀다고 뒤에 친 숫자까지 날리면 사용자는 뭘 잘못했는지 알 수 없다.
  const first = s.indexOf('.')
  if (first === -1) return s
  return s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, '')
}
