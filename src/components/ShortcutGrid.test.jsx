import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShortcutGrid from './ShortcutGrid.jsx'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('ShortcutGrid', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('8개 아이콘을 전부 렌더한다', () => {
    render(
      <MemoryRouter>
        <ShortcutGrid />
      </MemoryRouter>,
    )
    for (const label of ['퀘스트', '리더보드', '배지 도감', '식단 퀴즈', '물 기록', '영양제', '권장 섭취량', '카드 항목']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('일반 아이콘을 누르면 해당 경로로 이동한다', () => {
    render(
      <MemoryRouter>
        <ShortcutGrid />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('퀘스트'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/quests')
  })

  it('물 기록은 여전히 전용 화면으로 이동한다', () => {
    render(
      <MemoryRouter>
        <ShortcutGrid />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('물 기록'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/water')
  })

  // MY 탭 개편(1a/2a 시안) — 영양제는 더 이상 화면 이동이 아니라 즉시 토글이다(⚠️ 임의 변경 금지 항목).
  it('영양제는 화면 이동 없이 onToggleSupplement만 호출한다', () => {
    const onToggleSupplement = vi.fn()
    render(
      <MemoryRouter>
        <ShortcutGrid supplementTaken={false} onToggleSupplement={onToggleSupplement} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('영양제'))
    expect(onToggleSupplement).toHaveBeenCalledTimes(1)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
