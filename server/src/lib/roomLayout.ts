import { prisma } from '../db.js'

export type PlaceResult =
  | { status: 'ok'; x: number; y: number; placedAt: string }
  | { status: 'not_owned' }

// 벽 영역으로 취급하는 y좌표(0~100 퍼센트) 범위 — 창문·별 장식·선반 장식처럼 wallMounted 아이템은 이 범위 밖에 못 놓는다.
const WALL_BAND = { min: 5, max: 45 }

// 소유하지 않은 인스턴스는 방에 놓을 수 없다 — 구매 없이 배치만으로 아이템을 얻는 걸 막는다.
// wallMounted 아이템은 클라이언트가 드래그로 이미 범위를 제한하지만, 직접 API를 호출하는 경우에 대비해
// 서버에서도 한 번 더 y좌표를 벽 영역으로 clamp한다.
export async function placeRoomItem(userId: string, inventoryId: string, x: number, y: number): Promise<PlaceResult> {
  const owned = await prisma.userInventory.findFirst({ where: { id: inventoryId, userId }, include: { item: true } })
  if (!owned) return { status: 'not_owned' }

  const clampedY = owned.item.wallMounted ? Math.min(WALL_BAND.max, Math.max(WALL_BAND.min, y)) : y

  // 다시 놓을 때마다 placedAt을 갱신해야 간식류의 "1시간 후 자동 제거"가 재배치 시점부터 다시 시작된다.
  const placedAt = new Date()
  await prisma.userRoomLayout.upsert({
    where: { inventoryId },
    update: { x, y: clampedY, placedAt },
    create: { userId, inventoryId, x, y: clampedY, placedAt },
  })
  return { status: 'ok', x, y: clampedY, placedAt: placedAt.toISOString() }
}

export async function removeRoomItemPlacement(userId: string, inventoryId: string) {
  await prisma.userRoomLayout.deleteMany({ where: { userId, inventoryId } })
}

export async function getRoomLayout(userId: string) {
  const layout = await prisma.userRoomLayout.findMany({
    where: { userId },
    include: { inventory: { select: { itemId: true, color: true } } },
  })

  return layout.map((entry) => ({
    inventoryId: entry.inventoryId,
    itemId: entry.inventory.itemId,
    color: entry.inventory.color,
    x: entry.x,
    y: entry.y,
    placedAt: entry.placedAt.toISOString(),
  }))
}

// 친구 마이홈 방문 화면(읽기 전용)에서 실제로 배치된 아이템을 그리기 위한 뷰.
// 방문자는 inventoryId/placedAt을 알 필요가 없고, 대신 아이콘 렌더링에 필요한 iconKey가 있어야 한다.
export async function getFriendRoomView(hostUserId: string) {
  const layout = await prisma.userRoomLayout.findMany({
    where: { userId: hostUserId },
    include: { inventory: { include: { item: { select: { iconKey: true } } } } },
  })

  return layout.map((entry) => ({
    itemId: entry.inventory.itemId,
    iconKey: entry.inventory.item.iconKey,
    color: entry.inventory.color,
    x: entry.x,
    y: entry.y,
  }))
}
