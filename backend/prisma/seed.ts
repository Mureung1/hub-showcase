import { prisma } from '../src/db/prisma.js'

async function main() {
  const noticeSite = await prisma.noticeSite.upsert({
    where: {
      guildId: 'dev-guild-001',
    },
    update: {},
    create: {
      guildId: 'dev-guild-001',
      name: 'IRIS Dev Notice',
      url: 'https://example.com/notices',
      listSelector: '.notice-list > li',
      titleSelector: '.title',
      linkSelector: 'a',
      dateSelector: '.date',
      categorySelector: '.category',
      categories: {
        create: [
          {
            name: 'General',
            channelId: 'dev-channel-general',
            roleName: 'IRIS General',
            isActive: true,
          },
          {
            name: 'Scholarship',
            channelId: 'dev-channel-scholarship',
            roleName: 'IRIS Scholarship',
            isActive: true,
          },
        ],
      },
    },
    include: {
      categories: true,
    },
  })

  const generalCategory = noticeSite.categories.find((category) => category.name === 'General')

  if (generalCategory) {
    await prisma.notice.upsert({
      where: {
        hashKey: 'dev-seed-notice-000000000000000000000000000000000000000000000000',
      },
      update: {},
      create: {
        noticeSiteId: noticeSite.id,
        categoryId: generalCategory.id,
        hashKey: 'dev-seed-notice-000000000000000000000000000000000000000000000000',
        title: 'IRIS seed notice',
        link: 'https://example.com/notices/1',
        normalizedLink: 'https://example.com/notices/1',
        date: new Date('2026-07-14T00:00:00.000Z'),
        firstSeenAt: new Date(),
      },
    })
  }

  await prisma.keyword.upsert({
    where: {
      guildId_userId_keyword: {
        guildId: 'dev-guild-001',
        userId: 'dev-user-001',
        keyword: 'IRIS',
      },
    },
    update: {},
    create: {
      guildId: 'dev-guild-001',
      userId: 'dev-user-001',
      keyword: 'IRIS',
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
