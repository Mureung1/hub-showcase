import { prisma } from '../db.js'

export const ROOM_ITEM_PURCHASE_REASON = '마이홈 아이템 구매'

export type PurchaseResult =
  | { status: 'ok'; balance: number; inventoryId: string; color: string | null }
  | { status: 'not_found' }
  | { status: 'already_owned' }
  | { status: 'color_required' }
  | { status: 'insufficient_points'; balance: number }

// 소유 여부 확인 → 잔액 확인 → 인벤토리 인스턴스 생성 → 포인트 차감을 한 트랜잭션으로 묶는다.
// color는 colorCustomizable 아이템(게임기 등)을 구매할 때만 의미가 있고, 구매 시점에 골라 함께 저장한다.
// 색이 다르면 같은 itemId라도 별도 인스턴스로 여러 개 살 수 있다 — 그래서 "이미 소유" 판정은
// colorCustomizable 여부에 따라 다르게 한다: 커스터마이징 아이템은 같은 색만, 아니면 무조건 1개만.
export async function purchaseRoomItem(userId: string, itemId: string, color?: string): Promise<PurchaseResult> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.roomItem.findUnique({ where: { id: itemId } })
    if (!item) return { status: 'not_found' }

    if (item.colorCustomizable && !color) return { status: 'color_required' }
    const normalizedColor = item.colorCustomizable ? color! : null

    const owned = item.colorCustomizable
      ? await tx.userInventory.findUnique({ where: { userId_itemId_color: { userId, itemId, color: normalizedColor! } } })
      : await tx.userInventory.findFirst({ where: { userId, itemId } })
    if (owned) return { status: 'already_owned' }

    // 포인트 차감을 위해 PointsLedgerEntry를 트랜잭션 안에서 직접 집계해 잔액을 확인한다(같은 tx라 이 트랜잭션의 이전 쓰기까지 반영됨).
    const balanceResult = await tx.pointsLedgerEntry.aggregate({ where: { userId }, _sum: { amount: true } })
    const balance = balanceResult._sum.amount ?? 0
    if (balance < item.cost) return { status: 'insufficient_points', balance }

    // refId로 인벤토리 인스턴스 id를 써야 한다 — itemId를 쓰면 같은 아이템을 다른 색으로 다시 살 때
    // PointsLedgerEntry의 (userId, refType, refId) 유니크 제약에 걸려 두 번째 구매가 막힌다.
    const inventoryEntry = await tx.userInventory.create({ data: { userId, itemId, color: normalizedColor } })
    await tx.pointsLedgerEntry.create({
      data: { userId, amount: -item.cost, reason: ROOM_ITEM_PURCHASE_REASON, refType: 'ROOM_ITEM_PURCHASE', refId: inventoryEntry.id },
    })

    return { status: 'ok', balance: balance - item.cost, inventoryId: inventoryEntry.id, color: normalizedColor }
  })
}

export async function getRoomInventory(userId: string) {
  const inventory = await prisma.userInventory.findMany({
    where: { userId },
    include: { item: true },
    orderBy: { acquiredAt: 'asc' },
  })

  return inventory.map((entry) => ({
    id: entry.id,
    itemId: entry.itemId,
    name: entry.item.name,
    cost: entry.item.cost,
    iconKey: entry.item.iconKey,
    equippable: entry.item.equippable,
    interactable: entry.item.interactable,
    colorCustomizable: entry.item.colorCustomizable,
    placeable: entry.item.placeable,
    wallMounted: entry.item.wallMounted,
    color: entry.color,
  }))
}
