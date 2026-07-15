import { useEffect, useState } from 'react'
import * as profileApi from './profileApi'
import type { Profile } from './types'

export function useProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    profileApi.fetchProfile()
      .then((loaded) => {
        if (!cancelled) setProfile(loaded)
      })
      .catch(() => {
        if (!cancelled) setNotice('프로필을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const updateProfile = async (patch: Parameters<typeof profileApi.updateProfile>[0]) => {
    try {
      const updated = await profileApi.updateProfile(patch)
      setProfile(updated)
      setNotice('프로필을 저장했어요.')
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '프로필을 저장하지 못했어요.')
      return false
    }
  }

  return { profile, loading, notice, updateProfile }
}

export type ProfileManager = ReturnType<typeof useProfileManager>
