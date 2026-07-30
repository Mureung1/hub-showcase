import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomSheet from './BottomSheet.jsx'

// jsdom엔 둘 다 없다. 시트는 부모 높이를 재려고 ResizeObserver를, 드래그에 setPointerCapture를 쓴다.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

function renderSheet(props = {}) {
  const onSnapChange = vi.fn()
  const onAction = vi.fn()
  render(
    <div>
      <BottomSheet snap="min" onSnapChange={onSnapChange} {...props}>
        <button type="button" onClick={onAction}>
          이 위치로 검색
        </button>
      </BottomSheet>
    </div>,
  )
  return { onSnapChange, onAction }
}

describe('BottomSheet', () => {
  // 회귀 방지 — 이게 실제로 깨졌었다. 콘텐츠 영역이 pointerdown 시점에 setPointerCapture를 걸면
  // pointerup도 컨테이너로 가버려서, 브라우저가 click을 눌린 버튼이 아니라 컨테이너에 디스패치한다.
  // 그 결과 지도 탭 바텀시트 안의 모든 버튼(위치 검색·식당 카드·비교하기)이 통째로 죽었다.
  it('시트 안의 버튼을 탭하면 그 버튼의 onClick이 실행된다', () => {
    const { onAction } = renderSheet()
    const button = screen.getByRole('button', { name: '이 위치로 검색' })

    fireEvent.pointerDown(button, { pointerId: 1, clientY: 300 })
    fireEvent.pointerUp(button, { pointerId: 1, clientY: 300 })
    fireEvent.click(button)

    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('움직이지 않은 탭은 포인터를 가로채지 않는다(클릭이 버튼까지 가야 하므로)', () => {
    renderSheet()
    const button = screen.getByRole('button', { name: '이 위치로 검색' })

    fireEvent.pointerDown(button, { pointerId: 1, clientY: 300 })
    fireEvent.pointerUp(button, { pointerId: 1, clientY: 300 })

    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled()
  })

  it('손잡이를 탭하면 다음 스냅으로 순환한다', () => {
    const { onSnapChange } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: '목록 펼치기' }))
    expect(onSnapChange).toHaveBeenCalledWith('mid')
  })

  // 회귀 방지 — 드래그 직후 click 한 번을 삼키는 플래그를 손잡이(cycleSnap)에서만 내렸다. 콘텐츠
  // 영역에서 드래그가 끝나면 click이 손잡이로 안 가므로 플래그가 남았고, **그 다음 손잡이 탭 한 번이
  // 통째로 무시**됐다("가끔 시트가 안 눌린다"). 지도 탭에서 목록을 끌어 올린 뒤 접으려 할 때 흔하다.
  it('콘텐츠를 드래그한 뒤에도 손잡이 탭이 한 번에 먹는다', async () => {
    const { onSnapChange } = renderSheet()
    const content = screen.getByRole('button', { name: '이 위치로 검색' })

    // 콘텐츠 영역에서 슬롭을 넘겨 드래그(→ suppressClick 세워짐), click은 손잡이로 가지 않는다.
    fireEvent.pointerDown(content, { pointerId: 1, clientY: 300 })
    fireEvent.pointerMove(content, { pointerId: 1, clientY: 340 })
    fireEvent.pointerUp(content, { pointerId: 1, clientY: 340 })
    await new Promise((resolve) => setTimeout(resolve, 0))

    onSnapChange.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /목록 (펼치기|접기)/ }))
    expect(onSnapChange).toHaveBeenCalledTimes(1)
  })
})
