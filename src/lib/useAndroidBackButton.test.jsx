// 안드로이드 하드웨어 뒤로가기 — **열린 모달이 앱 종료보다 우선**이어야 한다.
//
// 이 테스트가 생긴 이유: 홈(/analyze)에서 사진 출처 시트를 열고 뒤로가기를 누르면 앱이 그대로
// 종료됐다(입력해둔 메뉴명까지 소실). 웹뷰에서는 하드웨어 back이 keydown을 만들지 않아
// useFocusTrap의 Escape 처리가 발동하지 않고, 훅은 경로만 보고 exitApp()을 불렀다.
// APK에서만 재현되는 종류라 웹 테스트로는 절대 안 잡힌다 — 그래서 여기서 잠근다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { useAndroidBackButton } from './useAndroidBackButton.js'

const exitApp = vi.fn()
let backHandler = null

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock(
  '@capacitor/app',
  () => ({
    App: {
      addListener: (_event, handler) => {
        backHandler = handler
        return Promise.resolve({ remove: vi.fn() })
      },
      exitApp: () => exitApp(),
    },
  }),
  { virtual: true },
)

function Harness() {
  useAndroidBackButton()
  return null
}

// useFocusTrap과 같은 계약: role=dialog[aria-modal] 컨테이너가 자신에게 온 Escape keydown을 듣는다.
function mountModal(onEscape) {
  const el = document.createElement('div')
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onEscape()
  })
  document.body.appendChild(el)
  return el
}

async function pressBack() {
  // 훅이 동적 import로 리스너를 등록하므로 마이크로태스크가 비워질 때까지 기다린다.
  await vi.waitFor(() => expect(backHandler).toBeTypeOf('function'))
  backHandler()
}

beforeEach(() => {
  exitApp.mockClear()
  backHandler = null
  document.body.innerHTML = ''
  window.history.pushState({}, '', '/analyze')
})

describe('useAndroidBackButton', () => {
  it('모달이 열려 있으면 앱을 종료하지 않고 모달만 닫는다', async () => {
    render(<Harness />)
    const onEscape = vi.fn()
    mountModal(onEscape)

    await pressBack()

    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(exitApp).not.toHaveBeenCalled()
  })

  it('모달이 없으면 홈에서 앱을 종료한다(기존 동작 유지)', async () => {
    render(<Harness />)

    await pressBack()

    expect(exitApp).toHaveBeenCalledTimes(1)
  })

  it('모달이 여러 개면 가장 위(마지막)만 닫는다', async () => {
    render(<Harness />)
    const first = vi.fn()
    const second = vi.fn()
    mountModal(first)
    mountModal(second)

    await pressBack()

    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
    expect(exitApp).not.toHaveBeenCalled()
  })
})
