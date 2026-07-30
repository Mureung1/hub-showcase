import { normalizeNumericInput } from './numericInput.js'

describe('normalizeNumericInput', () => {
  it('평범한 입력은 그대로 통과시킨다', () => {
    expect(normalizeNumericInput('25')).toBe('25')
    expect(normalizeNumericInput('170', { decimal: true })).toBe('170')
    expect(normalizeNumericInput('65.5', { decimal: true })).toBe('65.5')
  })

  it('빈 값을 0으로 바꾸지 않는다', () => {
    // 다 지우고 다시 쓰는 게 불가능해진다.
    expect(normalizeNumericInput('')).toBe('')
    expect(normalizeNumericInput(null)).toBe('')
    expect(normalizeNumericInput(undefined)).toBe('')
  })

  it('입력 중인 마침표를 떼지 않는다', () => {
    // "65."에서 마침표를 지우면 소수점을 영영 찍을 수 없다.
    expect(normalizeNumericInput('65.', { decimal: true })).toBe('65.')
    // Number()가 이 상태도 65로 읽으므로 검증은 그대로 통과한다.
    expect(Number('65.')).toBe(65)
  })

  it('전각 숫자를 ASCII로 되돌린다 — 한글 IME에서 실제로 나온다', () => {
    expect(normalizeNumericInput('２５')).toBe('25')
    expect(normalizeNumericInput('１７０', { decimal: true })).toBe('170')
  })

  it('쉼표 소수 구분자를 마침표로 바꾼다', () => {
    // 이 문자 하나 때문에 type=number는 값 전체를 ''로 만들었다.
    expect(normalizeNumericInput('65,5', { decimal: true })).toBe('65.5')
  })

  it('정수 칸에서는 마침표를 허용하지 않는다', () => {
    expect(normalizeNumericInput('25.7')).toBe('257')
  })

  it('마침표는 하나만 남기되 뒤 숫자는 살린다', () => {
    // 잘못 눌렀다고 뒤에 친 숫자까지 날리면 사용자는 뭘 잘못했는지 알 수 없다.
    expect(normalizeNumericInput('6.5.5', { decimal: true })).toBe('6.55')
  })

  it('한글·공백·기호를 걸러낸다', () => {
    expect(normalizeNumericInput('25세')).toBe('25')
    expect(normalizeNumericInput(' 170 ', { decimal: true })).toBe('170')
    expect(normalizeNumericInput('-65', { decimal: true })).toBe('65')
  })
})
