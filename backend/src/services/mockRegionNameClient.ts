import type { RegionNameClient, RegionNameTranslation } from '../types/regionName'

// Gemini API 키가 없을 때 대체할 mock — 실제 로마자 표기 대신 원문을 그대로 돌려준다.
async function translateNames(names: string[]): Promise<RegionNameTranslation[]> {
  return names.map((name) => ({ name, nameEn: name }))
}

export const mockRegionNameClient: RegionNameClient = { translateNames }
