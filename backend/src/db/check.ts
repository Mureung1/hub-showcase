import { prisma } from './prisma.js'

async function main() {
  await prisma.$connect()

  const noticeSiteCount = await prisma.noticeSite.count()

  console.log(`Prisma connected. notice_sites=${noticeSiteCount}`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
