import { create } from 'zustand'
import { shouldUseServerApi } from '../../../app/icuApiMode'
import {
  deleteProfile as deleteProfileApi,
  getProfile as getProfileApi,
  saveProfile as saveProfileApi,
} from '../api/profileClient'
import type { LearningLevel, LearningProfile } from './profileTypes'

export type LearningProfileStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

type LearningProfileState = {
  profile: LearningProfile | null
  status: LearningProfileStatus
  error: string | null
  loadProfile: (fetchImpl?: typeof fetch) => Promise<LearningProfile | null>
  saveProfile: (profile: LearningProfile, fetchImpl?: typeof fetch) => Promise<LearningProfile>
  resetProfile: (fetchImpl?: typeof fetch) => Promise<void>
}

const storageKey = 'icu.learningProfile'

function readStoredProfile(): LearningProfile | null {
  if (typeof window === 'undefined') return null

  try {
    const rawProfile = window.localStorage.getItem(storageKey)
    if (!rawProfile) return null

    const parsed = JSON.parse(rawProfile) as Partial<LearningProfile>
    if (!parsed.displayName || !parsed.learningGoal) return null

    return {
      displayName: parsed.displayName,
      learningGoal: parsed.learningGoal,
      preferredTracks: parsed.preferredTracks ?? ['React'],
      dailyStudyMinutes: parsed.dailyStudyMinutes ?? 30,
      level: (parsed.level ?? 'beginner') as LearningLevel,
    }
  } catch {
    return null
  }
}

const serverMode = shouldUseServerApi()

export const useLearningProfileStore = create<LearningProfileState>((set, get) => ({
  profile: serverMode ? null : readStoredProfile(),
  status: serverMode ? 'idle' : 'ready',
  error: null,
  loadProfile: async (fetchImpl = fetch) => {
    if (!serverMode) return get().profile

    set({ status: 'loading', error: null })
    try {
      const { profile } = await getProfileApi(fetchImpl)
      set({ profile, status: 'ready', error: null })
      return profile
    } catch (error) {
      set({ status: 'error', error: '프로필을 불러오지 못했습니다. 다시 시도해 주세요.' })
      throw error
    }
  },
  saveProfile: async (profile, fetchImpl = fetch) => {
    if (!serverMode) {
      window.localStorage.setItem(storageKey, JSON.stringify(profile))
      set({ profile, status: 'ready', error: null })
      return profile
    }

    set({ status: 'saving', error: null })
    try {
      const response = await saveProfileApi(profile, fetchImpl)
      set({ profile: response.profile, status: 'ready', error: null })
      return response.profile
    } catch (error) {
      set({ status: 'error', error: '프로필을 저장하지 못했습니다. 입력값을 유지했으니 다시 시도해 주세요.' })
      throw error
    }
  },
  resetProfile: async (fetchImpl = fetch) => {
    if (!serverMode) {
      window.localStorage.removeItem(storageKey)
      set({ profile: null, status: 'ready', error: null })
      return
    }

    set({ status: 'saving', error: null })
    try {
      await deleteProfileApi(fetchImpl)
      set({ profile: null, status: 'ready', error: null })
    } catch (error) {
      set({ status: 'error', error: '프로필을 초기화하지 못했습니다. 다시 시도해 주세요.' })
      throw error
    }
  },
}))
