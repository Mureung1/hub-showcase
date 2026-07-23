import { useEffect, useState } from 'react'
import { getMe, getToken } from '../api/client.ts'

type CurrentUser = {
  id: string
  email: string
  name: string
  nickname: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  return { user, isLoading }
}
