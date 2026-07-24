// AppShell이 "레이아웃 라우트"라는 사실을 고정하는 회귀 테스트.
//
// 왜 이걸 테스트하나: 예전 구조에서는 라우트 하나하나가 자기 <AppShell>을 element로 들고 있어서
// 탭을 옮길 때마다 하단 탭바까지 함께 다시 그려졌다("탭바 깜빡임"의 구조적 원인 중 하나).
// 지금은 AppShell을 라우트 위로 올리고 콘텐츠만 <Outlet/>으로 갈아끼운다 — 이 성질이 깨지면
// 화면에는 티가 잘 안 나면서 깜빡임만 슬그머니 돌아오므로, DOM 노드 동일성으로 못 박아둔다.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'

function renderShell(initialPath = '/analyze') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/analyze" element={<p>홈 콘텐츠</p>} />
          <Route path="/meals" element={<p>식단 콘텐츠</p>} />
        </Route>
        <Route element={<AppShell hideTabBar />}>
          <Route path="/login" element={<p>로그인 콘텐츠</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell(레이아웃 라우트)', () => {
  it('Outlet 위치에 현재 라우트의 콘텐츠를 그리고, 하단 탭바를 함께 보여준다', () => {
    renderShell()

    expect(screen.getByText('홈 콘텐츠')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('탭을 옮겨도 탭바 DOM 노드는 그대로 유지되고 콘텐츠만 바뀐다', () => {
    renderShell()

    const navBefore = screen.getByRole('navigation')
    fireEvent.click(screen.getByText('식단'))

    expect(screen.getByText('식단 콘텐츠')).toBeInTheDocument()
    expect(screen.queryByText('홈 콘텐츠')).not.toBeInTheDocument()
    // 같은 노드여야 한다 — 새로 마운트됐다면 다른 객체가 나온다.
    expect(screen.getByRole('navigation')).toBe(navBefore)
  })

  it('현재 탭만 aria-current="page"로 표시된다', () => {
    renderShell()

    expect(screen.getByText('홈').closest('button')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByText('식단'))
    expect(screen.getByText('홈').closest('button')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('식단').closest('button')).toHaveAttribute('aria-current', 'page')
  })

  it('hideTabBar인 화면(로그인 등)에서는 탭바를 그리지 않는다', () => {
    renderShell('/login')

    expect(screen.getByText('로그인 콘텐츠')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
