import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { DEFAULT_CATEGORY_TEMPLATE, TONE_COLORS } from '../constants.js'

export const categoriesRouter = Router()
categoriesRouter.use(requireAuth)

type CategoryWithVisibility = {
  id: string
  name: string
  color: string
  tone: string
  visibility?: { shareGroupId: string }[]
}

function toResponse(category: CategoryWithVisibility) {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    tone: category.tone,
    visibleTo: (category.visibility ?? []).map((entry) => entry.shareGroupId),
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidTone(value: unknown): value is keyof typeof TONE_COLORS {
  return typeof value === 'string' && value in TONE_COLORS
}

categoriesRouter.get('/', asyncHandler(async (req, res) => {
  let categories: CategoryWithVisibility[] = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'asc' },
    include: { visibility: true },
  })

  // 회원가입 시점엔 카테고리를 만들지 않으므로, 처음 조회할 때 기본 카테고리를 만들어준다.
  if (categories.length === 0) {
    categories = await prisma.$transaction(async (tx) => {
      const created = []
      for (const template of DEFAULT_CATEGORY_TEMPLATE) {
        const category = await tx.category.create({ data: { ...template, userId: req.userId! } })
        await tx.categoryAuditLog.create({
          data: { userId: req.userId!, categoryId: category.id, name: category.name, tone: category.tone, action: 'CREATED' },
        })
        created.push(category)
      }
      return created
    })
  }

  res.json(categories.map(toResponse))
}))

categoriesRouter.post('/', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { name, tone } = body as Record<string, unknown>
  if (!isNonEmptyString(name)) {
    res.status(400).json({ error: 'name은 필수입니다.' })
    return
  }
  if (!isValidTone(tone)) {
    res.status(400).json({ error: `tone은 ${Object.keys(TONE_COLORS).join('/')} 중 하나여야 합니다.` })
    return
  }

  const category = await prisma.$transaction(async (tx) => {
    const created = await tx.category.create({
      data: { userId: req.userId!, name: name.trim(), tone, color: TONE_COLORS[tone] },
    })
    await tx.categoryAuditLog.create({
      data: { userId: req.userId!, categoryId: created.id, name: created.name, tone: created.tone, action: 'CREATED' },
    })
    return created
  })
  res.status(201).json(toResponse(category))
}))

categoriesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 카테고리입니다.' })
    return
  }

  const scheduleCount = await prisma.schedule.count({ where: { categoryId: existing.id } })
  if (scheduleCount > 0) {
    res.status(409).json({ error: `이 카테고리를 사용하는 일정이 ${scheduleCount}개 있어요. 먼저 일정을 삭제하거나 다른 카테고리로 옮겨주세요.` })
    return
  }

  await prisma.$transaction([
    prisma.categoryAuditLog.create({
      data: { userId: req.userId!, categoryId: existing.id, name: existing.name, tone: existing.tone, action: 'DELETED' },
    }),
    prisma.category.delete({ where: { id: existing.id } }),
  ])
  res.status(204).end()
}))

categoriesRouter.patch('/:id/visibility', asyncHandler(async (req, res) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: '존재하지 않는 카테고리입니다.' })
    return
  }

  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { groupIds: rawGroupIds } = body as Record<string, unknown>
  if (!Array.isArray(rawGroupIds) || !rawGroupIds.every((id) => typeof id === 'string')) {
    res.status(400).json({ error: 'groupIds는 문자열 배열이어야 합니다.' })
    return
  }

  const groupIds = [...new Set(rawGroupIds)]
  if (groupIds.length > 0) {
    const ownedCount = await prisma.shareGroup.count({ where: { id: { in: groupIds }, ownerId: req.userId } })
    if (ownedCount !== groupIds.length) {
      res.status(400).json({ error: '본인 소유의 그룹만 지정할 수 있습니다.' })
      return
    }
  }

  const [, , updated] = await prisma.$transaction([
    prisma.categoryVisibility.deleteMany({ where: { categoryId: existing.id } }),
    prisma.categoryVisibility.createMany({
      data: groupIds.map((shareGroupId) => ({ categoryId: existing.id, shareGroupId })),
    }),
    prisma.category.findUniqueOrThrow({ where: { id: existing.id }, include: { visibility: true } }),
  ])

  res.json(toResponse(updated))
}))
