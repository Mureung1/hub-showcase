import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { spendPointsTx } from './points.js'

// 실제 DB 대신 필요한 메서드만 흉내 낸 가짜 tx. aggregate가 반환할 잔액을 테스트마다 다르게 준다.
function makeTx(balance: number | null) {
  return {
    pointsLedgerEntry: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: balance } }),
      create: vi.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
  } as unknown as Prisma.TransactionClient
}

describe('spendPointsTx', () => {
  it('잔액이 부족하면 null을 반환하고 기록을 만들지 않는다', async () => {
    const tx = makeTx(100)

    const result = await spendPointsTx(tx, 'user-1', 300, '테스트 구매')

    expect(result).toBeNull()
    expect(tx.pointsLedgerEntry.create).not.toHaveBeenCalled()
  })

  it('잔액이 충분하면 음수 금액으로 차감 기록을 만들고 남은 잔액을 반환한다', async () => {
    const tx = makeTx(500)

    const result = await spendPointsTx(tx, 'user-1', 300, '테스트 구매', 'ROOM_ITEM_PURCHASE', 'inv-1')

    expect(result).toBe(200)
    expect(tx.pointsLedgerEntry.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', amount: -300, reason: '테스트 구매', refType: 'ROOM_ITEM_PURCHASE', refId: 'inv-1' },
    })
  })

  it('아직 포인트 기록이 하나도 없는 유저(_sum.amount가 null)는 잔액을 0으로 취급한다', async () => {
    const tx = makeTx(null)

    const result = await spendPointsTx(tx, 'user-new', 50, '테스트 구매')

    expect(result).toBeNull()
  })

  it('정확히 잔액만큼 쓰는 경우(잔액 == 금액)는 허용되고 남은 잔액은 0이다', async () => {
    const tx = makeTx(300)

    const result = await spendPointsTx(tx, 'user-1', 300, '테스트 구매')

    expect(result).toBe(0)
    expect(tx.pointsLedgerEntry.create).toHaveBeenCalledOnce()
  })
})
