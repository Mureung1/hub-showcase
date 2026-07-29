import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import XpLeaderboardModal from './XpLeaderboardModal.jsx'

// getXpLeaderboard()의 rank는 항상 1부터 연속(row_number() 기반)이라, 여기서도 실제 API처럼 배열
// 위치와 rank가 일치하는 형태로 만든다.
const ROWS = [
  { rank: 1, nickname: '단짠주의보', totalXp: 265, level: 7, isMe: false },
  { rank: 2, nickname: '헬스가디언', totalXp: 245, level: 7, isMe: false },
  { rank: 3, nickname: '미라클모닝', totalXp: 225, level: 7, isMe: false },
  { rank: 4, nickname: '도전365', totalXp: 205, level: 6, isMe: false },
  { rank: 5, nickname: '나', totalXp: 150, level: 5, isMe: true },
]

describe('XpLeaderboardModal', () => {
  it('상위 3명은 시상대(포디움)로 보여주고, 4등부터 목록에 나온다', () => {
    render(<XpLeaderboardModal rows={ROWS} onClose={() => {}} />)
    expect(screen.getByText('👑')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText('🥉')).toBeInTheDocument()
    expect(screen.getByText(/단짠주의보/)).toBeInTheDocument()
    // 4등(도전365)은 목록에, 1~3등은 목록이 아니라 포디움에만 있어야 한다("N위" 텍스트로 확인).
    expect(screen.getByText('4위')).toBeInTheDocument()
    expect(screen.queryByText('1위')).not.toBeInTheDocument()
  })

  it('내 행에는 "(나)" 표시가 붙는다', () => {
    render(<XpLeaderboardModal rows={ROWS} onClose={() => {}} />)
    expect(screen.getByText(/나 \(나\)/)).toBeInTheDocument()
  })

  it('rows가 3명 미만이면 포디움 없이 전체를 목록으로 보여준다', () => {
    const fewRows = ROWS.slice(0, 2)
    render(<XpLeaderboardModal rows={fewRows} onClose={() => {}} />)
    expect(screen.queryByText('👑')).not.toBeInTheDocument()
    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
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
