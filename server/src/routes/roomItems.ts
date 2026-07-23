import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AVATAR_PALETTE } from '../constants.js'
import { getRoomInventory, purchaseRoomItem } from '../lib/shop.js'
import { getRoomLayout, placeRoomItem, removeRoomItemPlacement } from '../lib/roomLayout.js'

export const roomItemsRouter = Router()
roomItemsRouter.use(requireAuth)

// x, y는 픽셀이 아니라 마이홈 방 영역 기준 0~100 퍼센트 좌표로 저장한다 — 화면 크기에 상관없이 같은 상대 위치를 유지하기 위함.
function isValidPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

// 상점 카탈로그 — 전체 공용 목록이라 소유 여부는 포함하지 않는다(소유 정보는 /inventory에서).
roomItemsRouter.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.roomItem.findMany({ orderBy: { cost: 'asc' } })

  res.json(items.map((item) => ({
    id: item.id,
    name: item.name,
    cost: item.cost,
    type: item.type,
    iconKey: item.iconKey,
    equippable: item.equippable,
    interactable: item.interactable,
    colorCustomizable: item.colorCustomizable,
    placeable: item.placeable,
    wallMounted: item.wallMounted,
    repeatable: item.repeatable,
  })))
}))

// 내가 소유한 인스턴스 목록 — 같은 아이템을 다른 색으로 여러 개 갖고 있으면 각각 한 줄씩.
roomItemsRouter.get('/inventory', asyncHandler(async (req, res) => {
  res.json(await getRoomInventory(req.userId!))
}))

roomItemsRouter.get('/layout', asyncHandler(async (req, res) => {
  res.json(await getRoomLayout(req.userId!))
}))

roomItemsRouter.put('/:inventoryId/layout', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { x, y } = body as Record<string, unknown>
  if (!isValidPercent(x) || !isValidPercent(y)) {
    res.status(400).json({ error: 'x, y는 0~100 사이 숫자여야 합니다.' })
    return
  }

  const result = await placeRoomItem(req.userId!, req.params.inventoryId, Math.round(x), Math.round(y))
  if (result.status === 'not_owned') {
    res.status(403).json({ error: '가지고 있지 않은 아이템은 방에 놓을 수 없어요.' })
    return
  }
  res.json({ x: result.x, y: result.y, placedAt: result.placedAt })
}))

roomItemsRouter.delete('/:inventoryId/layout', asyncHandler(async (req, res) => {
  await removeRoomItemPlacement(req.userId!, req.params.inventoryId)
  res.status(204).end()
}))

roomItemsRouter.post('/:id/purchase', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  let color: string | undefined
  if (typeof body === 'object' && body !== null) {
    const raw = (body as Record<string, unknown>).color
    if (raw !== undefined && raw !== null) {
      if (typeof raw !== 'string' || !(AVATAR_PALETTE as readonly string[]).includes(raw)) {
        res.status(400).json({ error: `color는 ${AVATAR_PALETTE.join('/')} 중 하나여야 합니다.` })
        return
      }
      color = raw
    }
  }

  try {
    const result = await purchaseRoomItem(req.userId!, req.params.id, color)

    switch (result.status) {
      case 'not_found':
        res.status(404).json({ error: '아이템을 찾을 수 없습니다.' })
        return
      case 'already_owned':
        res.status(409).json({ error: '이미 그 색으로 가지고 있는 아이템이에요.' })
        return
      case 'color_required':
        res.status(400).json({ error: '색을 먼저 선택해주세요.' })
        return
      case 'insufficient_points':
        res.status(400).json({ error: '포인트가 부족해요.', balance: result.balance })
        return
      case 'ok':
        res.json({ balance: result.balance, inventoryId: result.inventoryId, color: result.color })
        return
    }
  } catch (error) {
    // 동시에 같은 색으로 두 번 구매 요청한 경우 유니크 제약 위반으로 잡힌다.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: '이미 그 색으로 가지고 있는 아이템이에요.' })
      return
    }
    throw error
  }
}))
