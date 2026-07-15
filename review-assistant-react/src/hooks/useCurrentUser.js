import { useEffect, useState } from 'react'
import { getCurrentUser } from '../lib/api.js'
import { getToken } from '../lib/auth.js'

export function useCurrentUser() {
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      setChecked(true)
      return
    }
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecked(true))
  }, [])

  return { user, checked, setUser }
}
