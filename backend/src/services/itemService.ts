import type { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/errorHandler'
import { getDisposalApiClient } from './disposalApiClient'
import { getExplanationClient } from './explanationClient'

export function searchItems(query: string) {
  return prisma.item.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
  })
}

export function findItemByName(name: string) {
  return prisma.item.findUnique({ where: { name } })
}

export async function getItemDisposalRule(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) {
    throw new AppError('품목을 찾을 수 없습니다', 404)
  }

  let disposalRule = await prisma.disposalRule.findUnique({ where: { itemId } })

  if (!disposalRule) {
    const [govItem] = await getDisposalApiClient().fetchDisposalMethod(item.name)
    if (!govItem) {
      throw new AppError('해당 품목의 배출방법 정보를 찾을 수 없습니다', 404)
    }

    disposalRule = await prisma.disposalRule.create({
      data: {
        itemId: item.id,
        govItemName: govItem.itemNm,
        method: govItem.dschgMthd,
      },
    })
  }

  if (!disposalRule.explainedAt) {
    const explanation = await getExplanationClient().generateExplanation(
      disposalRule.govItemName,
      disposalRule.method,
    )
    disposalRule = await prisma.disposalRule.update({
      where: { itemId },
      data: {
        steps: explanation.steps,
        parts: explanation.parts as unknown as Prisma.InputJsonValue,
        commonMistakes: explanation.commonMistakes,
        reason: explanation.reason,
        explainedAt: new Date(),
      },
    })
  }

  return { item, disposalRule }
}
