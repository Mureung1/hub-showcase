// 리더보드가 간헐적으로 안 뜨던 문제(데모 전날 실측)의 회귀 테스트.
// 토큰 갱신이 끝나기 전에 나간 RPC가 401을 받으면, 예전에는 그대로 에러 화면이 됐다.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
const getSession = vi.fn()

vi.mock('./supabase.js', () => ({
  supabase: {
    rpc: (...args) => rpc(...args),
    auth: { getSession: (...args) => getSession(...args) },
  },
}))

const { rpcWithAuthRetry } = await import('./supabaseRpc.js')

const OK = { data: [{ rank: 1 }], error: null }
const AUTH_401 = { data: null, error: { status: 401, message: 'JWT expired' } }
const NOT_FOUND = { data: null, error: { status: 404, message: 'function get_x does not exist' } }
const LIVE_SESSION = { data: { session: { access_token: 'fresh' } }, error: null }

describe('rpcWithAuthRetry', () => {
  beforeEach(() => {
    rpc.mockReset()
    getSession.mockReset()
  })

  it('성공하면 그대로 돌려주고 세션을 건드리지 않는다', async () => {
    rpc.mockResolvedValueOnce(OK)
    await expect(rpcWithAuthRetry('get_xp_leaderboard')).resolves.toEqual(OK)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('401이면 세션을 갱신하고 한 번 더 시도해 복구한다', async () => {
    // 이게 이 파일의 존재 이유다 — 갱신 중에 나간 첫 요청이 거부되는 창.
    rpc.mockResolvedValueOnce(AUTH_401).mockResolvedValueOnce(OK)
    getSession.mockResolvedValueOnce(LIVE_SESSION)

    await expect(rpcWithAuthRetry('get_xp_leaderboard')).resolves.toEqual(OK)
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('인자가 없으면 supabase.rpc에도 인자를 넘기지 않는다', async () => {
    // undefined를 넘겨도 동작은 같지만 호출 시그니처가 달라져, 이 래퍼로 갈아탄 것만으로
    // 기존 호출부의 테스트가 깨진다(실제로 깨졌다).
    rpc.mockResolvedValueOnce(OK)
    await rpcWithAuthRetry('get_xp_leaderboard')
    expect(rpc).toHaveBeenCalledWith('get_xp_leaderboard')
  })

  it('인자를 그대로 다시 보낸다', async () => {
    rpc.mockResolvedValueOnce(AUTH_401).mockResolvedValueOnce(OK)
    getSession.mockResolvedValueOnce(LIVE_SESSION)

    await rpcWithAuthRetry('increment_total_xp', { p_delta: 15 })
    expect(rpc).toHaveBeenNthCalledWith(1, 'increment_total_xp', { p_delta: 15 })
    expect(rpc).toHaveBeenNthCalledWith(2, 'increment_total_xp', { p_delta: 15 })
  })

  it('인증과 무관한 오류는 재시도하지 않는다', async () => {
    // "SQL 함수를 아직 안 만들었다" 같은 진짜 원인을 두 배로 늦게 알게 될 뿐이다.
    rpc.mockResolvedValueOnce(NOT_FOUND)
    await expect(rpcWithAuthRetry('get_xp_leaderboard')).resolves.toEqual(NOT_FOUND)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('재시도는 정확히 한 번 — 두 번째도 401이면 그 오류를 올린다', async () => {
    // 무한 재시도는 세션이 진짜로 끝난 사용자를 영원히 매달아두고 요청만 쌓는다.
    rpc.mockResolvedValue(AUTH_401)
    getSession.mockResolvedValueOnce(LIVE_SESSION)

    const result = await rpcWithAuthRetry('get_xp_leaderboard')
    expect(result.error.status).toBe(401)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('세션 갱신 자체가 실패하면 원래 오류를 그대로 올린다', async () => {
    // 리프레시 토큰까지 죽은 경우 — 화면이 재시도 버튼/로그인 유도를 보여줄 수 있어야 한다.
    rpc.mockResolvedValueOnce(AUTH_401)
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null })

    const result = await rpcWithAuthRetry('get_xp_leaderboard')
    expect(result).toEqual(AUTH_401)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('getSession이 던져도 원래 오류로 안전하게 떨어진다', async () => {
    rpc.mockResolvedValueOnce(AUTH_401)
    getSession.mockRejectedValueOnce(new Error('network down'))

    await expect(rpcWithAuthRetry('get_xp_leaderboard')).resolves.toEqual(AUTH_401)
  })

  it('메시지로만 알 수 있는 인증 오류도 잡는다', async () => {
    // PostgREST/GoTrue가 status 없이 메시지만 주는 경우가 있다.
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'JWT expired' } }).mockResolvedValueOnce(OK)
    getSession.mockResolvedValueOnce(LIVE_SESSION)

    await expect(rpcWithAuthRetry('get_xp_leaderboard')).resolves.toEqual(OK)
  })
})
