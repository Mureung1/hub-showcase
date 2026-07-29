import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import LevelCard from './LevelCard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getLevelState } from '../lib/dataStore.js'
import { MAX_TOTAL_XP } from '../lib/levelSystem.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ getLevelState: vi.fn() }))

describe('LevelCard', () => {
  it('불러오기 전에는 아무 것도 그리지 않는다', () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getLevelState.mockReturnValue(new Promise(() => {})) // 영원히 대기
    const { container } = render(<LevelCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('totalXp 0이면 Lv.1, 다음 레벨까지 10 XP', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getLevelState.mockResolvedValue({ totalXp: 0 })
    render(<LevelCard />)
    await waitFor(() => expect(screen.getByText('Lv.1')).toBeInTheDocument())
    expect(screen.getByText('다음 레벨까지 10 XP')).toBeInTheDocument()
  })

  it('레벨 경계를 넘긴 값이면 올라간 레벨과 남은 XP를 보여준다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getLevelState.mockResolvedValue({ totalXp: 15 }) // 레벨2(10) + 5 진행 -> 다음(20)까지 15 남음
    render(<LevelCard />)
    await waitFor(() => expect(screen.getByText('Lv.2')).toBeInTheDocument())
    expect(screen.getByText('다음 레벨까지 15 XP')).toBeInTheDocument()
  })

  it('만렙이면 전용 문구를 보여준다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getLevelState.mockResolvedValue({ totalXp: MAX_TOTAL_XP })
    render(<LevelCard />)
    await waitFor(() => expect(screen.getByText('Lv.100')).toBeInTheDocument())
    expect(screen.getByText('만렙을 달성했어요!')).toBeInTheDocument()
  })

  it('조회 실패해도 조용히 Lv.1(0 XP)로 안전하게 표시한다', async () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    getLevelState.mockRejectedValue(new Error('network'))
    render(<LevelCard />)
    await waitFor(() => expect(screen.getByText('Lv.1')).toBeInTheDocument())
  })
})
