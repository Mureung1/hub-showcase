import TextField from './TextField.jsx'
import { normalizeNumericInput } from '../lib/numericInput.js'

// 숫자 입력칸. **`type="number"`를 쓰지 말고 이걸 쓴다** — 이유는 lib/numericInput.js 헤더 주석 참고
// (요약: 안드로이드 웹뷰에서 type=number는 화면 글자를 남긴 채 value만 ''로 만들어, "다 입력했는데
// 저장 버튼이 안 켜진다"가 된다. 출시용 APK에서 실제로 신체정보 저장이 막혔다).
//
// onChange(e)가 아니라 onValueChange(문자열)를 받는다. 이벤트를 그대로 넘기면 호출부가 각자
// e.target.value를 읽게 되는데, 그러면 정규화를 거치지 않은 원본이 상태로 들어가 이 컴포넌트를 쓰는
// 의미가 없어진다 — 값을 정규화해서 건네는 것까지가 이 컴포넌트의 일이다.
export default function NumberField({ value, onValueChange, decimal = false, ...rest }) {
  return (
    <TextField
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={value}
      onChange={(e) => onValueChange(normalizeNumericInput(e.target.value, { decimal }))}
    />
  )
}
