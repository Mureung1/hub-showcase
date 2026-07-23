import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db.js', () => ({
  prisma: {
    userInventory: { findFirst: vi.fn() },
    userRoomLayout: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  },
}))

const { prisma } = await import('../db.js')
const { placeRoomItem } = await import('./roomLayout.js')

describe('placeRoomItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('소유하지 않은 인스턴스는 배치할 수 없다', async () => {
    vi.mocked(prisma.userInventory.findFirst).mockResolvedValue(null)

    const result = await placeRoomItem('user-1', 'inv-missing', 50, 50)

    expect(result).toEqual({ status: 'not_owned' })
    expect(prisma.userRoomLayout.upsert).not.toHaveBeenCalled()
  })

  it('wallMounted가 아닌 아이템은 y좌표를 그대로 저장한다', async () => {
    vi.mocked(prisma.userInventory.findFirst).mockResolvedValue({
      id: 'inv-1', item: { wallMounted: false },
    } as never)

    const result = await placeRoomItem('user-1', 'inv-1', 30, 92)

    expect(result).toEqual({ status: 'ok', x: 30, y: 92, placedAt: expect.any(String) })
    expect(prisma.userRoomLayout.upsert).toHaveBeenCalledWith({
      where: { inventoryId: 'inv-1' },
      update: { x: 30, y: 92, placedAt: expect.any(Date) },
      create: { userId: 'user-1', inventoryId: 'inv-1', x: 30, y: 92, placedAt: expect.any(Date) },
    })
  })

  it('wallMounted 아이템은 y좌표가 벽 영역(5~45) 위쪽을 넘으면 45로 clamp된다', async () => {
    vi.mocked(prisma.userInventory.findFirst).mockResolvedValue({
      id: 'inv-2', item: { wallMounted: true },
    } as never)

    const result = await placeRoomItem('user-1', 'inv-2', 70, 90)

    expect(result).toEqual({ status: 'ok', x: 70, y: 45, placedAt: expect.any(String) })
  })

  it('wallMounted 아이템은 y좌표가 벽 영역 아래쪽 밑으로 내려가면 5로 clamp된다', async () => {
    vi.mocked(prisma.userInventory.findFirst).mockResolvedValue({
      id: 'inv-3', item: { wallMounted: true },
    } as never)

    const result = await placeRoomItem('user-1', 'inv-3', 10, 0)

    expect(result).toEqual({ status: 'ok', x: 10, y: 5, placedAt: expect.any(String) })
  })

  it('wallMounted 아이템이라도 이미 벽 영역 안이면 그대로 둔다', async () => {
    vi.mocked(prisma.userInventory.findFirst).mockResolvedValue({
      id: 'inv-4', item: { wallMounted: true },
    } as never)

    const result = await placeRoomItem('user-1', 'inv-4', 10, 20)

    expect(result).toEqual({ status: 'ok', x: 10, y: 20, placedAt: expect.any(String) })
  })
})
