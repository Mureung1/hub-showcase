import type { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/errorHandler'
import { getRegionApiClient } from './regionApiClient'
import type { GovRegionRow } from '../types/govRegionApi'

const NOT_APPLICABLE = '해당없음'

interface CategoryRule {
  dow: string
  method: string
  beginTime: string
  endTime: string
}

interface BulkWasteRule {
  method: string
  place: string
  beginTime: string
  endTime: string
}

// "산격1동~4동" 같은 범위 표기를 ["산격1동", "산격2동", "산격3동", "산격4동"]로 펼친다.
// "(구)대현1동", "관문동(매천택지)"처럼 범위가 아닌 토큰은 그대로 둔다 — 이런 괄호 주석은
// 정부 데이터가 실제로 구분해둔 세부 지역이라 우리가 임의로 병합하지 않는다.
function expandZoneToken(token: string): string[] {
  const rangeMatch = token.match(/^(.*?)(\d+)([읍면동])~(\d+)\3$/)
  if (!rangeMatch) {
    return [token]
  }
  const [, prefix, startStr, suffix, endStr] = rangeMatch
  const start = Number(startStr)
  const end = Number(endStr)
  const result: string[] = []
  for (let n = start; n <= end; n++) {
    result.push(`${prefix}${n}${suffix}`)
  }
  return result
}

const MAX_ZONE_LABEL_LENGTH = 40

// 접미사(동/읍/면 등)로 판별하지 않고 길이만으로 걸러낸다 — 실측 결과 관리구역을 지역명이 아니라
// 수거 방식으로 구분하는 지자체도 있었음(강릉시: "문전수거 지역"/"거점수거 지역", 동/읍/면이 전혀 아님).
// 동→읍/면→수거방식으로 계속 새로운 표기가 나와 특정 접미사를 화이트리스트하는 방식은 깨지기 쉽다고
// 판단해, 정말 비정상적으로 긴 값만 걸러내는 방식으로 단순화했다 — 실측된 유일한 실제 오염 사례는 대상지역
// 필드에 배출방법 안내 문구가 통째로 들어있던 경우뿐이었다(예: "북구 전역(배출방법) 1. 스티커 구입하여...").
function looksLikeZoneLabel(token: string): boolean {
  return token.length > 0 && token.length <= MAX_ZONE_LABEL_LENGTH
}

function parseZoneTokens(mngZoneTrgtRgnNm: string): string[] {
  return mngZoneTrgtRgnNm
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean)
    .flatMap(expandZoneToken)
    .filter(looksLikeZoneLabel)
}

function pickCategory(
  rows: GovRegionRow[],
  fields: { dow: keyof GovRegionRow; method: keyof GovRegionRow; begin: keyof GovRegionRow; end: keyof GovRegionRow },
): CategoryRule | null {
  for (const row of rows) {
    const method = row[fields.method]
    if (!method || method === NOT_APPLICABLE) continue
    return { dow: row[fields.dow], method, beginTime: row[fields.begin], endTime: row[fields.end] }
  }
  return null
}

function pickBulkWaste(rows: GovRegionRow[]): BulkWasteRule | null {
  for (const row of rows) {
    const method = row.TMPRY_BULK_WASTE_EMSN_MTHD
    if (!method || method === NOT_APPLICABLE) continue
    return {
      method,
      place: row.TMPRY_BULK_WASTE_EMSN_PLC,
      beginTime: row.TMPRY_BULK_WASTE_EMSN_BGNG_TM,
      endTime: row.TMPRY_BULK_WASTE_EMSN_END_TM,
    }
  }
  return null
}

export interface ZoneOptionsResult {
  covered: boolean
  dongOptions: string[]
  // true면 동 선택 없이 바로 getRegionRule을 호출해도 됨(구 전체 단일 규정) — 실측: 해운대구 등 일부
  // 구/군은 동 단위 데이터가 아예 없고 구 전체 단일 행만 존재함.
  districtWide: boolean
  // covered가 false일 때만 채워짐 — 같은 시/도 내에 데이터가 있는 다른 구/군 목록(정확한 값을 지어내지
  // 않고 실제로 존재하는 대안을 안내하기 위함, CLAUDE.md 원칙)
  alternativeDistricts: string[]
}

// RegionDistrict 캐시에 실재하는 시/도 전체 목록 — 지역 선택 UI 1단계 드롭다운에 사용.
// 하드코딩된 17개 시/도 목록 대신 실제 데이터에 존재하는 값만 보여준다 (예: 정부 데이터가 광주/전남을
// "전남광주통합특별시"로 통합해서 표기하는 등, 표준 명칭과 다를 수 있어 실측값을 그대로 쓰는 게 안전함).
export function getProvinces(): Promise<string[]> {
  return prisma.regionDistrict
    .findMany({ distinct: ['ctpvNm'], select: { ctpvNm: true }, orderBy: { ctpvNm: 'asc' } })
    .then((rows) => rows.map((r) => r.ctpvNm))
}

// 시/도 안에서 데이터가 있는 구/군 전체 목록 — 지역 선택 UI 2단계 드롭다운 및 "이 구/군엔 데이터 없음" 대안 목록에 재사용.
export function getDistrictsInProvince(ctpvNm: string): Promise<string[]> {
  return prisma.regionDistrict
    .findMany({ where: { ctpvNm }, select: { sggNm: true }, orderBy: { sggNm: 'asc' } })
    .then((rows) => rows.map((r) => r.sggNm))
}

