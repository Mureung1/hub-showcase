import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireRole from './RequireRole.jsx'
import { selectRole } from '../lib/session.js'

/*
 * RequireRole 가드 테스트.
 *
 * 구현(getSession을 호출했는가)이 아니라 동작(사용자가 무엇을 보게 되는가)을 검증한다.
 * 리다이렉트가 실제로 "/"에 도착하는지 보려면 라우터가 필요하므로,
 * 실제 앱과 같은 구조(보호된 경로 + 진입 경로)를 MemoryRouter로 재현한다.
 */

// 보호된 경로(/owner)로 진입한 상황을 만든다
function renderAt(path, role = 'owner') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>역할 선택 화면</div>} />
        <Route
          path="/owner"
          element={
            <RequireRole role={role}>
              <div>사장님 화면</div>
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  it('세션 역할이 일치하면 children을 보여준다', () => {
    selectRole('owner')

    renderAt('/owner')

    expect(screen.getByText('사장님 화면')).toBeInTheDocument()
  })

  it('세션이 없으면 역할 선택 화면으로 되돌린다', () => {
    // localStorage는 setup.js가 매 테스트 후 비우므로 여기선 세션이 없는 상태

    renderAt('/owner')

    expect(screen.getByText('역할 선택 화면')).toBeInTheDocument()
    expect(screen.queryByText('사장님 화면')).not.toBeInTheDocument()
  })

  it('세션 역할이 다르면 children을 보여주지 않는다', () => {
    selectRole('consumer') // 소비자로 로그인한 채 사장님 경로에 진입

    renderAt('/owner')

    expect(screen.getByText('역할 선택 화면')).toBeInTheDocument()
    expect(screen.queryByText('사장님 화면')).not.toBeInTheDocument()
  })
})
