import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OnboardingProfile } from '@hub/shared'

const STORAGE_KEY = 'onboarding-profile'

const EMPTY_PROFILE: OnboardingProfile = {
  supportRealm: [],
  region: '',
  district: '',
  employees: '',
  revenue: '',
  businessYears: '',
}

export type OnboardingField = keyof OnboardingProfile

interface OnboardingContextValue {
  profile: OnboardingProfile
  setField: <K extends OnboardingField>(field: K, value: OnboardingProfile[K]) => void
  reset: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

function loadProfile(): OnboardingProfile {
  if (typeof window === 'undefined') return EMPTY_PROFILE
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PROFILE
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<OnboardingProfile>) }
  } catch {
    return EMPTY_PROFILE
  }
}

function persist(profile: OnboardingProfile) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    /* sessionStorage 사용 불가 시 무시 */
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<OnboardingProfile>(loadProfile)

  const setField = useCallback(
    <K extends OnboardingField>(field: K, value: OnboardingProfile[K]) => {
      setProfile((prev) => {
        const next = { ...prev, [field]: value }
        persist(next)
        return next
      })
    },
    [],
  )

  const reset = useCallback(() => {
    setProfile(EMPTY_PROFILE)
    persist(EMPTY_PROFILE)
  }, [])

  const value = useMemo(
    () => ({ profile, setField, reset }),
    [profile, setField, reset],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return ctx
}
