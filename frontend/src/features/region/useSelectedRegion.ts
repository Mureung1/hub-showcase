import { useState } from 'react'
import type { Lang } from '../../i18n/LanguageContext'
import { isMergedJeonnamGwangju, resolveMergedProvinceDisplayName } from './mergedRegion'

export interface SelectedRegion {
  ctpvNm: string
  sggNm: string
  dongNm: string
  // 선택 시점에 함께 저장 — 지역 픽커를 다시 열지 않고도 홈/규정 화면 지역 표시줄에서 영어 모드를 보여줄 수 있다.
  ctpvNmEn?: string | null
  sggNmEn?: string | null
}

// 로그인/사용자 계정이 아직 없어 지역 선택은 브라우저에만 저장 — 계정 도입 시 서버 저장으로 옮길 것.
const STORAGE_KEY = 'confisort:selectedRegion'

function readStoredRegion(): SelectedRegion | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SelectedRegion
  } catch {
    return null
  }
}

// 영어 모드일 때 선택 시점에 저장해둔 ctpvNmEn/sggNmEn을 쓰고, 아직 없으면(과거에 선택해 저장된
// 지역이라 영어 이름이 없는 경우) 한국어 이름으로 자연스럽게 폴백한다.
export function formatSelectedRegionLabel(region: SelectedRegion, lang: Lang): string {
  const ctpv = isMergedJeonnamGwangju(region.ctpvNm)
    ? resolveMergedProvinceDisplayName(region.sggNm, lang)
    : lang === 'en' && region.ctpvNmEn
      ? region.ctpvNmEn
      : region.ctpvNm
  const sgg = lang === 'en' && region.sggNmEn ? region.sggNmEn : region.sggNm
  return region.dongNm ? `${ctpv} / ${sgg} / ${region.dongNm}` : `${ctpv} / ${sgg}`
}

export function useSelectedRegion() {
  const [region, setRegionState] = useState<SelectedRegion | null>(() => readStoredRegion())

  function setRegion(next: SelectedRegion) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setRegionState(next)
  }

  return { region, setRegion }
}
