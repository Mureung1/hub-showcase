import { prisma } from '../config/prisma'

export function getCollectionPoints(category: string, ctpvNm: string, sggNm: string) {
  return prisma.collectionPoint.findMany({
    where: { category, ctpvNm, sggNm },
    orderBy: { name: 'asc' },
  })
}
