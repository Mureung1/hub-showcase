import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../components/scheduler/profileApi', () => ({
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
}))

const profileApi = await import('../../components/scheduler/profileApi')
const { useProfileManager } = await import('../../components/scheduler/useProfileManager')

const PROFILE = {
  id: 'u1', email: 'a@b.com', name: '데모', handle: null, bio: null, avatarColor: null, avatarEyes: null,
  stats: { completedCount: 0, friendCount: 0, currentStreak: 0, points: 0 },
}

describe('useProfileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('마운트되면 프로필을 불러오고 로딩을 끝낸다', async () => {
    vi.mocked(profileApi.fetchProfile).mockResolvedValue(PROFILE)

    const { result } = renderHook(() => useProfileManager())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual(PROFILE)
  })

  it('초기 조회가 실패하면 안내 문구를 띄우고 로딩을 끝낸다', async () => {
    vi.mocked(profileApi.fetchProfile).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useProfileManager())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notice).toContain('불러오지 못했어요')
    expect(result.current.profile).toBeNull()
  })

  it('updateProfile 성공 시 프로필을 갱신하고 true를 반환한다', async () => {
    vi.mocked(profileApi.fetchProfile).mockResolvedValue(PROFILE)
    const { result } = renderHook(() => useProfileManager())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const updated = { ...PROFILE, name: '새이름' }
    vi.mocked(profileApi.updateProfile).mockResolvedValue(updated)

    let ok = false
    await act(async () => {
      ok = await result.current.updateProfile({ name: '새이름' })
    })

    expect(ok).toBe(true)
    expect(result.current.profile).toEqual(updated)
    expect(result.current.notice).toBe('프로필을 저장했어요.')
  })

  it('updateProfile 실패 시 서버 에러 메시지를 안내하고 false를 반환한다', async () => {
    vi.mocked(profileApi.fetchProfile).mockResolvedValue(PROFILE)
    const { result } = renderHook(() => useProfileManager())
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(profileApi.updateProfile).mockRejectedValue(new Error('이미 사용 중인 핸들입니다.'))

    let ok = true
    await act(async () => {
      ok = await result.current.updateProfile({ handle: 'taken' })
    })

    expect(ok).toBe(false)
    expect(result.current.notice).toBe('이미 사용 중인 핸들입니다.')
    // 실패했으니 이전 프로필 값을 그대로 유지해야 한다.
    expect(result.current.profile).toEqual(PROFILE)
  })
})
