import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from './supabase.js'
import { getXpLeaderboard } from './xpLeaderboard.js'

vi.mock('./supabase.js', () => ({ supabase: { rpc: vi.fn() } }))

describe('getXpLeaderboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('행마다 total_xp로부터 레벨을 계산해 붙인다', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { rank: 1, nickname: '단짠주의보', total_xp: 3200, is_me: false },
        { rank: 5, nickname: '나', total_xp: 150, is_me: true },
      ],
      error: null,
    })

    const result = await getXpLeaderboard()
    expect(supabase.rpc).toHaveBeenCalledWith('get_xp_leaderboard')
    expect(result[0]).toMatchObject({ rank: 1, nickname: '단짠주의보', totalXp: 3200, isMe: false })
    expect(result[0].level).toBeGreaterThan(1)
    expect(result[1]).toMatchObject({ rank: 5, nickname: '나', totalXp: 150, isMe: true })
  })

  it('RPC가 데이터 없이 성공하면 빈 배열을 반환한다', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null })
    expect(await getXpLeaderboard()).toEqual([])
  })

  it('에러가 나면 사용자용 메시지로 던진다', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(getXpLeaderboard()).rejects.toThrow('boom')
  })
})
