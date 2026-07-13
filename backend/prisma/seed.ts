import 'dotenv/config'
import { prisma } from '../src/config/prisma'

const items = ['건전지', '종이팩', '플라스틱 음료병']

async function main() {
  for (const name of items) {
    await prisma.item.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
