import 'dotenv/config'
import { prisma } from '../src/config/prisma'
import {
  CLOTHING_URL,
  fetchAllRowsNationwide,
  LAMP_BATTERY_URL,
  MEDICINE_URL,
} from '../src/services/govCollectionPointApiClient'
import type { GovClothingRow, GovLampBatteryRow, GovMedicineRow } from '../src/types/govCollectionPointApi'

// createMany에 한 번에 너무 큰 배열을 넘기지 않기 위한 배치 크기 (syncBulkyWasteFees.ts와 동일 패턴).
const INSERT_CHUNK_SIZE = 1000

// 이 스크립트가 관리하는 카테고리만 지운다 — 소형가전/종이팩은 seedCollectionPoints.ts가 별도 관리하므로 건드리지 않음.
const MANAGED_CATEGORIES = ['건전지', '형광등', '폐의약품', '의류']

interface CollectionPointRecord {
  category: string
  name: string
  address: string
  hours: string | null
  ctpvNm: string
  sggNm: string
  lat: number | null
  lng: number | null
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function toCoord(value: string): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

// 형광등/건전지 실측 결과 카테고리 값이 "폐건전지"/"형광등+건전지"/"형광램프+LED조명+알카라인전지+..." 등
// 자유 텍스트라 부분 문자열로만 판단 가능 — 하나의 수거함이 둘 다 해당하면 카테고리별로 행을 하나씩 만든다
// (기존 데모 시드에서도 한 장소가 여러 카테고리에 걸쳐 있던 방식과 동일).
// 실측 결과 일부 행(부산 영도구 등 13건)의 sggNm이 "영도구"가 아니라 "부산광역시 영도구"처럼
// 시도명이 중복 포함돼 내려옴 — RegionDistrict의 sggNm(시도명 없이 구/군/시만)과 어긋나 지역 필터가
// 깨지므로 앞의 시도명 접두어를 제거해 정규화한다.
function normalizeSggNm(ctpvNm: string, sggNm: string): string {
  const prefix = `${ctpvNm} `
  return sggNm.startsWith(prefix) ? sggNm.slice(prefix.length) : sggNm
}

function matchesBattery(cltItemNm: string): boolean {
  return /건전지|배터리|전지/.test(cltItemNm)
}

function matchesLamp(cltItemNm: string): boolean {
  return /형광등|형광램프|LED|램프/.test(cltItemNm)
}

function mapLampBatteryRows(rows: GovLampBatteryRow[]): CollectionPointRecord[] {
  const records: CollectionPointRecord[] = []
  for (const row of rows) {
    const address = row.lctnRoadNmAddr.trim() || row.lctnLotnoAddr.trim()
    const base = {
      name: row.instlPlcNm,
      address,
      hours: null,
      ctpvNm: row.ctpvNm,
      sggNm: normalizeSggNm(row.ctpvNm, row.sggNm),
      lat: toCoord(row.lat),
      lng: toCoord(row.lot),
    }
    if (matchesBattery(row.cltItemNm)) records.push({ ...base, category: '건전지' })
    if (matchesLamp(row.cltItemNm)) records.push({ ...base, category: '형광등' })
  }
  return records
}

function mapMedicineRows(rows: GovMedicineRow[]): CollectionPointRecord[] {
  return rows.map((row) => ({
    category: '폐의약품',
    name: row.instlPlcNm,
    address: row.lctnRoadNm.trim() || row.lctnLotnoAddr.trim(),
    hours: null,
    ctpvNm: row.ctpvNm,
    sggNm: normalizeSggNm(row.ctpvNm, row.sggNm),
    lat: toCoord(row.lat),
    lng: toCoord(row.lot),
  }))
}

function mapClothingRows(rows: GovClothingRow[]): CollectionPointRecord[] {
  return rows.map((row) => ({
    category: '의류',
    name: row.instlPlcNm,
    address: row.lctnRoadNmAddr.trim() || row.lctnLotnoAddr.trim(),
    hours: null,
    ctpvNm: row.ctpvNm,
    sggNm: normalizeSggNm(row.ctpvNm, row.sggNm),
    lat: toCoord(row.lat),
    lng: toCoord(row.lot),
  }))
}

async function main() {
  const lampBatteryRows = await fetchAllRowsNationwide<GovLampBatteryRow>(LAMP_BATTERY_URL, (rows, pageNo, totalCount) => {
    console.log(`[건전지/형광등] page ${pageNo}: ${rows.length}건 (전체 ${totalCount}건 중)`)
  })
  const medicineRows = await fetchAllRowsNationwide<GovMedicineRow>(MEDICINE_URL, (rows, pageNo, totalCount) => {
    console.log(`[폐의약품] page ${pageNo}: ${rows.length}건 (전체 ${totalCount}건 중)`)
  })
  const clothingRows = await fetchAllRowsNationwide<GovClothingRow>(CLOTHING_URL, (rows, pageNo, totalCount) => {
    console.log(`[의류] page ${pageNo}: ${rows.length}건 (전체 ${totalCount}건 중)`)
  })

  const records = [
    ...mapLampBatteryRows(lampBatteryRows),
    ...mapMedicineRows(medicineRows),
    ...mapClothingRows(clothingRows),
  ]
  console.log(`총 ${records.length}건 (건전지/형광등 원본 ${lampBatteryRows.length}건 → 카테고리 분리 포함)`)

  await prisma.collectionPoint.deleteMany({ where: { category: { in: MANAGED_CATEGORIES } } })

  for (const batch of chunk(records, INSERT_CHUNK_SIZE)) {
    await prisma.collectionPoint.createMany({ data: batch })
  }

  console.log(`synced ${records.length} collection points across ${MANAGED_CATEGORIES.join('/')}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
