import { prisma } from '../../db/prisma.js'

export class SubscriptionRepository {
  findActiveCategoriesByGuildId(guildId: string) {
    return prisma.category.findMany({
      where: {
        isActive: true,
        noticeSite: {
          guildId,
        },
      },
      orderBy: {
        id: 'asc',
      },
    })
  }

  findActiveCategoriesByGuildIdAndIds(guildId: string, categoryIds: number[]) {
    return prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
        isActive: true,
        noticeSite: {
          guildId,
        },
      },
      orderBy: {
        id: 'asc',
      },
    })
  }

  findUserSubscriptionsByGuildId(guildId: string, userId: string) {
    return prisma.subscription.findMany({
      where: {
        userId,
        category: {
          noticeSite: {
            guildId,
          },
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        id: 'asc',
      },
    })
  }

  replaceUserSubscriptions(guildId: string, userId: string, categoryIds: number[]) {
    return prisma.$transaction(async (tx) => {
      await tx.subscription.deleteMany({
        where: {
          userId,
          category: {
            noticeSite: {
              guildId,
            },
          },
          categoryId: {
            notIn: categoryIds,
          },
        },
      })

      if (categoryIds.length === 0) {
        return
      }

      await tx.subscription.createMany({
        data: categoryIds.map((categoryId) => ({
          userId,
          categoryId,
        })),
        skipDuplicates: true,
      })
    })
  }

  createSubscription(userId: string, categoryId: number) {
    return prisma.subscription.createMany({
      data: [
        {
          userId,
          categoryId,
        },
      ],
      skipDuplicates: true,
    })
  }

  deleteSubscription(userId: string, categoryId: number) {
    return prisma.subscription.deleteMany({
      where: {
        userId,
        categoryId,
      },
    })
  }

  deleteUserSubscriptionsByGuildId(guildId: string, userId: string) {
    return prisma.subscription.deleteMany({
      where: {
        userId,
        category: {
          noticeSite: {
            guildId,
          },
        },
      },
    })
  }
}

export const subscriptionRepository = new SubscriptionRepository()
