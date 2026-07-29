import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import BadgeShelfCard from './BadgeShelfCard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getUnlockedBadgeIds } from '../lib/dataStore.js'
import { BADGES } from '../lib/badgeSystem.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ getUnlockedBadgeIds: vi.fn() }))
vi.mock('./BadgeDexModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="badge-dex-modal">
      <button type="button" onClick={() => onClose(['streak-3', 'streak-7'])}>
        모달 닫기
      </button>
    </div>
  ),
}))

describe('BadgeShelfCard', () => {
  it('불러오기 전에는 아무 것도 그리지 않는다', () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getUnlockedBadgeIds.mockReturnValue(new Promise(() => {}))
    const { container } = render(<BadgeShelfCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('획득 배지 개수를 보여준다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getUnlockedBadgeIds.mockResolvedValue(['streak-3'])
    render(<BadgeShelfCard />)
    await waitFor(() => expect(screen.getByText(`획득 배지 1/${BADGES.length}개`)).toBeInTheDocument())
  })

  it('도감 보기를 누르면 모달이 열리고, 모달이 닫히면 개수가 갱신된다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getUnlockedBadgeIds.mockResolvedValue(['streak-3'])
    render(<BadgeShelfCard />)
    await waitFor(() => expect(screen.getByText(`획득 배지 1/${BADGES.length}개`)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '도감 보기' }))
    expect(screen.getByTestId('badge-dex-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '모달 닫기' }))
    expect(screen.queryByTestId('badge-dex-modal')).not.toBeInTheDocument()
    expect(screen.getByText(`획득 배지 2/${BADGES.length}개`)).toBeInTheDocument()
  })

  it('조회 실패해도 조용히 0개로 표시한다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getUnlockedBadgeIds.mockRejectedValue(new Error('network'))
    render(<BadgeShelfCard />)
    await waitFor(() => expect(screen.getByText(`획득 배지 0/${BADGES.length}개`)).toBeInTheDocument())
  })
})
