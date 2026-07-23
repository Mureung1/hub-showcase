import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../components/scheduler/homeApi', () => ({
  fetchHomeVisits: vi.fn(),
  markHomeVisitsRead: vi.fn(),
}))

const homeApi = await import('../../components/scheduler/homeApi')
const { useHomeManager } = await import('../../components/scheduler/useHomeManager')

const VISIT = { id: 'v1', visitor: { id: 'friend-1', name: '친구' }, action: 'PAT' as const, message: null, read: false, createdAt: '2026-07-23T00:00:00.000Z' }

describe('useHomeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(homeApi.markHomeVisitsRead).mockResolvedValue(undefined)
  })

  it('마운트되면 방문 기록을 불러오고 로딩을 끝낸다', async () => {
    vi.mocked(homeApi.fetchHomeVisits).mockResolvedValue([VISIT])

    const { result } = renderHook(() => useHomeManager())

    expect(result.current.visitsLoading).toBe(true)
    await waitFor(() => expect(result.current.visitsLoading).toBe(false))
    expect(result.current.visits).toEqual([VISIT])
  })

  it('안 읽은 방문이 있으면 markVisitsRead가 전부 읽음으로 바꾸고 API를 호출한다', async () => {
    vi.mocked(homeApi.fetchHomeVisits).mockResolvedValue([VISIT])
    const { result } = renderHook(() => useHomeManager())
    await waitFor(() => expect(result.current.visitsLoading).toBe(false))

    await act(async () => {
      await result.current.markVisitsRead()
    })

    expect(result.current.visits.every((visit) => visit.read)).toBe(true)
    expect(homeApi.markHomeVisitsRead).toHaveBeenCalledOnce()
  })

  it('전부 이미 읽은 상태면 markVisitsRead는 API를 호출하지 않는다', async () => {
    vi.mocked(homeApi.fetchHomeVisits).mockResolvedValue([{ ...VISIT, read: true }])
    const { result } = renderHook(() => useHomeManager())
    await waitFor(() => expect(result.current.visitsLoading).toBe(false))

    await act(async () => {
      await result.current.markVisitsRead()
    })

    expect(homeApi.markHomeVisitsRead).not.toHaveBeenCalled()
  })
})
