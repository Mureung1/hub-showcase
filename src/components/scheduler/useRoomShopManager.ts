import { useEffect, useState } from 'react'
import * as roomItemsApi from './roomItemsApi'
import type { RoomInventoryItem, RoomItem, RoomLayoutEntry } from './types'

// 처음 방에 놓을 때 아이템끼리 겹치지 않도록 아이콘별로 다른 기본 위치를 쓴다.
// window/wall-star/wall-shelf는 wallMounted라 y가 벽 영역(WALL_BAND, StaticViews.tsx) 안에 있어야 한다.
const DEFAULT_PLACEMENT: Record<string, { x: number; y: number }> = {
  'game-console': { x: 32, y: 72 },
  'pillow': { x: 68, y: 72 },
  'table': { x: 50, y: 80 },
  'window': { x: 25, y: 20 },
  'plant': { x: 85, y: 78 },
  'wall-star': { x: 12, y: 38 },
  'wall-shelf': { x: 75, y: 35 },
}

export function useRoomShopManager(onPointsSpent: () => void) {
  const [catalog, setCatalog] = useState<RoomItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [inventory, setInventory] = useState<RoomInventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [layout, setLayout] = useState<RoomLayoutEntry[]>([])
  const [notice, setNotice] = useState('')
  const [purchasingId, setPurchasingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    roomItemsApi.fetchRoomItems()
      .then((loaded) => { if (!cancelled) setCatalog(loaded) })
      .catch(() => { if (!cancelled) setNotice('상점 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.') })
      .finally(() => { if (!cancelled) setCatalogLoading(false) })

    roomItemsApi.fetchRoomInventory()
      .then((loaded) => { if (!cancelled) setInventory(loaded) })
      .catch(() => { if (!cancelled) setNotice('인벤토리를 불러오지 못했어요. 잠시 후 다시 시도해주세요.') })
      .finally(() => { if (!cancelled) setInventoryLoading(false) })

    roomItemsApi.fetchRoomLayout()
      .then((loaded) => { if (!cancelled) setLayout(loaded) })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const purchase = async (itemId: string, color?: string) => {
    setPurchasingId(itemId)
    try {
      const result = await roomItemsApi.purchaseRoomItem(itemId, color)
      const catalogItem = catalog.find((item) => item.id === itemId)
      if (catalogItem) {
        setInventory((current) => [...current, {
          id: result.inventoryId,
          itemId: catalogItem.id,
          name: catalogItem.name,
          cost: catalogItem.cost,
          iconKey: catalogItem.iconKey,
          equippable: catalogItem.equippable,
          interactable: catalogItem.interactable,
          colorCustomizable: catalogItem.colorCustomizable,
          placeable: catalogItem.placeable,
          wallMounted: catalogItem.wallMounted,
          color: result.color,
        }])
      }
      onPointsSpent()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '아이템을 구매하지 못했어요.')
    } finally {
      setPurchasingId(null)
    }
  }

  const placeInRoom = async (inventoryId: string) => {
    const item = inventory.find((entry) => entry.id === inventoryId)
    if (!item) return
    const fallback = DEFAULT_PLACEMENT[item.iconKey] ?? { x: 50, y: 70 }
    try {
      const result = await roomItemsApi.placeRoomItem(inventoryId, fallback.x, fallback.y)
      setLayout((current) => [
        ...current.filter((entry) => entry.inventoryId !== inventoryId),
        { inventoryId, itemId: item.itemId, color: item.color, x: result.x, y: result.y },
      ])
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '방에 놓지 못했어요.')
    }
  }

  const removeFromRoom = async (inventoryId: string) => {
    setLayout((current) => current.filter((entry) => entry.inventoryId !== inventoryId))
    try {
      await roomItemsApi.removeRoomItemPlacement(inventoryId)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '방에서 치우지 못했어요.')
    }
  }

  // 드래그 중에는 로컬 상태만 갱신 — 매 pointermove마다 서버에 저장하지 않는다.
  const setLocalPosition = (inventoryId: string, x: number, y: number) => {
    setLayout((current) => current.map((entry) => (entry.inventoryId === inventoryId ? { ...entry, x, y } : entry)))
  }

  // 드래그가 끝났을 때 최종 위치를 서버에 저장한다.
  const commitPosition = async (inventoryId: string, x: number, y: number) => {
    try {
      await roomItemsApi.placeRoomItem(inventoryId, x, y)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '위치를 저장하지 못했어요.')
    }
  }

  return {
    catalog,
    catalogLoading,
    inventory,
    inventoryLoading,
    layout,
    notice,
    purchasingId,
    purchase,
    placeInRoom,
    removeFromRoom,
    setLocalPosition,
    commitPosition,
  }
}

export type RoomShopManager = ReturnType<typeof useRoomShopManager>
