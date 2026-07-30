import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LeaderboardPodium from './LeaderboardPodium.jsx'

const TOP3 = [
  { rank: 1, nickname: '단짠주의보', totalXp: 265, level: 7, isMe: false },
  { rank: 2, nickname: '헬스가디언', totalXp: 245, level: 7, isMe: false },
  { rank: 3, nickname: '미라클모닝', totalXp: 225, level: 7, isMe: true },
]

describe('LeaderboardPodium', () => {
  it('1/2/3등 닉네임과 레벨·XP를 모두 보여준다', () => {
    render(<LeaderboardPodium top3={TOP3} />)
    expect(screen.getByText(/단짠주의보/)).toBeInTheDocument()
    expect(screen.getByText(/헬스가디언/)).toBeInTheDocument()
    expect(screen.getByText(/미라클모닝/)).toBeInTheDocument()
    expect(screen.getByText('Lv.7 · 265XP')).toBeInTheDocument()
  })

  it('1등 왕관, 2/3등 메달 아이콘을 각각 보여준다', () => {
    render(<LeaderboardPodium top3={TOP3} />)
    expect(screen.getByText('👑')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText('🥉')).toBeInTheDocument()
  })

  it('내 순위에는 "(나)" 표시가 붙는다', () => {
    render(<LeaderboardPodium top3={TOP3} />)
    expect(screen.getByText(/미라클모닝 \(나\)/)).toBeInTheDocument()
  })

  it('일부 순위가 없으면(테스트용 부분 데이터) 그 자리만 비운다', () => {
    render(<LeaderboardPodium top3={[TOP3[0]]} />)
    expect(screen.getByText('👑')).toBeInTheDocument()
    expect(screen.queryByText('🥈')).not.toBeInTheDocument()
    expect(screen.queryByText('🥉')).not.toBeInTheDocument()
  })
})
