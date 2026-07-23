import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../components/scheduler/roomItemsApi', () => ({
  fetchRoomItems: vi.fn(),
  fetchRoomInventory: vi.fn(),
  fetchRoomLayout: vi.fn(),
  purchaseRoomItem: vi.fn(),
  placeRoomItem: vi.fn(),
  removeRoomItemPlacement: vi.fn(),
}))

const roomItemsApi = await import('../../components/scheduler/roomItemsApi')
const { useRoomShopManager } = await import('../../components/scheduler/useRoomShopManager')

const PLACED_AT = '2026-01-01T00:00:00.000Z'

const CONSOLE_ITEM = {
  id: 'item-game-console', name: '게임기', cost: 300, type: 'FURNITURE' as const, iconKey: 'game-console',
  equippable: false, interactable: true, colorCustomizable: true, placeable: true, wallMounted: false, repeatable: false,
}

async function renderReady(onPointsSpent = vi.fn()) {
  const view = renderHook(() => useRoomShopManager(onPointsSpent))
  await waitFor(() => expect(view.result.current.catalogLoading).toBe(false))
  await waitFor(() => expect(view.result.current.inventoryLoading).toBe(false))
  return view
}

describe('useRoomShopManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(roomItemsApi.fetchRoomItems).mockResolvedValue([CONSOLE_ITEM])
    vi.mocked(roomItemsApi.fetchRoomInventory).mockResolvedValue([])
    vi.mocked(roomItemsApi.fetchRoomLayout).mockResolvedValue([])
  })

  it('마운트되면 카탈로그·인벤토리·배치를 각각 불러온다', async () => {
    const { result } = await renderReady()

    expect(result.current.catalog).toEqual([CONSOLE_ITEM])
    expect(result.current.inventory).toEqual([])
    expect(result.current.layout).toEqual([])
  })

  it('구매에 성공하면 인벤토리에 새 인스턴스를 추가하고 onPointsSpent를 호출한다', async () => {
    const onPointsSpent = vi.fn()
    const { result } = await renderReady(onPointsSpent)
    vi.mocked(roomItemsApi.purchaseRoomItem).mockResolvedValue({ balance: 700, inventoryId: 'inv-new', color: '#a9c8ec' })

    await act(async () => {
      await result.current.purchase('item-game-console', '#a9c8ec')
    })

    expect(result.current.inventory).toEqual([{
      id: 'inv-new', itemId: 'item-game-console', name: '게임기', cost: 300, iconKey: 'game-console',
      equippable: false, interactable: true, colorCustomizable: true, placeable: true, wallMounted: false, repeatable: false,
      color: '#a9c8ec',
    }])
    expect(onPointsSpent).toHaveBeenCalledOnce()
    expect(result.current.purchasingId).toBeNull()
  })

  it('구매에 실패하면 서버 에러 메시지를 안내하고 인벤토리는 그대로다', async () => {
    const { result } = await renderReady()
    vi.mocked(roomItemsApi.purchaseRoomItem).mockRejectedValue(new Error('포인트가 부족해요.'))

    await act(async () => {
      await result.current.purchase('item-game-console', '#a9c8ec')
    })

    expect(result.current.notice).toBe('포인트가 부족해요.')
    expect(result.current.inventory).toEqual([])
  })

  it('placeInRoom은 아이콘별 기본 위치로 배치를 저장한다', async () => {
    vi.mocked(roomItemsApi.fetchRoomInventory).mockResolvedValue([{
      id: 'inv-1', itemId: 'item-game-console', name: '게임기', cost: 300, iconKey: 'game-console',
      equippable: false, interactable: true, colorCustomizable: true, placeable: true, wallMounted: false, repeatable: false, color: '#a9c8ec',
    }])
    const { result } = await renderReady()
    vi.mocked(roomItemsApi.placeRoomItem).mockResolvedValue({ x: 32, y: 72, placedAt: PLACED_AT })

    await act(async () => {
      await result.current.placeInRoom('inv-1')
    })

    // useRoomShopManager의 DEFAULT_PLACEMENT['game-console']과 일치해야 한다.
    expect(roomItemsApi.placeRoomItem).toHaveBeenCalledWith('inv-1', 32, 72)
    expect(result.current.layout).toEqual([{ inventoryId: 'inv-1', itemId: 'item-game-console', color: '#a9c8ec', x: 32, y: 72, placedAt: PLACED_AT }])
  })

  it('removeFromRoom은 배치 목록에서 즉시 제거한 뒤(optimistic) 서버에도 삭제를 요청한다', async () => {
    vi.mocked(roomItemsApi.fetchRoomLayout).mockResolvedValue([{ inventoryId: 'inv-1', itemId: 'item-game-console', color: null, x: 32, y: 72, placedAt: PLACED_AT }])
    const { result } = await renderReady()
    await waitFor(() => expect(result.current.layout).toHaveLength(1))

    await act(async () => {
      await result.current.removeFromRoom('inv-1')
    })

    expect(result.current.layout).toEqual([])
    expect(roomItemsApi.removeRoomItemPlacement).toHaveBeenCalledWith('inv-1')
  })

  it('setLocalPosition은 서버 호출 없이 로컬 상태만 바꾼다(드래그 중)', async () => {
    vi.mocked(roomItemsApi.fetchRoomLayout).mockResolvedValue([{ inventoryId: 'inv-1', itemId: 'item-game-console', color: null, x: 10, y: 10, placedAt: PLACED_AT }])
    const { result } = await renderReady()
    await waitFor(() => expect(result.current.layout).toHaveLength(1))

    act(() => {
      result.current.setLocalPosition('inv-1', 55, 66)
    })

    expect(result.current.layout[0]).toMatchObject({ x: 55, y: 66 })
    expect(roomItemsApi.placeRoomItem).not.toHaveBeenCalled()
  })

  it('commitPosition은 드래그가 끝났을 때 최종 좌표를 서버에 저장한다', async () => {
    const { result } = await renderReady()

    await act(async () => {
      await result.current.commitPosition('inv-1', 40, 41)
    })

    expect(roomItemsApi.placeRoomItem).toHaveBeenCalledWith('inv-1', 40, 41)
  })

  it('간식을 구매하면 "방에 놓기"를 누르지 않아도 테이블 없이는 바닥 기본 자리에 자동 배치된다', async () => {
    const FRIED_EGG = {
      id: 'item-fried-egg', name: '계란후라이', cost: 50, type: 'FURNITURE' as const, iconKey: 'fried-egg',
      equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, repeatable: true,
    }
    vi.mocked(roomItemsApi.fetchRoomItems).mockResolvedValue([FRIED_EGG])
    const { result } = await renderReady()
    vi.mocked(roomItemsApi.purchaseRoomItem).mockResolvedValue({ balance: 950, inventoryId: 'inv-egg-1', color: null })
    vi.mocked(roomItemsApi.placeRoomItem).mockImplementation((_id, x, y) => Promise.resolve({ x, y, placedAt: PLACED_AT }))

    await act(async () => {
      await result.current.purchase('item-fried-egg')
    })

    // 테이블이 없을 때의 기본 바닥 자리(computeFoodPlacement 기준)에 자동으로 놓여야 한다.
    expect(roomItemsApi.placeRoomItem).toHaveBeenCalledWith('inv-egg-1', 25, 88)
    expect(result.current.layout).toEqual([{ inventoryId: 'inv-egg-1', itemId: 'item-fried-egg', color: null, x: 25, y: 88, placedAt: PLACED_AT }])
  })

  it('같은 간식을 두 번째 살 때는 같은 자리에 이미 놓인 개수만큼 옆으로 밀려서 겹치지 않는다', async () => {
    const TOAST = {
      id: 'item-toast', name: '토스트', cost: 50, type: 'FURNITURE' as const, iconKey: 'toast',
      equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, repeatable: true,
    }
    vi.mocked(roomItemsApi.fetchRoomItems).mockResolvedValue([TOAST])
    vi.mocked(roomItemsApi.fetchRoomInventory).mockResolvedValue([
      { id: 'inv-toast-1', itemId: 'item-toast', name: '토스트', cost: 50, iconKey: 'toast', equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, repeatable: true, color: null },
    ])
    vi.mocked(roomItemsApi.fetchRoomLayout).mockResolvedValue([
      { inventoryId: 'inv-toast-1', itemId: 'item-toast', color: null, x: 25, y: 88, placedAt: PLACED_AT },
    ])
    const { result } = await renderReady()
    await waitFor(() => expect(result.current.layout).toHaveLength(1))
    vi.mocked(roomItemsApi.purchaseRoomItem).mockResolvedValue({ balance: 900, inventoryId: 'inv-toast-2', color: null })
    vi.mocked(roomItemsApi.placeRoomItem).mockImplementation((_id, x, y) => Promise.resolve({ x, y, placedAt: PLACED_AT }))

    await act(async () => {
      await result.current.purchase('item-toast')
    })

    // 이미 같은 자리(y:88)에 토스트 1개가 있으니 x가 12만큼 밀린 37이어야 한다.
    expect(roomItemsApi.placeRoomItem).toHaveBeenCalledWith('inv-toast-2', 37, 88)
  })

  it('repeatable 아이템이 아니면 placeInRoom은 아이콘별 기본 위치를 그대로 쓴다(간식 전용 겹침 방지 로직 미적용)', async () => {
    vi.mocked(roomItemsApi.fetchRoomInventory).mockResolvedValue([{
      id: 'inv-1', itemId: 'item-game-console', name: '게임기', cost: 300, iconKey: 'game-console',
      equippable: false, interactable: true, colorCustomizable: true, placeable: true, wallMounted: false, repeatable: false, color: '#a9c8ec',
    }])
    const { result } = await renderReady()
    vi.mocked(roomItemsApi.placeRoomItem).mockResolvedValue({ x: 32, y: 72, placedAt: PLACED_AT })

    await act(async () => {
      await result.current.placeInRoom('inv-1')
    })

    expect(roomItemsApi.placeRoomItem).toHaveBeenCalledWith('inv-1', 32, 72)
  })
})
