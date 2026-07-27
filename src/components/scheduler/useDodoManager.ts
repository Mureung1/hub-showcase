import { useEffect, useState } from 'react'
import * as dodoApi from './dodoApi'
import type { DodoState, SelfDodoAppearance } from './types'

export function useDodoManager() {
  const [state, setState] = useState<DodoState | null>(null)
  const [appearance, setAppearance] = useState<SelfDodoAppearance | null>(null)

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

  const updateAppearance = async (patch: { bodyColor: string; eyeCount: 1 | 2 }) => {
    setAppearance(await dodoApi.updateDodoAppearance(patch))
  }

  return { state, refreshDodoState, appearance, refreshAppearance, equip, unequip, updateAppearance }
}

export type DodoManager = ReturnType<typeof useDodoManager>
