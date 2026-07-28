import { prisma } from '../config/prisma'

export function getCollectionPoints(category: string) {
  return prisma.collectionPoint.findMany({
    where: { category },
    orderBy: { name: 'asc' },
  })
}
