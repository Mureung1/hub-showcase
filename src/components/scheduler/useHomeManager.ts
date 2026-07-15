import { useEffect, useState } from 'react'
import * as homeApi from './homeApi'
import type { HomeVisitEntry } from './types'

export function useHomeManager() {
  const [visits, setVisits] = useState<HomeVisitEntry[]>([])
  const [visitsLoading, setVisitsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    homeApi.fetchHomeVisits()
      .then((loaded) => {
        if (!cancelled) setVisits(loaded)
      })
      .finally(() => {
        if (!cancelled) setVisitsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const markVisitsRead = async () => {
    if (visits.every((visit) => visit.read)) return
    setVisits((current) => current.map((visit) => ({ ...visit, read: true })))
    await homeApi.markHomeVisitsRead().catch(() => {})
  }

  return { visits, visitsLoading, markVisitsRead }
}

export type HomeManager = ReturnType<typeof useHomeManager>
