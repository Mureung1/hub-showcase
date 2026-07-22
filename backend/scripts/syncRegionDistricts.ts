import 'dotenv/config'
import { prisma } from '../src/config/prisma'
import { fetchAllRowsNationwide } from '../src/services/govRegionApiClient'

async function main() {
  const districts = new Map<string, { ctpvNm: string; sggNm: string }>()

  await fetchAllRowsNationwide((rows, pageNo, totalCount) => {
    for (const row of rows) {
      districts.set(`${row.CTPV_NM}|${row.SGG_NM}`, { ctpvNm: row.CTPV_NM, sggNm: row.SGG_NM })
    }
    console.log(`page ${pageNo}: ${districts.size} distinct districts so far (of ${totalCount} total rows)`)
  })

  console.log(`total distinct (시/도, 구/군) pairs: ${districts.size}`)

  for (const { ctpvNm, sggNm } of districts.values()) {
    await prisma.regionDistrict.upsert({
      where: { ctpvNm_sggNm: { ctpvNm, sggNm } },
      update: {},
      create: { ctpvNm, sggNm },
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
