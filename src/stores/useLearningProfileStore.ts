import { create } from 'zustand'
import type { LearningLevel, LearningProfile } from '../types/profile'

type LearningProfileState = {
  profile: LearningProfile | null
  saveProfile: (profile: LearningProfile) => void
  resetProfile: () => void
}

const storageKey = 'icu.learningProfile'

function readStoredProfile(): LearningProfile | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawProfile = window.localStorage.getItem(storageKey)

    if (!rawProfile) {
      return null
    }

    const parsed = JSON.parse(rawProfile) as Partial<LearningProfile>

    if (!parsed.displayName || !parsed.learningGoal) {
      return null
    }

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

export const useLearningProfileStore = create<LearningProfileState>((set) => ({
  profile: readStoredProfile(),
  saveProfile: (profile) => {
    window.localStorage.setItem(storageKey, JSON.stringify(profile))
    set({ profile })
  },
  resetProfile: () => {
    window.localStorage.removeItem(storageKey)
    set({ profile: null })
  },
}))
