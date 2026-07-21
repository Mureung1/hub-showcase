import { useEffect, useState } from 'react'
import * as dodoApi from './dodoApi'
import type { DodoState } from './types'

export function useDodoManager() {
  const [state, setState] = useState<DodoState | null>(null)

  const refreshDodoState = () => {
    dodoApi.fetchDodoState().then(setState).catch(() => {})
  }

  useEffect(() => {
    refreshDodoState()
  }, [])

  return { state, refreshDodoState }
}

export type DodoManager = ReturnType<typeof useDodoManager>
