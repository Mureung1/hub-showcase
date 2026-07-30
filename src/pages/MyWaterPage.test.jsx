import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyWaterPage from './MyWaterPage.jsx'
import { useUser } from '../context/UserContext.jsx'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <MyWaterPage />
    </MemoryRouter>,
  )
}

describe('MyWaterPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    useUser.mockReturnValue({ effectiveUserId: 'u1', profile: { weightKg: 60, activity: 'moderate' } })
  })

  it('신체정보 기반 목표와 0ml 초기 상태를 보여준다', () => {
    renderPage()
    expect(screen.getByText('0ml / 1944ml')).toBeInTheDocument() // 60*30*1.08
  })

  it('+200ml/+100ml/+500ml 버튼을 누르면 즉시 기록되고 "오늘 기록" 목록에 나타난다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '+200ml' }))
    expect(screen.getByText('200ml / 1944ml')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+100ml' }))
    expect(screen.getByText('300ml / 1944ml')).toBeInTheDocument()

    expect(screen.getByText(/물 200ml/)).toBeInTheDocument()
    expect(screen.getByText(/물 100ml/)).toBeInTheDocument()
  })

  it('직접 입력으로 원하는 양을 추가할 수 있다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '직접 입력' }))
    fireEvent.change(screen.getByLabelText('추가할 양(ml)'), { target: { value: '350' } })
    fireEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(screen.getByText('350ml / 1944ml')).toBeInTheDocument()
  })

  it('기록 삭제 버튼을 누르면 그 기록만 지워지고 총량이 줄어든다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '+200ml' }))
    fireEvent.click(screen.getByRole('button', { name: '+100ml' }))
    expect(screen.getByText('300ml / 1944ml')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0])
    expect(screen.getByText('100ml / 1944ml')).toBeInTheDocument()
  })

  it('영양제 토글 버튼을 누르면 체크 표시로 바뀐다', () => {
    renderPage()
    const button = screen.getByRole('button', { name: '영양제 챙겨 먹었어요' })
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: '영양제 챙겨 먹었어요 ✓' })).toBeInTheDocument()
  })

  it('아직 기록이 없으면 안내 문구를 보여준다', () => {
    renderPage()
    expect(screen.getByText('아직 기록이 없어요.')).toBeInTheDocument()
  })

  it('뒤로가기를 누르면 /profile로 이동한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })
})
