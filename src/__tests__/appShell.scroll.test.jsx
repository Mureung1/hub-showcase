// MY 탭 하위 화면이 **맨 아래로 스크롤된 채 열리던** 버그의 회귀 테스트.
//
// 원인: AppShell이 스크롤 위치를 `pathRef.current`로 저장했는데, 정리(cleanup)가 도는 시점에는 이미
// 새 경로로 리렌더된 뒤라 그 ref가 **새 경로**를 가리켰다. 즉 떠나는 화면의 스크롤 위치가 들어오는
// 화면의 키에 저장되고, 바로 이어지는 복원이 그 값을 읽었다. MY 탭은 바로가기 그리드가 화면 맨
// 아래라 항상 스크롤이 내려간 상태에서 눌리므로 100% 재현됐다(퀘스트·리더보드·배지 도감 전부).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'

vi.mock('../context/UserContext.jsx', () => ({ useUser: () => ({ levelUpPopup: null, dismissLevelUpPopup: () => {} }) }))
vi.mock('../components/ChatBotSheet.jsx', () => ({ default: () => null }))

// jsdom은 실제로 스크롤하지 않으므로 scrollTo/scrollY를 직접 흉내 낸다. window.scrollY는 읽기 전용
// getter라 defineProperty로 갈아끼운다.
let currentY = 0
function installScrollStub() {
  currentY = 0
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => currentY })
  window.scrollTo = vi.fn((x, y) => {
    currentY = y
    window.dispatchEvent(new Event('scroll'))
  })
}

// 사용자가 실제로 스크롤한 상황을 만든다(리스너가 그 값을 기억해야 한다).
function userScrollsTo(y) {
  act(() => {
    currentY = y
    window.dispatchEvent(new Event('scroll'))
  })
}

function renderShell(initialPath = '/profile') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/profile"
            element={
              <div>
                <p>MY 탭</p>
                <Link to="/profile/badges">배지 도감</Link>
              </div>
            }
          />
          <Route path="/profile/badges" element={<p>배지 도감 화면</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell 스크롤 복원', () => {
  beforeEach(() => {
    installScrollStub()
  })

  it('하위 화면은 맨 위에서 열린다 — 떠난 화면이 아무리 내려가 있었어도', () => {
    renderShell()
    // MY 탭에서 바로가기 그리드까지 내려간 상태(그리드가 화면 맨 아래에 있다).
    userScrollsTo(1200)

    fireEvent.click(screen.getByText('배지 도감'))

    expect(screen.getByText('배지 도감 화면')).toBeInTheDocument()
    // 버그가 있을 때는 여기가 1200이었다.
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

  it('되돌아오면 떠날 때의 위치로 복원된다 — 이 수정이 원래 기능을 깨지 않았다', () => {
    const { unmount } = renderShell()
    userScrollsTo(1200)
    fireEvent.click(screen.getByText('배지 도감'))
    // 하위 화면에서 조금 내려본다. 이 값이 MY 탭 키를 덮어쓰면 안 된다(경로별로 따로 기억해야 한다).
    userScrollsTo(300)
    unmount()

    // scrollByPath는 모듈 스코프라 렌더를 새로 해도 기억이 남는다(앱↔로그인처럼 셸이 통째로
    // 바뀌는 이동에서도 유지되게 한 의도적 설계).
    renderShell('/profile')
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 1200)
  })
})
