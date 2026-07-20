import { createContext, useContext, useEffect, useState } from 'react'
import { EDUCATION_OPTIONS, MAJOR_OPTIONS } from '../constants/specOptions'

// #9(분석 id → GET 복원)의 localStorage 키와는 완전히 분리된 별도 키를 쓴다 — 기존 로직을 건드리지 않기 위해서다.
const STORAGE_KEY = 'specfit_app_state'

export const DEFAULT_FILTERS = { job_category: '', is_intern: '' }

export const DEFAULT_SPEC = {
  education: EDUCATION_OPTIONS[0],
  isExperienced: false,
  career_months: 0,
  major: MAJOR_OPTIONS[0],
  certificates: [],
  foreign_lang_test: '',
  foreign_lang_score: 0,
  has_computer_skill: false,
}

// filters/spec은 FilterPage/SpecPage가 그대로 그릴 수 있는 "폼 모양"으로 Context에 들어있다
// (is_intern은 tri-state 문자열, spec은 isExperienced 같은 폼 전용 파생 필드 포함).
// API 요청/응답 경계를 넘을 때만 아래 변환 함수로 폼 모양 ↔ API 모양을 오간다.

export function apiFiltersFromForm(filters) {
  return {
    ...(filters.job_category && { job_category: filters.job_category }),
    ...(filters.is_intern !== '' && { is_intern: filters.is_intern === 'true' }),
  }
}

export function formFiltersFromApi(apiFilters) {
  return {
    job_category: apiFilters?.job_category ?? '',
    is_intern:
      apiFilters?.is_intern === true ? 'true' : apiFilters?.is_intern === false ? 'false' : '',
  }
}

export function apiSpecFromForm(spec) {
  const { isExperienced: _isExperienced, ...rest } = spec
  return rest
}

export function formSpecFromApi(apiSpec) {
  return { ...DEFAULT_SPEC, ...apiSpec, isExperienced: (apiSpec?.career_months ?? 0) > 0 }
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // 저장된 값이 깨져있거나(수동 편집 등) localStorage 접근이 막힌 환경이면 기본값으로 시작한다.
    return null
  }
}

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  // loadPersisted()는 이 useState의 최초 렌더 1회만 실행되고, 아래 두 useState의 지연 초기화 함수가
  // 같은 값을 재사용한다 — 매 렌더마다 localStorage를 다시 읽지 않기 위해서다.
  const [persisted] = useState(loadPersisted)
  const [filters, setFiltersState] = useState(() => ({ ...DEFAULT_FILTERS, ...persisted?.filters }))
  const [spec, setSpecState] = useState(() => ({ ...DEFAULT_SPEC, ...persisted?.spec }))
  const [result, setResult] = useState(() => persisted?.result ?? null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, spec, result }))
  }, [filters, spec, result])

  function setFilters(patch) {
    setFiltersState((prev) => ({ ...prev, ...patch }))
  }

  function setSpec(patch) {
    setSpecState((prev) => ({ ...prev, ...patch }))
  }

  const value = { filters, spec, result, setFilters, setSpec, setResult }
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider')
  return ctx
}
