import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../components/scheduler/api', () => ({
  fetchSchedules: vi.fn(),
  fetchCategories: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  updateCategoryVisibility: vi.fn(),
}))

const api = await import('../../components/scheduler/api')
const { useScheduleManager } = await import('../../components/scheduler/useScheduleManager')

const CATEGORY = { id: 'cat-1', name: '운동', color: '#f2a58d', tone: 'coral' as const, visibleTo: [] as string[] }
const SCHEDULE = { id: 's1', date: '2026-07-23', title: '운동 일정', time: '19:00', category: 'cat-1', tone: 'coral' as const, completed: false }

async function renderReady() {
  const view = renderHook(() => useScheduleManager())
  await waitFor(() => expect(view.result.current.schedulesLoading).toBe(false))
  return view
}

describe('useScheduleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchSchedules).mockResolvedValue([SCHEDULE])
    vi.mocked(api.fetchCategories).mockResolvedValue([CATEGORY])
  })

  it('마운트되면 일정과 카테고리를 불러온다', async () => {
    const { result } = await renderReady()

    expect(result.current.schedules).toEqual([SCHEDULE])
    expect(result.current.categories).toEqual([CATEGORY])
  })

  it('addSchedule은 선택한 날짜에 일정을 만들고 안내 문구를 띄운다', async () => {
    const { result } = await renderReady()
    const created = { ...SCHEDULE, id: 's2', title: '운동 일정' }
    vi.mocked(api.createSchedule).mockResolvedValue(created)

    await act(async () => {
      await result.current.addSchedule(CATEGORY)
    })

    expect(result.current.schedules).toContainEqual(created)
    expect(result.current.notice).toContain('추가했어요')
  })

  it('addSchedule 실패 시 안내 문구만 남고 목록은 그대로다', async () => {
    const { result } = await renderReady()
    vi.mocked(api.createSchedule).mockRejectedValue(new Error('network error'))

    await act(async () => {
      await result.current.addSchedule(CATEGORY)
    })

    expect(result.current.schedules).toEqual([SCHEDULE])
    expect(result.current.notice).toContain('추가하지 못했어요')
  })

  it('toggleScheduleCompletion은 미완료→완료로 바뀌면 "완료했어요" 문구를 띄운다', async () => {
    const { result } = await renderReady()
    vi.mocked(api.updateSchedule).mockResolvedValue({ ...SCHEDULE, completed: true })

    await act(async () => {
      await result.current.toggleScheduleCompletion('s1')
    })

    expect(api.updateSchedule).toHaveBeenCalledWith('s1', { completed: true })
    expect(result.current.schedules[0].completed).toBe(true)
    expect(result.current.notice).toBe('일정을 완료했어요!')
  })

  it('toggleScheduleCompletion은 완료→미완료로 바뀌면 "되돌렸어요" 문구를 띄운다', async () => {
    vi.mocked(api.fetchSchedules).mockResolvedValue([{ ...SCHEDULE, completed: true }])
    const { result } = await renderReady()
    vi.mocked(api.updateSchedule).mockResolvedValue({ ...SCHEDULE, completed: false })

    await act(async () => {
      await result.current.toggleScheduleCompletion('s1')
    })

    expect(api.updateSchedule).toHaveBeenCalledWith('s1', { completed: false })
    expect(result.current.notice).toBe('일정을 미완료 상태로 되돌렸어요.')
  })

  it('deleteSchedule은 목록에서 지우고 편집기를 닫는다', async () => {
    const { result } = await renderReady()
    act(() => {
      result.current.openScheduleEditor(SCHEDULE)
    })
    expect(result.current.editingScheduleId).toBe('s1')

    await act(async () => {
      await result.current.deleteSchedule(SCHEDULE)
    })

    expect(result.current.schedules).toEqual([])
    expect(result.current.editingScheduleId).toBeNull()
  })

  it('saveScheduleChanges는 제목이 비어있으면 API를 호출하지 않고 안내만 띄운다', async () => {
    const { result } = await renderReady()
    act(() => {
      result.current.openScheduleEditor(SCHEDULE)
      result.current.setDraftTitle('   ')
    })

    await act(async () => {
      await result.current.saveScheduleChanges('s1')
    })

    expect(api.updateSchedule).not.toHaveBeenCalled()
    expect(result.current.notice).toBe('일정 이름을 입력해주세요.')
  })

  it('createCategory 실패 시 서버 에러 메시지를 그대로 안내한다', async () => {
    const { result } = await renderReady()
    vi.mocked(api.createCategory).mockRejectedValue(new Error('카테고리는 최대 8개까지예요.'))

    await act(async () => {
      await result.current.createCategory('새 카테고리', 'blue')
    })

    expect(result.current.notice).toBe('카테고리는 최대 8개까지예요.')
    expect(result.current.categories).toEqual([CATEGORY])
  })

  it('toggleVisibleGroup은 이미 공개된 그룹이면 빼고, 아니면 추가한다', async () => {
    const { result } = await renderReady()
    vi.mocked(api.updateCategoryVisibility).mockResolvedValue({ ...CATEGORY, visibleTo: ['group-1'] })

    await act(async () => {
      await result.current.toggleVisibleGroup('cat-1', 'group-1')
    })
    expect(api.updateCategoryVisibility).toHaveBeenCalledWith('cat-1', ['group-1'])

    vi.mocked(api.updateCategoryVisibility).mockResolvedValue({ ...CATEGORY, visibleTo: [] })
    await act(async () => {
      await result.current.toggleVisibleGroup('cat-1', 'group-1')
    })
    expect(api.updateCategoryVisibility).toHaveBeenCalledWith('cat-1', [])
  })
})
