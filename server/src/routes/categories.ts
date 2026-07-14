import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { DEFAULT_CATEGORY_TEMPLATE } from '../constants.js'

export const categoriesRouter = Router()
categoriesRouter.use(requireAuth)

function toResponse(category: { id: string; name: string; color: string; tone: string }) {
  return { id: category.id, name: category.name, color: category.color, tone: category.tone }
}

categoriesRouter.get('/', asyncHandler(async (req, res) => {
  let categories = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'asc' },
  })

  // 회원가입 시점엔 카테고리를 만들지 않으므로, 처음 조회할 때 기본 카테고리를 만들어준다.
  if (categories.length === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORY_TEMPLATE.map((template) => ({ ...template, userId: req.userId! })),
    })
    categories = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    })
  }

  res.json(categories.map(toResponse))
}))
