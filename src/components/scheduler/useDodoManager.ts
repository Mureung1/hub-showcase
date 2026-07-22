import { useEffect, useState } from 'react'
import * as dodoApi from './dodoApi'
import type { DodoAppearance, DodoState } from './types'

export function useDodoManager() {
  const [state, setState] = useState<DodoState | null>(null)
  const [appearance, setAppearance] = useState<DodoAppearance | null>(null)

  const refreshDodoState = () => {
    dodoApi.fetchDodoState().then(setState).catch(() => {})
  }

  const refreshAppearance = () => {
    dodoApi.fetchDodoAppearance().then(setAppearance).catch(() => {})
  }

  useEffect(() => {
    refreshDodoState()
    refreshAppearance()
  }, [])

  const equip = async (inventoryId: string) => {
    setAppearance(await dodoApi.equipRoomItem(inventoryId))
  }

  const unequip = async (inventoryId: string) => {
    setAppearance(await dodoApi.unequipRoomItem(inventoryId))
  }

  return { state, refreshDodoState, appearance, refreshAppearance, equip, unequip }
}

export type DodoManager = ReturnType<typeof useDodoManager>
