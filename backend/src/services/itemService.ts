import { prisma } from '../config/prisma'

export function searchItems(query: string) {
  return prisma.item.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
  })
}
