import 'dotenv/config'
import { prisma } from '../src/config/prisma'
import {
  CLOTHING_URL,
  fetchAllRowsNationwide,
  LAMP_BATTERY_URL,
  MEDICINE_URL,
  RECYCLING_CENTER_URL,
} from '../src/services/govCollectionPointApiClient'
import type {
  GovClothingRow,
  GovLampBatteryRow,
  GovMedicineRow,
  GovRecyclingCenterRow,
} from '../src/types/govCollectionPointApi'

// createMany에 한 번에 너무 큰 배열을 넘기지 않기 위한 배치 크기 (syncBulkyWasteFees.ts와 동일 패턴).
const INSERT_CHUNK_SIZE = 1000

// 이 스크립트가 관리하는 카테고리만 지운다 — 소형가전/종이팩은 seedCollectionPoints.ts가 별도 관리하므로 건드리지 않음.
const MANAGED_CATEGORIES = ['건전지', '형광등', '폐의약품', '의류', '재활용센터']

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
// 인천광역시가 2026-07-01부로 행정구역을 개편해 옛 "동구"는 "중구"와 통합돼 "제물포구"가 됐다
// (동구 전체가 예외 없이 흡수되는 통합이라 주소 확인 없이 안전하게 치환 가능, scripts/relabelIncheonDonggu.ts
// 참고). 정부 표준데이터 원본은 아직 개편 전 이름을 쓰므로 동기화 때마다 다시 어긋나지 않도록 여기서 정규화한다.
// 옛 "서구"는 경인아라뱃길 기준 북/남으로 검단구·서해구로 분할되는 것이라 주소 텍스트만으로 어느 쪽인지
// 판단할 근거가 없어 여기서는 그대로 둔다(docs/TASK.md 리스크 메모 참고).
function normalizeIncheonSggNm(ctpvNm: string, sggNm: string): string {
  if (ctpvNm === '인천광역시' && sggNm === '동구') return '제물포구'
  return sggNm
}

function normalizeSggNm(ctpvNm: string, sggNm: string): string {
  const prefix = `${ctpvNm} `
  const stripped = sggNm.startsWith(prefix) ? sggNm.slice(prefix.length) : sggNm
  return normalizeIncheonSggNm(ctpvNm, stripped)
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

// 전국재활용센터표준데이터는 CTPV_NM/SGG_NM 필드가 없고 주소 문자열만 제공 — 앞 두 토큰(시/도, 시/군/구)을
// 뽑아낸다. 이 앱의 다른 지역 데이터(household_waste_info 기반 RegionDistrict)는 창원시/수원시처럼
// 여러 구가 있는 시도 하위 구를 붙이지 않고 시 단위까지만 쓰는 걸 확인했으므로(실측 확인) 두 번째 토큰
// 하나만 취하고 그 다음 토큰(있다면 구/군)은 버린다. 세종은 구/군 자체가 없어 RegionDistrict와 동일하게
// "없음"으로 고정한다. 파싱에 실패하는 행(형식이 다른 주소 등)은 잘못된 지역으로 저장하지 않고 건너뛴다.
const NO_DISTRICT_PROVINCES = new Set(['세종특별자치시'])

// 실측 결과 183건 중 2건에서 발견한 원본 주소 오류 — 강원도는 2023-06-11부로 강원특별자치도로
// 개칭됐는데 일부 행이 개칭 전 이름을 그대로 쓰고, 서울특별시 한 곳은 아예 "서을특별시"로 오타가
// 나 있었다. 둘 다 확실한 오류(개칭 시점이 명확하거나 명백한 오타)라 안전하게 정규화한다 — 인천
// 행정구역 개편처럼 어느 쪽인지 애매한 분할과는 다른 경우.
const CTPV_NM_CORRECTIONS: Record<string, string> = {
  강원도: '강원특별자치도',
  서을특별시: '서울특별시',
}

function normalizeCtpvNm(ctpvNm: string): string {
  return CTPV_NM_CORRECTIONS[ctpvNm] ?? ctpvNm
}

function parseAddressRegion(address: string): { ctpvNm: string; sggNm: string } | null {
  const tokens = address.trim().split(/\s+/)
  const ctpvNm = normalizeCtpvNm(tokens[0] ?? '')
  if (!ctpvNm || !/[시도]$/.test(ctpvNm)) return null

  if (NO_DISTRICT_PROVINCES.has(ctpvNm)) {
    return { ctpvNm, sggNm: '없음' }
  }

  const sggNm = tokens[1]
  if (!sggNm || !/(시|군|구)$/.test(sggNm)) return null
  return { ctpvNm, sggNm }
}

function buildRecyclingCenterHours(row: GovRecyclingCenterRow): string | null {
  const open = row.weekdayOperOpenHhmm.trim()
  const close = row.weekdayOperColseHhmm.trim()
  const rest = row.rstdeInfo.trim()

  const weekdayPart = open && close && open !== '00:00' && close !== '00:00' ? `평일 ${open}-${close}` : ''
  const restPart = rest ? `휴무: ${rest}` : ''
  return [weekdayPart, restPart].filter(Boolean).join(' / ') || null
}

function mapRecyclingCenterRows(rows: GovRecyclingCenterRow[]): { records: CollectionPointRecord[]; skipped: number } {
  const records: CollectionPointRecord[] = []
  let skipped = 0
  for (const row of rows) {
    const address = row.rdnmadr.trim() || row.lnmadr.trim()
    const region = parseAddressRegion(address)
    if (!region) {
      skipped += 1
      continue
    }
    records.push({
      category: '재활용센터',
      name: row.cnterNm,
      address,
      hours: buildRecyclingCenterHours(row),
      ctpvNm: region.ctpvNm,
      sggNm: normalizeSggNm(region.ctpvNm, region.sggNm),
      lat: toCoord(row.latitude),
      lng: toCoord(row.longitude),
    })
  }
  return { records, skipped }
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
  const recyclingCenterRows = await fetchAllRowsNationwide<GovRecyclingCenterRow>(
    RECYCLING_CENTER_URL,
    (rows, pageNo, totalCount) => {
      console.log(`[재활용센터] page ${pageNo}: ${rows.length}건 (전체 ${totalCount}건 중)`)
    },
  )

  const { records: recyclingCenterRecords, skipped: recyclingCenterSkipped } =
    mapRecyclingCenterRows(recyclingCenterRows)
  if (recyclingCenterSkipped > 0) {
    console.log(`[재활용센터] 주소 파싱 실패로 건너뜀: ${recyclingCenterSkipped}건`)
  }

  const records = [
    ...mapLampBatteryRows(lampBatteryRows),
    ...mapMedicineRows(medicineRows),
    ...mapClothingRows(clothingRows),
    ...recyclingCenterRecords,
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
