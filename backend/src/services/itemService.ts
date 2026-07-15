import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/errorHandler'
import { getDisposalApiClient } from './disposalApiClient'

export function searchItems(query: string) {
  return prisma.item.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
  })
}

export async function getItemDisposalRule(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) {
    throw new AppError('품목을 찾을 수 없습니다', 404)
  }

  const cached = await prisma.disposalRule.findUnique({ where: { itemId } })
  if (cached) {
    return { item, disposalRule: cached }
  }

  const [govItem] = await getDisposalApiClient().fetchDisposalMethod(item.name)
  if (!govItem) {
    throw new AppError('해당 품목의 배출방법 정보를 찾을 수 없습니다', 404)
  }

  const disposalRule = await prisma.disposalRule.create({
    data: {
      itemId: item.id,
      govItemName: govItem.itemNm,
      method: govItem.dschgMthd,
    },
  })

  return { item, disposalRule }
}
