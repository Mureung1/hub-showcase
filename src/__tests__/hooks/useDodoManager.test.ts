import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../components/scheduler/dodoApi', () => ({
  fetchDodoState: vi.fn(),
  fetchDodoAppearance: vi.fn(),
  equipRoomItem: vi.fn(),
  unequipRoomItem: vi.fn(),
}))

const dodoApi = await import('../../components/scheduler/dodoApi')
const { useDodoManager } = await import('../../components/scheduler/useDodoManager')

describe('useDodoManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dodoApi.fetchDodoState).mockResolvedValue({ mood: 3, behavior: 'WAITING' })
    vi.mocked(dodoApi.fetchDodoAppearance).mockResolvedValue({ hat: null, glasses: null, outfit: null, accessory: null })
  })

  it('마운트되면 두두 상태와 외형을 둘 다 불러온다', async () => {
    const { result } = renderHook(() => useDodoManager())

    await waitFor(() => expect(result.current.state).toEqual({ mood: 3, behavior: 'WAITING' }))
    expect(result.current.appearance).toEqual({ hat: null, glasses: null, outfit: null, accessory: null })
  })

  it('refreshDodoState를 호출하면 상태를 다시 불러온다', async () => {
    const { result } = renderHook(() => useDodoManager())
    await waitFor(() => expect(result.current.state).not.toBeNull())

    vi.mocked(dodoApi.fetchDodoState).mockResolvedValue({ mood: 4, behavior: 'ALL_DONE' })
    await act(async () => {
      result.current.refreshDodoState()
    })

    expect(result.current.state).toEqual({ mood: 4, behavior: 'ALL_DONE' })
  })

  it('equip은 착용 API를 호출하고 응답으로 외형 상태를 갱신한다', async () => {
    const { result } = renderHook(() => useDodoManager())
    await waitFor(() => expect(result.current.appearance).not.toBeNull())

    const equipped = { hat: null, glasses: null, outfit: null, accessory: { itemId: 'item-headphones', iconKey: 'headphones', color: null } }
    vi.mocked(dodoApi.equipRoomItem).mockResolvedValue(equipped)

    await act(async () => {
      await result.current.equip('inv-1')
    })

    expect(dodoApi.equipRoomItem).toHaveBeenCalledWith('inv-1')
    expect(result.current.appearance).toEqual(equipped)
  })

  it('unequip은 해제 API를 호출하고 응답으로 외형 상태를 갱신한다', async () => {
    const { result } = renderHook(() => useDodoManager())
    await waitFor(() => expect(result.current.appearance).not.toBeNull())

    const cleared = { hat: null, glasses: null, outfit: null, accessory: null }
    vi.mocked(dodoApi.unequipRoomItem).mockResolvedValue(cleared)

    await act(async () => {
      await result.current.unequip('inv-1')
    })

    expect(dodoApi.unequipRoomItem).toHaveBeenCalledWith('inv-1')
    expect(result.current.appearance).toEqual(cleared)
  })

  it('상태 조회가 실패해도(catch) 예외를 던지지 않고 null로 남는다', async () => {
    vi.mocked(dodoApi.fetchDodoState).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useDodoManager())

    await waitFor(() => expect(dodoApi.fetchDodoState).toHaveBeenCalled())
    expect(result.current.state).toBeNull()
  })
})
