import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import NumberField from './NumberField.jsx'

// 출시용 APK에서 실제로 났던 사고를 고정한다: 신규 가입자가 MY 탭에서 신체정보를 다 입력해도
// 저장 버튼이 끝내 안 켜졌다. 화면에는 숫자가 보이는데 `<input type="number">`가 value를 ''로
// 돌려주고 있었다(같은 폰의 크롬은 정상 — 웹뷰 IME 문제).
function Harness({ decimal = false, initial = '' }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <NumberField label="나이" id="n" value={value} onValueChange={setValue} decimal={decimal} />
      <output data-testid="state">{value}</output>
    </>
  )
}

describe('NumberField', () => {
  it('type=number를 쓰지 않는다 — 이게 이 컴포넌트가 존재하는 이유다', () => {
    render(<Harness />)
    const input = screen.getByLabelText('나이')
    expect(input).toHaveAttribute('type', 'text')
    // type=text로 바꾸면 모바일에서 숫자 키패드가 사라지므로 inputMode로 되살려야 한다.
    expect(input).toHaveAttribute('inputmode', 'numeric')
  })

  it('소수 칸은 decimal 키패드를 띄운다', () => {
    render(<Harness decimal />)
    expect(screen.getByLabelText('나이')).toHaveAttribute('inputmode', 'decimal')
  })

  it('입력한 값이 상태에 그대로 도달한다', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('나이'), { target: { value: '25' } })
    expect(screen.getByTestId('state')).toHaveTextContent('25')
  })

  it('웹뷰가 전각 숫자를 넣어도 값이 살아남는다', () => {
    // type=number였다면 여기서 value가 ''가 되어 저장 버튼이 영영 비활성이었다.
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('나이'), { target: { value: '２５' } })
    expect(screen.getByTestId('state')).toHaveTextContent('25')
  })

  it('소수점을 찍는 도중에도 값을 잃지 않는다', () => {
    render(<Harness decimal />)
    const input = screen.getByLabelText('나이')
    fireEvent.change(input, { target: { value: '65' } })
    fireEvent.change(input, { target: { value: '65.' } })
    expect(screen.getByTestId('state')).toHaveTextContent('65.')
    fireEvent.change(input, { target: { value: '65.5' } })
    expect(screen.getByTestId('state')).toHaveTextContent('65.5')
  })

  it('전부 지울 수 있다', () => {
    render(<Harness initial="25" />)
    fireEvent.change(screen.getByLabelText('나이'), { target: { value: '' } })
    expect(screen.getByTestId('state')).toBeEmptyDOMElement()
  })
})
