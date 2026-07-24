import { useEffect, useState } from 'react'
import * as roomItemsApi from './roomItemsApi'
import type { RoomInventoryItem, RoomItem, RoomLayoutEntry } from './types'

// 처음 방에 놓을 때 아이템끼리 겹치지 않도록 아이콘별로 다른 기본 위치를 쓴다.
// window/wall-star/wall-shelf는 wallMounted라 y가 벽 영역(WALL_BAND, StaticViews.tsx) 안에 있어야 한다.
const DEFAULT_PLACEMENT: Record<string, { x: number; y: number }> = {
  'game-console': { x: 32, y: 72 },
  'table': { x: 50, y: 80 },
  'window': { x: 25, y: 20 },
  'plant': { x: 85, y: 78 },
  'wall-star': { x: 12, y: 38 },
  'wall-shelf': { x: 75, y: 35 },
}

// 간식류는 "방에 놓기" 버튼을 누르지 않아도 구매 즉시 자동으로 배치된다.
// "꾸미기" 패널이 아니라 "간식 주기" 버튼에서만 보여줘야 해서 StaticViews.tsx에서도 이 목록을 그대로 가져다 쓴다.
export const FOOD_ICON_KEYS = new Set(['fried-egg', 'toast', 'pancake', 'rice'])

// 간식류는 방에 놓인 지 1시간이 지나면 자동으로 치워진다.
const FOOD_EXPIRY_MS = 60 * 60 * 1000

function isFoodEntry(entry: RoomLayoutEntry, inventory: RoomInventoryItem[]) {
  const invItem = inventory.find((candidate) => candidate.id === entry.inventoryId)
  return Boolean(invItem && FOOD_ICON_KEYS.has(invItem.iconKey))
}

// 테이블(item-table)이 방에 놓여있으면 그 위에, 없으면 바닥의 기본 자리에 놓는다.
// 이미 같은 자리(테이블 위 또는 바닥)에 놓인 간식 개수만큼 옆으로 밀어서 겹치지 않게 한다.
function computeFoodPlacement(layout: RoomLayoutEntry[], inventory: RoomInventoryItem[]) {
  const tableEntry = layout.find((entry) => entry.itemId === 'item-table')
  const base = tableEntry ? { x: tableEntry.x - 15, y: tableEntry.y - 10 } : { x: 25, y: 88 }

  const sameSpotFoodCount = layout.filter((entry) => {
    const invItem = inventory.find((candidate) => candidate.id === entry.inventoryId)
    return invItem && FOOD_ICON_KEYS.has(invItem.iconKey) && Math.abs(entry.y - base.y) < 5
  }).length

  return { x: Math.min(92, base.x + sameSpotFoodCount * 12), y: base.y }
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
          repeatable: catalogItem.repeatable,
          color: result.color,
        }])

        // 간식류는 "방에 놓기"를 따로 누르지 않아도 구매 즉시 자동으로 배치한다.
        if (FOOD_ICON_KEYS.has(catalogItem.iconKey)) {
          const { x, y } = computeFoodPlacement(layout, inventory)
          try {
            const placed = await roomItemsApi.placeRoomItem(result.inventoryId, x, y)
            setLayout((current) => [
              ...current,
              {
                inventoryId: result.inventoryId,
                itemId: catalogItem.id,
                color: result.color,
                x: placed.x,
                y: placed.y,
                placedAt: placed.placedAt,
              },
            ])
          } catch {
            // 배치만 실패한 경우 — 구매 자체는 이미 끝났으니 인벤토리에서 수동으로 "방에 놓기"를 누르면 된다.
          }
        }
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
    const fallback = FOOD_ICON_KEYS.has(item.iconKey) ? computeFoodPlacement(layout, inventory) : (DEFAULT_PLACEMENT[item.iconKey] ?? { x: 50, y: 70 })
    try {
      const result = await roomItemsApi.placeRoomItem(inventoryId, fallback.x, fallback.y)
      setLayout((current) => [
        ...current.filter((entry) => entry.inventoryId !== inventoryId),
        { inventoryId, itemId: item.itemId, color: item.color, x: result.x, y: result.y, placedAt: result.placedAt },
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

  // 간식류는 방에 놓인 지 1시간이 지나면 자동으로 치운다 — 1분마다 체크한다.
  useEffect(() => {
    const sweep = () => {
      const now = Date.now()
      const expired = layout.filter(
        (entry) => isFoodEntry(entry, inventory) && now - new Date(entry.placedAt).getTime() >= FOOD_EXPIRY_MS,
      )
      expired.forEach((entry) => {
        removeFromRoom(entry.inventoryId)
      })
    }

    const timer = setInterval(sweep, 60 * 1000)
    return () => clearInterval(timer)
  }, [layout, inventory])

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