// 시/도+구/군에 속한 모든 동 옵션을 반환 — 사용자가 동을 고르기 전 진행형 선택 UI에 사용.
// 커버리지가 시/도별로 매우 불균등해(실측: 부산 32건 vs 강원 2252건) 특정 구/군에 데이터가 아예 없는
// 경우가 흔하다 — 매 요청마다 라이브 조회로 이를 확인하면 API에 부담이 크므로, 먼저 RegionDistrict
// 캐시(scripts/syncRegionDistricts.ts로 동기화)로 커버리지 여부를 확인한 뒤에만 라이브 조회한다.
export async function getZoneOptions(ctpvNm: string, sggNm: string): Promise<ZoneOptionsResult> {
  const isCovered = await prisma.regionDistrict.findUnique({
    where: { ctpvNm_sggNm: { ctpvNm, sggNm } },
  })

  if (!isCovered) {
    const alternativeDistricts = await getDistrictsInProvince(ctpvNm)
    return { covered: false, dongOptions: [], districtWide: false, alternativeDistricts }
  }

  // SGG_NM만으로는 여러 시/도의 동명 구/군이 섞여 반환되므로 CTPV_NM으로 반드시 재필터링한다.
  const allRows = await getRegionApiClient().fetchRowsBySgg(sggNm)
  const rows = allRows.filter((row) => row.CTPV_NM === ctpvNm)

  const zoneSet = new Set<string>()
  for (const row of rows) {
    for (const zone of parseZoneTokens(row.MNG_ZONE_TRGT_RGN_NM)) {
      zoneSet.add(zone)
    }
  }

  // 방어적 안전장치: 대상지역 필드가 전부 걸러지는 값(과도하게 긴 안내문 등)만 있는 행이면 zoneSet이
  // 비게 된다 — 프론트가 "선택 필요"인데 옵션이 0개인 막다른 상태가 되어 저장 버튼이 영영 활성화되지
  // 않는 것을 막기 위해 커버리지 없음으로 취급하고 같은 시/도의 다른 구/군을 대안으로 안내한다
  // (정부 데이터를 임의로 지어내지 않는다는 CLAUDE.md 원칙 준수).
  if (zoneSet.size === 0) {
    const alternativeDistricts = await getDistrictsInProvince(ctpvNm)
    return { covered: false, dongOptions: [], districtWide: false, alternativeDistricts }
  }

  // 구역이 단 하나뿐이면(동/읍/면 세분화가 없거나, "없음"/구 이름 자체이거나, 수거방식이 구 전체에
  // 하나뿐이거나) 사용자가 고를 필요가 없다 — 이유와 무관하게 옵션이 1개면 바로 넘어간다.
  return {
    covered: true,
    dongOptions: [...zoneSet].sort(),
    districtWide: zoneSet.size === 1,
    alternativeDistricts: [],
  }
}

export async function getRegionRule(ctpvNm: string, sggNm: string, dongNm: string) {
  const cached = await prisma.regionRule.findUnique({
    where: { ctpvNm_sggNm_dongNm: { ctpvNm, sggNm, dongNm } },
  })
  if (cached) {
    return cached
  }

  const allRows = await getRegionApiClient().fetchRowsBySgg(sggNm)
  const matchingRows = allRows.filter(
    (row) => row.CTPV_NM === ctpvNm && parseZoneTokens(row.MNG_ZONE_TRGT_RGN_NM).includes(dongNm),
  )

  if (matchingRows.length === 0) {
    throw new AppError('해당 지역의 배출 정보를 찾을 수 없습니다', 404)
  }

  const categories = {
    생활쓰레기: pickCategory(matchingRows, {
      dow: 'LF_WST_EMSN_DOW',
      method: 'LF_WST_EMSN_MTHD',
      begin: 'LF_WST_EMSN_BGNG_TM',
      end: 'LF_WST_EMSN_END_TM',
    }),
    음식물쓰레기: pickCategory(matchingRows, {
      dow: 'FOD_WST_EMSN_DOW',
      method: 'FOD_WST_EMSN_MTHD',
      begin: 'FOD_WST_EMSN_BGNG_TM',
      end: 'FOD_WST_EMSN_END_TM',
    }),
    재활용품: pickCategory(matchingRows, {
      dow: 'RCYCL_EMSN_DOW',
      method: 'RCYCL_EMSN_MTHD',
      begin: 'RCYCL_EMSN_BGNG_TM',
      end: 'RCYCL_EMSN_END_TM',
    }),
    대형폐기물: pickBulkWaste(matchingRows),
  }

  const unclltDay = matchingRows[0].UNCLLT_DAY || null

  return prisma.regionRule.upsert({
    where: { ctpvNm_sggNm_dongNm: { ctpvNm, sggNm, dongNm } },
    update: { categories: categories as unknown as Prisma.InputJsonValue, unclltDay },
    create: { ctpvNm, sggNm, dongNm, categories: categories as unknown as Prisma.InputJsonValue, unclltDay },
  })
}
