import 'dotenv/config'
import { prisma } from '../src/config/prisma'
import { fetchAllRowsNationwide } from '../src/services/govBulkyWasteApiClient'

// createMany에 한 번에 너무 큰 배열을 넘기지 않기 위한 배치 크기.
const INSERT_CHUNK_SIZE = 1000

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

// larWasSpcfct/mngInstNm은 값이 없을 때 빈 문자열이 아니라 리터럴 "null" 문자열로 내려오는 행이 많다
// (실측 확인) — 진짜 값이 있는 행(전체의 약 절반)만 살리고 나머지는 진짜 null로 정규화한다.
function nullableField(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' || trimmed === 'null' ? null : trimmed
}

async function main() {
  const rows = await fetchAllRowsNationwide((pageRows, pageNo, totalCount) => {
    console.log(`page ${pageNo}: ${pageRows.length}건 (전체 ${totalCount}건 중)`)
  })
  console.log(`gov API returned ${rows.length} rows`)

  let invalidFeeCount = 0
  const records = rows.map((row) => {
    const fee = Number(row.fee)
    if (!Number.isFinite(fee)) invalidFeeCount += 1
    return {
      ctpvNm: row.ctpvNm,
      sggNm: row.sggNm,
      itemName: row.larWasNm,
      category: row.larWasSeNm,
      spec: nullableField(row.larWasSpcfct),
      paidFree: row.paidFreeYn,
      fee: Number.isFinite(fee) ? fee : 0,
      mngInstNm: nullableField(row.mngInstNm),
      sourceDate: row.crtrYmd,
    }
  })
  if (invalidFeeCount > 0) {
    console.warn(`fee 파싱 실패 ${invalidFeeCount}건 — 0으로 대체`)
  }

  // 행마다 안정적인 자연키가 없어(같은 품목명이 같은 지역에 여러 fee로 중복 존재) upsert 대신
  // 매번 전체를 지우고 새로 채운다 — 연 1회 갱신되는 데이터라 안전하다.
  await prisma.bulkyWasteFee.deleteMany({})
  for (const [index, batch] of chunk(records, INSERT_CHUNK_SIZE).entries()) {
    await prisma.bulkyWasteFee.createMany({ data: batch })
    console.log(`insert batch ${index + 1} done (${(index + 1) * INSERT_CHUNK_SIZE} rows so far)`)
  }

  console.log(`sync complete: ${records.length} rows`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
