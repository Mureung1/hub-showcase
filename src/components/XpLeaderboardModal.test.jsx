import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import XpLeaderboardModal from './XpLeaderboardModal.jsx'

const ROWS = [
  { rank: 1, nickname: '단짠주의보', totalXp: 3200, level: 25, isMe: false },
  { rank: 2, nickname: '헬스가디언', totalXp: 2600, level: 23, isMe: false },
  { rank: 5, nickname: '나', totalXp: 150, level: 5, isMe: true },
]

describe('XpLeaderboardModal', () => {
  it('행마다 순위·닉네임·레벨·XP를 렌더하고 상위 3명은 메달 아이콘을 보여준다', () => {
    render(<XpLeaderboardModal rows={ROWS} onClose={() => {}} />)
    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText(/단짠주의보/)).toBeInTheDocument()
    expect(screen.getByText('Lv.25 · 3200XP')).toBeInTheDocument()
  })

  it('내 행에는 "(나)" 표시가 붙는다', () => {
    render(<XpLeaderboardModal rows={ROWS} onClose={() => {}} />)
    expect(screen.getByText(/나 \(나\)/)).toBeInTheDocument()
  })

  it('rows가 비어 있으면 안내 문구를 보여준다', () => {
    render(<XpLeaderboardModal rows={[]} onClose={() => {}} />)
    expect(screen.getByText('아직 리더보드에 아무도 없어요.')).toBeInTheDocument()
  })

  it('닫기 버튼을 누르면 onClose가 호출된다', () => {
    const onClose = vi.fn()
    render(<XpLeaderboardModal rows={ROWS} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
