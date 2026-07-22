import { useState } from 'react'

export interface SelectedRegion {
  ctpvNm: string
  sggNm: string
  dongNm: string
}

// 로그인/사용자 계정이 아직 없어 지역 선택은 브라우저에만 저장 — 계정 도입 시 서버 저장으로 옮길 것.
const STORAGE_KEY = 'ecobot:selectedRegion'

function readStoredRegion(): SelectedRegion | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SelectedRegion
  } catch {
    return null
  }
}

export function useSelectedRegion() {
  const [region, setRegionState] = useState<SelectedRegion | null>(() => readStoredRegion())

  function setRegion(next: SelectedRegion) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setRegionState(next)
  }

  return { region, setRegion }
}
