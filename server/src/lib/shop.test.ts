import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db.js', () => ({
  prisma: { $transaction: vi.fn() },
}))

const { prisma } = await import('../db.js')
const { purchaseRoomItem } = await import('./shop.js')

// 실제로는 prisma.$transaction(async (tx) => {...})이 콜백에 tx를 넘겨주는데,
// 테스트에서는 $transaction 자체를 "콜백에 가짜 tx를 넘겨서 바로 실행"하는 걸로 흉내 낸다.
function mockTransaction(tx: unknown) {
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) => Promise.resolve((cb as (tx: unknown) => unknown)(tx)))
}

function makeTx(overrides: {
  item?: unknown
  owned?: unknown
  balance?: number | null
  inventoryId?: string
}) {
  return {
    roomItem: { findUnique: vi.fn().mockResolvedValue(overrides.item ?? null) },
    userInventory: {
      findUnique: vi.fn().mockResolvedValue(overrides.owned ?? null),
      findFirst: vi.fn().mockResolvedValue(overrides.owned ?? null),
      create: vi.fn().mockResolvedValue({ id: overrides.inventoryId ?? 'inv-new' }),
    },
    pointsLedgerEntry: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: overrides.balance ?? 0 } }),
      create: vi.fn().mockResolvedValue({}),
    },
  }
}

describe('purchaseRoomItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('존재하지 않는 아이템이면 not_found를 반환한다', async () => {
    const tx = makeTx({ item: null })
    mockTransaction(tx)

    const result = await purchaseRoomItem('user-1', 'item-ghost')

    expect(result).toEqual({ status: 'not_found' })
  })

  it('색상 커스터마이징 아이템인데 색을 안 고르면 color_required를 반환한다', async () => {
    const tx = makeTx({ item: { id: 'item-console', cost: 300, colorCustomizable: true } })
    mockTransaction(tx)

    const result = await purchaseRoomItem('user-1', 'item-console')

    expect(result).toEqual({ status: 'color_required' })
    expect(tx.userInventory.create).not.toHaveBeenCalled()
  })

  it('색상 커스터마이징 아이템을 이미 그 색으로 가지고 있으면 already_owned를 반환한다', async () => {
    const tx = makeTx({
      item: { id: 'item-console', cost: 300, colorCustomizable: true },
      owned: { id: 'inv-existing' },
    })
    mockTransaction(tx)

    const result = await purchaseRoomItem('user-1', 'item-console', '#a9c8ec')

    expect(result).toEqual({ status: 'already_owned' })
    expect(tx.userInventory.findUnique).toHaveBeenCalledWith({
      where: { userId_itemId_color: { userId: 'user-1', itemId: 'item-console', color: '#a9c8ec' } },
    })
  })

  it('색상 커스터마이징이 없는 아이템은 색과 무관하게 하나만 가질 수 있다(already_owned)', async () => {
    const tx = makeTx({
      item: { id: 'item-headphones', cost: 300, colorCustomizable: false },
      owned: { id: 'inv-existing' },
    })
    mockTransaction(tx)

    const result = await purchaseRoomItem('user-1', 'item-headphones')

    expect(result).toEqual({ status: 'already_owned' })
    expect(tx.userInventory.findFirst).toHaveBeenCalledWith({ where: { userId: 'user-1', itemId: 'item-headphones' } })
  })

  it('잔액이 부족하면 insufficient_points와 현재 잔액을 반환하고 아무것도 만들지 않는다', async () => {
    const tx = makeTx({
      item: { id: 'item-table', cost: 350, colorCustomizable: false },
      owned: null,
      balance: 100,
    })
    mockTransaction(tx)

    const result = await purchaseRoomItem('user-1', 'item-table')

    expect(result).toEqual({ status: 'insufficient_points', balance: 100 })
    expect(tx.userInventory.create).not.toHaveBeenCalled()
    expect(tx.pointsLedgerEntry.create).not.toHaveBeenCalled()
  })

  it('구매에 성공하면 인벤토리 인스턴스를 만들고 인벤토리 id를 refId로 포인트를 차감한다', async () => {
    const tx = makeTx({
      item: { id: 'item-console', cost: 300, colorCustomizable: true },
      owned: null,
      balance: 1000,
      inventoryId: 'inv-brand-new',
    })
    mockTransaction(tx)

    const result = await purchaseRoomItem('user-1', 'item-console', '#f2a58d')

    expect(result).toEqual({ status: 'ok', balance: 700, inventoryId: 'inv-brand-new', color: '#f2a58d' })
    expect(tx.userInventory.create).toHaveBeenCalledWith({ data: { userId: 'user-1', itemId: 'item-console', color: '#f2a58d' } })
    // refId가 itemId가 아니라 방금 만든 인벤토리 인스턴스 id여야 같은 아이템을 다른 색으로 또 살 때
    // PointsLedgerEntry의 (userId, refType, refId) 유니크 제약에 안 걸린다.
    expect(tx.pointsLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', amount: -300, refType: 'ROOM_ITEM_PURCHASE', refId: 'inv-brand-new' }),
    })
  })

  it('색상 커스터마이징이 없는 아이템을 구매하면 color는 항상 null로 저장된다', async () => {
    const tx = makeTx({
      item: { id: 'item-headphones', cost: 300, colorCustomizable: false },
      owned: null,
      balance: 300,
      inventoryId: 'inv-headphones',
    })
    mockTransaction(tx)

    const result = await purchaseRoomItem('user-1', 'item-headphones', '#ignored')

    expect(result).toEqual({ status: 'ok', balance: 0, inventoryId: 'inv-headphones', color: null })
    expect(tx.userInventory.create).toHaveBeenCalledWith({ data: { userId: 'user-1', itemId: 'item-headphones', color: null } })
  })
})
