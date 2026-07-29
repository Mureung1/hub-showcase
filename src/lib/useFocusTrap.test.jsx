import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useFocusTrap } from './useFocusTrap.js'

// ChatBotSheet 재현용 더미: onEscape로 매 렌더 새 화살표 함수를 넘기고, 컨트롤드 input을 하나 둔다.
// 안정성 점검(Phase B 이후) — 예전엔 onEscape가 트랩 설정 effect의 의존성에 직접 있어서, 이 input에
// 타이핑할 때마다(리렌더 -> onEscape 참조 변경) 트랩이 재설정되며 강제로 blur/focus를 일으켰다.
function DummyModal({ onEscape }) {
  const [value, setValue] = useState('')
  const containerRef = useFocusTrap(true, onEscape)
  return (
    <div role="dialog" ref={containerRef} tabIndex={-1}>
      <input aria-label="입력" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button">확인</button>
      <button type="button">취소</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('마운트 시 컨테이너 안 첫 focusable 요소로 포커스를 이동한다', () => {
    render(<DummyModal onEscape={() => {}} />)
    expect(screen.getByLabelText('입력')).toHaveFocus()
  })

  it('onEscape가 매 렌더 새 함수여도, 컨트롤드 input에 연속 입력하는 동안 포커스가 그대로 유지된다', () => {
    // onEscape로 매번 새 인라인 화살표 함수를 넘겨 ChatBotSheet와 동일한 조건을 재현한다.
    function Wrapper() {
      const [, forceRender] = useState(0)
      return (
        <DummyModal
          onEscape={() => {
            forceRender((n) => n + 1)
          }}
        />
      )
    }
    render(<Wrapper />)
    const input = screen.getByLabelText('입력')
    expect(input).toHaveFocus()

    fireEvent.change(input, { target: { value: '아' } })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '안' } })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '안ㄴ' } })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '안녕' } })
    expect(input).toHaveFocus()
    expect(input).toHaveValue('안녕')
  })

  it('Escape를 누르면 항상 최신 onEscape 콜백을 호출한다', () => {
    const onEscapeV1 = vi.fn()
    const onEscapeV2 = vi.fn()
    const { rerender } = render(<DummyModal onEscape={onEscapeV1} />)

    rerender(<DummyModal onEscape={onEscapeV2} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onEscapeV1).not.toHaveBeenCalled()
    expect(onEscapeV2).toHaveBeenCalledTimes(1)
  })

  it('Tab 순환: 마지막 요소에서 Tab을 누르면 첫 요소로 돌아간다', () => {
    render(<DummyModal onEscape={() => {}} />)
    const cancelButton = screen.getByRole('button', { name: '취소' })
    cancelButton.focus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' })
    expect(screen.getByLabelText('입력')).toHaveFocus()
  })

  it('Shift+Tab 순환: 첫 요소에서 Shift+Tab을 누르면 마지막 요소로 이동한다', () => {
    render(<DummyModal onEscape={() => {}} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: '취소' })).toHaveFocus()
  })

  it('언마운트되면 모달을 열기 전 포커스로 되돌린다', () => {
    function Toggle() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            트리거
          </button>
          {open && <DummyModal onEscape={() => setOpen(false)} />}
        </>
      )
    }
    render(<Toggle />)
    const trigger = screen.getByRole('button', { name: '트리거' })
    trigger.focus()
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    expect(screen.getByLabelText('입력')).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(trigger).toHaveFocus()
  })
})
