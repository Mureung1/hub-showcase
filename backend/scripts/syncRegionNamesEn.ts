import 'dotenv/config'
import { prisma } from '../src/config/prisma'
import { getRegionNameClient } from '../src/services/regionNameClient'

// 한 번에 너무 많은 이름을 요청하면 응답 JSON이 잘리거나 일부가 누락될 위험이 있어 배치로 나눈다.
const BATCH_SIZE = 50
// Gemini 무료 티어의 분당 요청 제한(RPM)에 걸리지 않도록 배치 사이에 간격을 둔다.
const DELAY_MS = 4000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

// RegionDistrict.syncField(ctpvNm/sggNm)이 비어 있는 distinct 값들을 번역해 같은 값을 가진
// 모든 행에 한 번에 채운다 — 예: "중구"는 여러 시/도에 걸쳐 등장하지만 로마자 표기는 항상 같으므로
// 시/도 구분 없이 텍스트 하나로 재사용한다.
async function syncField(sourceField: 'ctpvNm' | 'sggNm', targetField: 'ctpvNmEn' | 'sggNmEn') {
  const rows = await prisma.regionDistrict.findMany({
    where: { [targetField]: null },
    distinct: [sourceField],
    select: { [sourceField]: true },
  })
  const names = rows.map((row) => row[sourceField as keyof typeof row] as string)
  console.log(`[${sourceField}] translating ${names.length} distinct names`)

  const batches = chunk(names, BATCH_SIZE)
  let translatedCount = 0

  for (const [index, batch] of batches.entries()) {
    const translations = await getRegionNameClient().translateNames(batch)

    for (const { name, nameEn } of translations) {
      await prisma.regionDistrict.updateMany({ where: { [sourceField]: name }, data: { [targetField]: nameEn } })
      translatedCount += 1
    }

    console.log(`[${sourceField}] batch ${index + 1}/${batches.length} done (${translatedCount}/${names.length})`)
    if (index < batches.length - 1) {
      await sleep(DELAY_MS)
    }
  }
}

async function main() {
  await syncField('ctpvNm', 'ctpvNmEn')
  await syncField('sggNm', 'sggNmEn')
  console.log('sync complete')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
