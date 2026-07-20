import 'dotenv/config'
import { prisma } from '../src/config/prisma'
import { fetchAllDisposalItems } from '../src/services/govDisposalApiClient'

async function main() {
  const items = await fetchAllDisposalItems()
  console.log(`gov API returned ${items.length} items`)

  for (const { itemNm, dschgMthd } of items) {
    const item = await prisma.item.upsert({
      where: { name: itemNm },
      update: {},
      create: { name: itemNm },
    })

    await prisma.disposalRule.upsert({
      where: { itemId: item.id },
      update: { govItemName: itemNm, method: dschgMthd, fetchedAt: new Date() },
      create: { itemId: item.id, govItemName: itemNm, method: dschgMthd },
    })
  }

  console.log('sync complete')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
